import os
import re
import time
import json
import hashlib
from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple, Optional
from app.core.logger import logger
from app.core.config import settings

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

# LangSmith LLM span tracing support
try:
    from langsmith import traceable
    from langsmith.run_helpers import get_current_run_tree
    HAS_LANGSMITH = True
except ImportError:
    HAS_LANGSMITH = False
    def traceable(*args, **kwargs):
        def decorator(f):
            return f
        return decorator
    def get_current_run_tree():
        return None


def _format_gemini_inputs(inputs: Dict[str, Any]) -> Dict[str, Any]:
    sys_inst = inputs.get("system_instruction") or ""
    contents = inputs.get("contents") or ""
    messages = []
    if sys_inst:
        messages.append({"role": "system", "content": str(sys_inst)})
    if contents:
        messages.append({"role": "user", "content": str(contents)})
    return {
        "messages": messages,
        "model": os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    }


def _format_groq_inputs(inputs: Dict[str, Any]) -> Dict[str, Any]:
    sys_inst = inputs.get("system_instruction") or ""
    contents = inputs.get("contents") or ""
    messages = []
    if sys_inst:
        messages.append({"role": "system", "content": str(sys_inst)})
    if contents:
        messages.append({"role": "user", "content": str(contents)})
    return {
        "messages": messages,
        "model": os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    }


def _format_llm_outputs(outputs: Any) -> Dict[str, Any]:
    if isinstance(outputs, tuple) and len(outputs) == 2:
        raw_or_parsed, metrics = outputs
        text_str = json.dumps(raw_or_parsed) if isinstance(raw_or_parsed, dict) else str(raw_or_parsed)
        p_toks = metrics.get("prompt_tokens", 250) if isinstance(metrics, dict) else 250
        c_toks = metrics.get("completion_tokens", 100) if isinstance(metrics, dict) else 100
        provider_name = metrics.get("llm_provider", "unknown") if isinstance(metrics, dict) else "unknown"
        model_name = metrics.get("llm_model", "unknown") if isinstance(metrics, dict) else "unknown"
        est_cost = metrics.get("estimated_cost", 0.0) if isinstance(metrics, dict) else 0.0
        return {
            "generations": [{"text": text_str}],
            "llm_output": {
                "model_name": model_name,
                "provider": provider_name,
                "token_usage": {
                    "prompt_tokens": p_toks,
                    "completion_tokens": c_toks,
                    "total_tokens": p_toks + c_toks
                },
                "estimated_cost": est_cost
            }
        }
    return {"generations": [{"text": str(outputs)}]}

def _get_llm_cache(cache_key: str) -> Optional[Any]:
    if not settings.LLM_CACHE_ENABLED:
        return None
    try:
        from app.core.db import redis_client
        if redis_client:
            raw = redis_client.get(cache_key)
            if raw:
                return json.loads(raw)
    except Exception as e:
        logger.debug(f"[LLMCache] Redis get failed: {e}")
    return None

def _set_llm_cache(cache_key: str, data: Any, ttl: int = 3600):
    if not settings.LLM_CACHE_ENABLED:
        return
    try:
        from app.core.db import redis_client
        if redis_client:
            redis_client.set(cache_key, json.dumps(data), ex=ttl)
    except Exception as e:
        logger.debug(f"[LLMCache] Redis set failed: {e}")

# =====================================================================
# Structured Exceptions
# =====================================================================

class LLMProviderError(Exception):
    """Base class for LLM Provider service failures."""
    pass

class LLMTimeoutError(LLMProviderError):
    """Timeout limit exceeded during LLM execution."""
    pass


def log_provider_failure(provider: str, model: str, e: Exception):
    """Logs provider failures with HTTP Status, Exception, and Raw response body (when available)."""
    status_code = "Unknown"
    response_body = "N/A"
    
    # Try extracting HTTP status code and body from genai / groq errors
    if hasattr(e, "status_code"):
        status_code = str(e.status_code)
    elif hasattr(e, "code"):
        status_code = str(e.code)
        
    if hasattr(e, "body"):
        response_body = str(e.body)
    elif hasattr(e, "response") and hasattr(e.response, "text"):
        response_body = str(e.response.text)
        
    logger.error(
        f"[LLM PROVIDER FAILURE] Provider: {provider} | Model: {model} | "
        f"HTTP Status: {status_code} | Exception: {str(e)} | Raw Response Body: {response_body}"
    )


