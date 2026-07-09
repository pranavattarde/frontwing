import os
import re
import time
import json
from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple

# Try importing LLM SDKs
try:
    from google import genai
    from google.genai import types
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False

try:
    from groq import Groq
    HAS_GROQ = True
except ImportError:
    HAS_GROQ = False

# =====================================================================
# Structured Exceptions
# =====================================================================

class LLMProviderError(Exception):
    """Base class for LLM Provider service failures."""
    pass

class LLMTimeoutError(LLMProviderError):
    """Timeout limit exceeded during LLM execution."""
    pass


# =====================================================================
# 1. Base LLM Provider
# =====================================================================

class BaseLLMProvider(ABC):
    """Abstract interface defining required F1 LLM planning dispatchers."""
    
    @abstractmethod
    def generate_plan(self, system_instruction: str, contents: str, timeout_seconds: float = 10.0) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """Generates structured execution plan and returns (plan_dict, observability_metrics)."""
        pass


# =====================================================================
# 2. Gemini Provider Implementation
# =====================================================================

class GeminiProvider(BaseLLMProvider):
    def generate_plan(self, system_instruction: str, contents: str, timeout_seconds: float = 10.0) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        if not HAS_GEMINI:
            raise LLMProviderError("Gemini SDK ('google-genai') is not installed.")
        key = os.getenv("GEMINI_API_KEY", "")
        if not key or not key.strip():
            raise LLMProviderError("GEMINI_API_KEY environment variable is empty.")
            
        start_time = time.time()
        try:
            client = genai.Client(api_key=key)
            # Timeout logic implemented via sdk or manual thread checks if needed. We'll simulate timeout if latency exceeds threshold.
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.0,
                    response_mime_type="application/json"
                )
            )
            raw_text = response.text.strip()
            if raw_text.startswith("```"):
                raw_text = re.sub(r"^```[a-zA-Z]*\n|```$", "", raw_text, flags=re.MULTILINE).strip()
                
            parsed = json.loads(raw_text)
            latency_ms = int((time.time() - start_time) * 1000)
            
            # Estimates for Gemini 2.5 Flash pricing
            prompt_toks = 250
            completion_toks = len(raw_text) // 4
            cost = (prompt_toks * 0.075 / 1_000_000) + (completion_toks * 0.30 / 1_000_000)
            
            metrics = {
                "llm_provider": "gemini",
                "llm_model": "gemini-2.5-flash",
                "llm_latency": latency_ms,
                "prompt_tokens": prompt_toks,
                "completion_tokens": completion_toks,
                "estimated_cost": cost,
                "retries": 0
            }
            return parsed, metrics
        except Exception as e:
            if "timeout" in str(e).lower() or (time.time() - start_time) >= timeout_seconds:
                raise LLMTimeoutError(f"Gemini provider timed out: {e}")
            raise LLMProviderError(f"Gemini execution failed: {e}")


# =====================================================================
# 3. Groq Provider Implementation
# =====================================================================

class GroqProvider(BaseLLMProvider):
    def generate_plan(self, system_instruction: str, contents: str, timeout_seconds: float = 10.0) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        if not HAS_GROQ:
            raise LLMProviderError("Groq SDK ('groq') is not installed.")
        key = os.getenv("GROQ_API_KEY", "")
        if not key or not key.strip():
            raise LLMProviderError("GROQ_API_KEY environment variable is empty.")
            
        start_time = time.time()
        try:
            client = Groq(api_key=key)
            chat_completion = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": contents}
                ],
                model="llama-3.1-70b-versatile",
                temperature=0.0,
                timeout=timeout_seconds
            )
            raw_text = chat_completion.choices[0].message.content.strip()
            if raw_text.startswith("```"):
                raw_text = re.sub(r"^```[a-zA-Z]*\n|```$", "", raw_text, flags=re.MULTILINE).strip()
                
            parsed = json.loads(raw_text)
            latency_ms = int((time.time() - start_time) * 1000)
            
            prompt_toks = chat_completion.usage.prompt_tokens if chat_completion.usage else 250
            completion_toks = chat_completion.usage.completion_tokens if chat_completion.usage else 100
            
            # Estimates for Llama 3.1 70b pricing
            cost = (prompt_toks * 0.59 / 1_000_000) + (completion_toks * 0.79 / 1_000_000)
            
            metrics = {
                "llm_provider": "groq",
                "llm_model": "llama-3.1-70b-versatile",
                "llm_latency": latency_ms,
                "prompt_tokens": prompt_toks,
                "completion_tokens": completion_toks,
                "estimated_cost": cost,
                "retries": 0
            }
            return parsed, metrics
        except Exception as e:
            if "timeout" in str(e).lower() or (time.time() - start_time) >= timeout_seconds:
                raise LLMTimeoutError(f"Groq provider timed out: {e}")
            raise LLMProviderError(f"Groq execution failed: {e}")


# =====================================================================
# 4. Reliable LLM Provider with failover & retries
# =====================================================================

class ReliableLLMProvider(BaseLLMProvider):
    """Composite provider wrapping retries, exponential backoffs, and failover chains."""
    
    def __init__(self):
        self.gemini = GeminiProvider()
        self.groq = GroqProvider()
        
    def generate_plan(self, system_instruction: str, contents: str, timeout_seconds: float = 10.0) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        retries = 0
        backoff = 0.5 # start backoff at 500ms
        
        # 1. Attempt Gemini (up to 2 retries)
        for attempt in range(3):
            try:
                plan, metrics = self.gemini.generate_plan(system_instruction, contents, timeout_seconds)
                metrics["retries"] = retries
                return plan, metrics
            except Exception as e:
                retries += 1
                if attempt == 2:
                    break
                time.sleep(backoff)
                backoff *= 2.0
                
        # 2. Attempt Groq Failover (up to 2 retries)
        backoff = 0.5
        for attempt in range(3):
            try:
                plan, metrics = self.groq.generate_plan(system_instruction, contents, timeout_seconds)
                metrics["retries"] = retries
                return plan, metrics
            except Exception as e:
                retries += 1
                if attempt == 2:
                    break
                time.sleep(backoff)
                backoff *= 2.0
                
        raise LLMProviderError("All LLM providers (Gemini & Groq) failed after retries and failovers.")


# Global instance
reliable_llm_provider = ReliableLLMProvider()
