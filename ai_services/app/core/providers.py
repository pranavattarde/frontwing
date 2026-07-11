import os
import re
import time
import json
from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple
from app.core.logger import logger

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
        errors_logged = []
        
        # 1. Attempt Gemini (up to 2 retries)
        logger.info("[ReliableLLMProvider] Initiating Gemini planning call.")
        for attempt in range(3):
            start_time = time.time()
            try:
                logger.info(f"[ReliableLLMProvider] Selected provider: Gemini, Model: gemini-2.5-flash, Attempt: {attempt + 1}/3, Start: {start_time}")
                plan, metrics = self.gemini.generate_plan(system_instruction, contents, timeout_seconds)
                end_time = time.time()
                latency_ms = int((end_time - start_time) * 1000)
                logger.info(
                    f"[ReliableLLMProvider] Gemini call SUCCEEDED. End: {end_time}, Latency: {latency_ms}ms, "
                    f"Response parsing: SUCCESS. Result: {plan}"
                )
                metrics["retries"] = retries
                return plan, metrics
            except Exception as e:
                end_time = time.time()
                latency_ms = int((end_time - start_time) * 1000)
                err_msg = f"Gemini Attempt {attempt + 1} failed (Latency: {latency_ms}ms). Exception: {e}"
                logger.warning(f"[ReliableLLMProvider] {err_msg}")
                errors_logged.append(err_msg)
                retries += 1
                if attempt == 2:
                    logger.warning(f"[ReliableLLMProvider] Gemini failed all 3 attempts. Triggering failover to Groq.")
                    break
                logger.info(f"[ReliableLLMProvider] Retry reason: Gemini exception. Waiting {backoff}s before retry...")
                time.sleep(backoff)
                backoff *= 2.0
                
        # 2. Attempt Groq Failover (up to 2 retries)
        backoff = 0.5
        logger.info("[ReliableLLMProvider] Initiating Groq failover planning call.")
        for attempt in range(3):
            start_time = time.time()
            try:
                logger.info(f"[ReliableLLMProvider] Selected provider: Groq, Model: llama-3.1-70b-versatile, Attempt: {attempt + 1}/3, Start: {start_time}")
                plan, metrics = self.groq.generate_plan(system_instruction, contents, timeout_seconds)
                end_time = time.time()
                latency_ms = int((end_time - start_time) * 1000)
                logger.info(
                    f"[ReliableLLMProvider] Groq call SUCCEEDED. End: {end_time}, Latency: {latency_ms}ms, "
                    f"Response parsing: SUCCESS. Result: {plan}"
                )
                metrics["retries"] = retries
                return plan, metrics
            except Exception as e:
                end_time = time.time()
                latency_ms = int((end_time - start_time) * 1000)
                err_msg = f"Groq Attempt {attempt + 1} failed (Latency: {latency_ms}ms). Exception: {e}"
                logger.warning(f"[ReliableLLMProvider] {err_msg}")
                errors_logged.append(err_msg)
                retries += 1
                if attempt == 2:
                    break
                logger.info(f"[ReliableLLMProvider] Retry reason: Groq exception. Waiting {backoff}s before retry...")
                time.sleep(backoff)
                backoff *= 2.0
                
        # If both fail, log a complete list of exceptions before throwing
        fatal_error_msg = (
            f"All LLM providers (Gemini & Groq) failed after retries and failovers. "
            f"Accumulated failures details:\n" + "\n".join(errors_logged)
        )
        logger.error(f"[ReliableLLMProvider] {fatal_error_msg}")
        raise LLMProviderError(fatal_error_msg)


# Global instance
reliable_llm_provider = ReliableLLMProvider()