def is_fatal_error(e: Exception) -> bool:
    """Returns True if the exception represents a non-retryable configuration, auth, rate limit or server/timeout error that should trigger immediate provider failover."""
    err_str = str(e).lower()
    # Check for invalid API key or authentication errors (e.g., HTTP 401)
    if "api key not valid" in err_str or "invalid api key" in err_str or "api_key_invalid" in err_str or "401" in err_str:
        return True
    # Check for model decommissioned, not found, or HTTP 404/400 decommissioned
    if "model_decommissioned" in err_str or "decommissioned" in err_str or "no longer available" in err_str:
        return True
    if "not_found" in err_str or "model not found" in err_str or "404" in err_str:
        return True
    # Check for rate limits / quota exceeded
    if "429" in err_str or "resource_exhausted" in err_str or "rate_limit_exceeded" in err_str or "quota_limit" in err_str or "quota limit" in err_str:
        return True
    # Check for gateway timeout, deadline exceeded, 504, 503, connection errors to failover immediately
    if "504" in err_str or "503" in err_str or "502" in err_str or "deadline_exceeded" in err_str or "deadline expired" in err_str or "timeout" in err_str:
        return True
    return False


# =====================================================================
# 1. Base LLM Provider
# =====================================================================

class BaseLLMProvider(ABC):
    """Abstract interface defining required F1 LLM planning dispatchers."""
    
    @abstractmethod
    def generate_plan(self, system_instruction: str, contents: str, timeout_seconds: float = 10.0) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """Generates structured execution plan and returns (plan_dict, observability_metrics)."""
        pass

    @abstractmethod
    def generate_response(self, system_instruction: str, contents: str, response_mime_type: str = "text/plain", timeout_seconds: float = 10.0) -> Tuple[str, Dict[str, Any]]:
        """Generates a text/JSON response and returns (response_text, observability_metrics)."""
        pass


# =====================================================================
# 2. Gemini Provider Implementation
# =====================================================================

class GeminiProvider(BaseLLMProvider):
    @traceable(
        run_type="llm",
        name="Gemini_generate_plan",
        process_inputs=_format_gemini_inputs,
        process_outputs=_format_llm_outputs,
        metadata={"ls_provider": "google_genai"}
    )
    def generate_plan(self, system_instruction: str, contents: str, timeout_seconds: float = 30.0) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        if not HAS_GEMINI:
            raise LLMProviderError("Gemini SDK ('google-genai') is not installed.")
        key = os.getenv("GEMINI_API_KEY", "")
        if not key or not key.strip():
            raise LLMProviderError("GEMINI_API_KEY environment variable is empty.")
            
        start_time = time.time()
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        try:
            client = genai.Client(api_key=key)
            response = client.models.generate_content(
                model=model_name,
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
            
            prompt_toks = 250
            completion_toks = len(raw_text) // 4
            cost = (prompt_toks * 0.075 / 1_000_000) + (completion_toks * 0.30 / 1_000_000)
            
            metrics = {
                "llm_provider": "gemini",
                "llm_model": model_name,
                "llm_latency": latency_ms,
                "prompt_tokens": prompt_toks,
                "completion_tokens": completion_toks,
                "estimated_cost": cost,
                "retries": 0
            }
            return parsed, metrics
        except Exception as e:
            log_provider_failure("Gemini", model_name, e)
            if "timeout" in str(e).lower() or (time.time() - start_time) >= timeout_seconds:
                raise LLMTimeoutError(f"Gemini provider timed out: {e}")
            raise LLMProviderError(f"Gemini execution failed: {e}")

    @traceable(
        run_type="llm",
        name="Gemini_generate_response",
        process_inputs=_format_gemini_inputs,
        process_outputs=_format_llm_outputs,
        metadata={"ls_provider": "google_genai"}
    )
    def generate_response(self, system_instruction: str, contents: str, response_mime_type: str = "text/plain", timeout_seconds: float = 30.0) -> Tuple[str, Dict[str, Any]]:
        if not HAS_GEMINI:
            raise LLMProviderError("Gemini SDK ('google-genai') is not installed.")
        key = os.getenv("GEMINI_API_KEY", "")
        if not key or not key.strip():
            raise LLMProviderError("GEMINI_API_KEY environment variable is empty.")
            
        start_time = time.time()
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        try:
            client = genai.Client(api_key=key)
            response = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.0,
                    response_mime_type=response_mime_type
                )
            )
            raw_text = response.text.strip()
            latency_ms = int((time.time() - start_time) * 1000)
            
            prompt_toks = 250
            completion_toks = len(raw_text) // 4
            cost = (prompt_toks * 0.075 / 1_000_000) + (completion_toks * 0.30 / 1_000_000)
            
            metrics = {
                "llm_provider": "gemini",
                "llm_model": model_name,
                "llm_latency": latency_ms,
                "prompt_tokens": prompt_toks,
                "completion_tokens": completion_toks,
                "estimated_cost": cost,
                "retries": 0
            }
            return raw_text, metrics
        except Exception as e:
            log_provider_failure("Gemini", model_name, e)
            if "timeout" in str(e).lower() or (time.time() - start_time) >= timeout_seconds:
                raise LLMTimeoutError(f"Gemini provider timed out: {e}")
            raise LLMProviderError(f"Gemini execution failed: {e}")


# =====================================================================
# 3. Groq Provider Implementation
# =====================================================================

class GroqProvider(BaseLLMProvider):
    @traceable(
        run_type="llm",
        name="Groq_generate_plan",
        process_inputs=_format_groq_inputs,
        process_outputs=_format_llm_outputs,
        metadata={"ls_provider": "groq"}
    )
    def generate_plan(self, system_instruction: str, contents: str, timeout_seconds: float = 30.0) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        if not HAS_GROQ:
            raise LLMProviderError("Groq SDK ('groq') is not installed.")
        key = os.getenv("GROQ_API_KEY", "")
        if not key or not key.strip():
            raise LLMProviderError("GROQ_API_KEY environment variable is empty.")
            
        groq_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
        start_time = time.time()
        try:
            client = Groq(api_key=key)
            try:
                chat_completion = client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": contents}
                    ],
                    model=groq_model,
                    response_format={"type": "json_object"},
                    temperature=0.0,
                    max_tokens=1024,
                    timeout=timeout_seconds
                )
            except Exception as e_json:
                if "json_validate_failed" in str(e_json) or "400" in str(e_json):
                    logger.warning(f"[GroqProvider] json_object mode failed ({e_json}), retrying with unconstrained format...")
                    chat_completion = client.chat.completions.create(
                        messages=[
                            {"role": "system", "content": system_instruction + "\nYou MUST return a valid JSON object only."},
                            {"role": "user", "content": contents}
                        ],
                        model=groq_model,
                        temperature=0.0,
                        max_tokens=1024,
                        timeout=timeout_seconds
                    )
                else:
                    raise e_json

            raw_text = chat_completion.choices[0].message.content.strip()
            if "<think>" in raw_text and "</think>" in raw_text:
                raw_text = re.sub(r"<think>.*?</think>", "", raw_text, flags=re.DOTALL).strip()
            json_match = re.search(r"(\{[\s\S]*\})", raw_text)
            if json_match:
                raw_text = json_match.group(1).strip()
            elif raw_text.startswith("```"):
                raw_text = re.sub(r"^```[a-zA-Z]*\n|```$", "", raw_text, flags=re.MULTILINE).strip()
                
            parsed = json.loads(raw_text)
            latency_ms = int((time.time() - start_time) * 1000)
            
            prompt_toks = chat_completion.usage.prompt_tokens if chat_completion.usage else 250
            completion_toks = chat_completion.usage.completion_tokens if chat_completion.usage else 100
            
            # Estimates for Groq pricing
            cost = (prompt_toks * 0.59 / 1_000_000) + (completion_toks * 0.79 / 1_000_000)
            
            metrics = {
                "llm_provider": "groq",
                "llm_model": groq_model,
                "llm_latency": latency_ms,
                "prompt_tokens": prompt_toks,
                "completion_tokens": completion_toks,
                "estimated_cost": cost,
                "retries": 0
            }
            return parsed, metrics
        except Exception as e:
            log_provider_failure("Groq", groq_model, e)
            if "timeout" in str(e).lower() or (time.time() - start_time) >= timeout_seconds:
                raise LLMTimeoutError(f"Groq provider timed out: {e}")
            raise LLMProviderError(f"Groq execution failed: {e}")

    @traceable(
        run_type="llm",
        name="Groq_generate_response",
        process_inputs=_format_groq_inputs,
        process_outputs=_format_llm_outputs,
        metadata={"ls_provider": "groq"}
    )
    def generate_response(self, system_instruction: str, contents: str, response_mime_type: str = "text/plain", timeout_seconds: float = 30.0) -> Tuple[str, Dict[str, Any]]:
        if not HAS_GROQ:
            raise LLMProviderError("Groq SDK ('groq') is not installed.")
        key = os.getenv("GROQ_API_KEY", "")
        if not key or not key.strip():
            raise LLMProviderError("GROQ_API_KEY environment variable is empty.")
            
        groq_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
        start_time = time.time()
        try:
            client = Groq(api_key=key)
            kwargs = {
                "messages": [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": contents}
                ],
                "model": groq_model,
                "temperature": 0.0,
                "max_tokens": 1024,
                "timeout": timeout_seconds
            }
            if response_mime_type == "application/json":
                if "json" not in system_instruction.lower() and "json" not in contents.lower():
                    kwargs["messages"][0]["content"] = system_instruction + "\nYou MUST return a valid JSON object only."
                kwargs["response_format"] = {"type": "json_object"}
            
            try:
                chat_completion = client.chat.completions.create(**kwargs)
            except Exception as e_json:
                if response_mime_type == "application/json" and ("json_validate_failed" in str(e_json) or "400" in str(e_json)):
                    logger.warning(f"[GroqProvider] json_object mode failed ({e_json}), retrying without response_format constraint...")
                    kwargs.pop("response_format", None)
                    chat_completion = client.chat.completions.create(**kwargs)
                else:
                    raise e_json

            raw_text = chat_completion.choices[0].message.content.strip()
            # If reasoning model returned <think> tags, strip them out cleanly
            if "<think>" in raw_text and "</think>" in raw_text:
                raw_text = re.sub(r"<think>.*?</think>", "", raw_text, flags=re.DOTALL).strip()
            elif raw_text.startswith("```"):
                raw_text = re.sub(r"^```[a-zA-Z]*\n|```$", "", raw_text, flags=re.MULTILINE).strip()

            latency_ms = int((time.time() - start_time) * 1000)
            
            prompt_toks = chat_completion.usage.prompt_tokens if chat_completion.usage else 250
            completion_toks = chat_completion.usage.completion_tokens if chat_completion.usage else 100
            cost = (prompt_toks * 0.59 / 1_000_000) + (completion_toks * 0.79 / 1_000_000)
            
            metrics = {
                "llm_provider": "groq",
                "llm_model": groq_model,
                "llm_latency": latency_ms,
                "prompt_tokens": prompt_toks,
                "completion_tokens": completion_toks,
                "estimated_cost": cost,
                "retries": 0
            }
            return raw_text, metrics
        except Exception as e:
            log_provider_failure("Groq", groq_model, e)
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
        
    def generate_plan(self, system_instruction: str, contents: str, timeout_seconds: float = 30.0) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        if os.getenv("DISABLE_LLM_PROVIDER") == "1":
            raise LLMProviderError("LLM Provider disabled via DISABLE_LLM_PROVIDER=1")
            
        retries = 0
        backoff = 0.5 # start backoff at 500ms
        errors_logged = []
        
        from datetime import datetime, timezone
        call_start_utc = datetime.now(timezone.utc).isoformat()
        logger.info(f"[PLANNER_LLM_CALL_START] UTC: {call_start_utc} | Initiating live planning engine dispatch.")
        
        # 0. Check Redis cache if enabled
        cache_key = f"cache:llm:plan:{hashlib.sha256((system_instruction + '||' + contents).encode('utf-8')).hexdigest()}"
        cached = _get_llm_cache(cache_key)
        if cached and isinstance(cached, dict) and "plan" in cached:
            logger.info(f"[PLANNER_LLM_CACHE_HIT] UTC: {call_start_utc} | Key: {cache_key[:35]}...")
            plan_res = cached["plan"]
            met_res = cached.get("metrics", {})
            met_res["cached"] = True
            met_res["llm_latency"] = 1
            return plan_res, met_res
        
        # 1. Attempt Gemini (up to 2 retries)
        gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        for attempt in range(3):
            start_time = time.time()
            attempt_utc = datetime.now(timezone.utc).isoformat()
            try:
                logger.info(f"[PLANNER_LLM_ATTEMPT] UTC: {attempt_utc} | Provider: Gemini | Model: {gemini_model} | Attempt: {attempt + 1}/3")
                plan, metrics = self.gemini.generate_plan(system_instruction, contents, timeout_seconds)
                end_time = time.time()
                latency_ms = int((end_time - start_time) * 1000)
                call_end_utc = datetime.now(timezone.utc).isoformat()
                logger.info(
                    f"[PLANNER_LLM_CALL_END] UTC: {call_end_utc} | Provider: Gemini | Model: {gemini_model} | "
                    f"Latency: {latency_ms}ms | Status: SUCCESS | Plan: {plan}"
                )
                metrics["retries"] = retries
                _set_llm_cache(cache_key, {"plan": plan, "metrics": metrics})
                return plan, metrics
            except Exception as e:
                end_time = time.time()
                latency_ms = int((end_time - start_time) * 1000)
                err_msg = f"Gemini Attempt {attempt + 1} failed (Latency: {latency_ms}ms). Exception: {e}"
                logger.warning(f"[PLANNER_LLM_ATTEMPT_FAILED] {err_msg}")
                errors_logged.append(err_msg)
                
                # Check for fatal error to trigger immediate failover
                if is_fatal_error(e):
                    logger.warning("[PLANNER_LLM_FAILOVER_TRIGGERED] Non-retryable Gemini error detected (fatal/429/quota). Failover immediately without retrying.")
                    retries += 1
                    break
                    
                retries += 1
                if attempt == 2:
                    logger.warning(f"[ReliableLLMProvider] Gemini failed all 3 attempts. Triggering failover to Groq.")
                    break
                logger.info(f"[ReliableLLMProvider] Retry reason: Gemini exception. Waiting {backoff}s before retry...")
                time.sleep(backoff)
                backoff *= 2.0
                
        # 2. Attempt Groq Failover (up to 2 retries)
        backoff = 0.5
        groq_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
        logger.info("[ReliableLLMProvider] Initiating Groq failover planning call.")
        for attempt in range(3):
            start_time = time.time()
            try:
                logger.info(f"[ReliableLLMProvider] Selected provider: Groq, Model: {groq_model}, Attempt: {attempt + 1}/3, Start: {start_time}")
                plan, metrics = self.groq.generate_plan(system_instruction, contents, timeout_seconds)
                end_time = time.time()
                latency_ms = int((end_time - start_time) * 1000)
                call_end_utc = datetime.now(timezone.utc).isoformat()
                logger.info(
                    f"[PLANNER_LLM_CALL_END] UTC: {call_end_utc} | Provider: Groq | Model: {groq_model} | "
                    f"Latency: {latency_ms}ms | Status: SUCCESS | Plan: {plan}"
                )
                metrics["retries"] = retries
                _set_llm_cache(cache_key, {"plan": plan, "metrics": metrics})
                return plan, metrics
            except Exception as e:
                end_time = time.time()
                latency_ms = int((end_time - start_time) * 1000)
                err_msg = f"Groq Attempt {attempt + 1} failed (Latency: {latency_ms}ms). Exception: {e}"
                logger.warning(f"[PLANNER_LLM_ATTEMPT_FAILED] {err_msg}")
                errors_logged.append(err_msg)
                
                # Check for fatal error to trigger immediate failover
                if is_fatal_error(e):
                    logger.warning("[ReliableLLMProvider] Non-retryable Groq error detected (fatal/429/quota). Break retry loop immediately.")
                    retries += 1
                    break
                    
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

    def generate_response(self, system_instruction: str, contents: str, response_mime_type: str = "text/plain", timeout_seconds: float = 30.0) -> Tuple[str, Dict[str, Any]]:
        if os.getenv("DISABLE_LLM_PROVIDER") == "1":
            raise LLMProviderError("LLM Provider disabled via DISABLE_LLM_PROVIDER=1")

        # General non-planning response generator
        retries = 0
        backoff = 0.5
        errors_logged = []
        
        from datetime import datetime, timezone
        call_start_utc = datetime.now(timezone.utc).isoformat()
        logger.info(f"[SYNTHESIS_LLM_CALL_START] UTC: {call_start_utc} | Initiating live response synthesis.")
        
        # 0. Check Redis cache if enabled
        cache_key = f"cache:llm:resp:{hashlib.sha256((system_instruction + '||' + contents + '||' + response_mime_type).encode('utf-8')).hexdigest()}"
        cached = _get_llm_cache(cache_key)
        if cached and isinstance(cached, dict) and "text" in cached:
            logger.info(f"[SYNTHESIS_LLM_CACHE_HIT] UTC: {call_start_utc} | Key: {cache_key[:35]}...")
            text_res = cached["text"]
            met_res = cached.get("metrics", {})
            met_res["cached"] = True
            met_res["llm_latency"] = 1
            return text_res, met_res
        
        gemini_model = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
        for attempt in range(3):
            start_time = time.time()
            attempt_utc = datetime.now(timezone.utc).isoformat()
            try:
                logger.info(f"[SYNTHESIS_LLM_ATTEMPT] UTC: {attempt_utc} | Provider: Gemini | Model: {gemini_model} | Attempt: {attempt + 1}/3")
                text, metrics = self.gemini.generate_response(system_instruction, contents, response_mime_type, timeout_seconds)
                end_time = time.time()
                latency_ms = int((end_time - start_time) * 1000)
                call_end_utc = datetime.now(timezone.utc).isoformat()
                logger.info(
                    f"[SYNTHESIS_LLM_CALL_END] UTC: {call_end_utc} | Provider: Gemini | Model: {gemini_model} | "
                    f"Latency: {latency_ms}ms | Status: SUCCESS | Output Preview: {text[:120]}..."
                )
                metrics["retries"] = retries
                _set_llm_cache(cache_key, {"text": text, "metrics": metrics})
                return text, metrics
            except Exception as e:
                end_time = time.time()
                latency_ms = int((end_time - start_time) * 1000)
                err_msg = f"Gemini response Attempt {attempt + 1} failed (Latency: {latency_ms}ms). Exception: {e}"
                logger.warning(f"[SYNTHESIS_LLM_ATTEMPT_FAILED] {err_msg}")
                errors_logged.append(err_msg)
                if is_fatal_error(e):
                    logger.warning("[SYNTHESIS_LLM_FAILOVER_TRIGGERED] Non-retryable Gemini error. Failover immediately to Groq.")
                    retries += 1
                    break
                retries += 1
                if attempt == 2:
                    break
                time.sleep(backoff)
                backoff *= 2.0
                
        backoff = 0.5
        groq_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
        for attempt in range(3):
            start_time = time.time()
            attempt_utc = datetime.now(timezone.utc).isoformat()
            try:
                logger.info(f"[SYNTHESIS_LLM_ATTEMPT] UTC: {attempt_utc} | Provider: Groq | Model: {groq_model} | Attempt: {attempt + 1}/3")
                text, metrics = self.groq.generate_response(system_instruction, contents, response_mime_type, timeout_seconds)
                end_time = time.time()
                latency_ms = int((end_time - start_time) * 1000)
                call_end_utc = datetime.now(timezone.utc).isoformat()
                logger.info(
                    f"[SYNTHESIS_LLM_CALL_END] UTC: {call_end_utc} | Provider: Groq | Model: {groq_model} | "
                    f"Latency: {latency_ms}ms | Status: SUCCESS | Output Preview: {text[:120]}..."
                )
                metrics["retries"] = retries
                _set_llm_cache(cache_key, {"text": text, "metrics": metrics})
                return text, metrics
            except Exception as e:
                end_time = time.time()
                latency_ms = int((end_time - start_time) * 1000)
                err_msg = f"Groq response Attempt {attempt + 1} failed (Latency: {latency_ms}ms). Exception: {e}"
                logger.warning(f"[SYNTHESIS_LLM_ATTEMPT_FAILED] {err_msg}")
                errors_logged.append(err_msg)
                if is_fatal_error(e):
                    retries += 1
                    break
                retries += 1
                if attempt == 2:
                    break
                time.sleep(backoff)
                backoff *= 2.0
                
        fatal_error_msg = (
            f"All LLM providers (Gemini & Groq) failed to generate response. Details:\n" + "\n".join(errors_logged)
        )
        logger.error(f"[ReliableLLMProvider] {fatal_error_msg}")
        raise LLMProviderError(fatal_error_msg)


# Global instance
reliable_llm_provider = ReliableLLMProvider()
