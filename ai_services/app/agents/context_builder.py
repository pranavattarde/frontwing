import json
import hashlib
from typing import Dict, Any, List, Optional
from app.core.logger import logger

def is_empty_val(val: Any) -> bool:
    """Safely checks if a value is None, empty string, empty dict, empty list, or empty numpy array."""
    if val is None:
        return True
    if isinstance(val, (str, bytes)) and len(val) == 0:
        return True
    if isinstance(val, (list, tuple, dict)) and len(val) == 0:
        return True
    if hasattr(val, "size") and getattr(val, "size") == 0:
        return True
    return False


def clean_empty_fields(val: Any) -> Any:
    """Recursively removes None, empty strings, empty lists, and empty dicts from data structures."""
    if isinstance(val, dict):
        cleaned = {}
        for k, v in val.items():
            res = clean_empty_fields(v)
            if not is_empty_val(res):
                cleaned[k] = res
        return cleaned if cleaned else None
    elif isinstance(val, list):
        cleaned = []
        for item in val:
            res = clean_empty_fields(item)
            if not is_empty_val(res):
                cleaned.append(res)
        return cleaned if cleaned else None
    else:
        if is_empty_val(val):
            return None
        return val


def normalize_evidence_item(tool_name: str, payload: Any, question: str = "") -> Dict[str, Any]:
    """Normalizes any tool execution response into a unified schema format."""
    category_map = {
        "scoring_tool": "scoring",
        "simulation_tool": "strategy",
        "telemetry_tool": "telemetry",
        "explain_mode_tool": "definitions",
        "research_tool": "regulations",
        "knowledge_tool": "regulations",
        "investigation_tool": "incident",
        "race_results_tool": "historical_results",
        "driver_database_tool": "database",
        "constructor_database_tool": "database",
        "standings_tool": "historical_results",
        "historical_results_tool": "historical_results",
        "historical_data_tool": "historical_results"
    }
    
    category = category_map.get(tool_name, "general")
    cleaned_payload = clean_empty_fields(payload) or {}
    
    confidence = 0.95
    if isinstance(cleaned_payload, dict):
        confidence = float(cleaned_payload.get("confidence", 0.95))
        
    relevance = 0.90
    if question:
        q_lower = question.lower()
        if category in q_lower or tool_name.replace("_tool", "") in q_lower:
            relevance = 1.0
            
    summary_title = tool_name.replace("_", " ").title()
    if isinstance(cleaned_payload, dict):
        if "grand_prix" in cleaned_payload:
            summary_title = f"{cleaned_payload['grand_prix']} Classification"
        elif "term" in cleaned_payload:
            summary_title = f"Definition: {cleaned_payload['term']}"
        elif "driver" in cleaned_payload:
            summary_title = f"Telemetry: Driver {cleaned_payload['driver']}"
            
    return {
        "tool": tool_name,
        "category": category,
        "relevance": relevance,
        "confidence": confidence,
        "summary": summary_title,
        "data": cleaned_payload
    }


def deduplicate_items(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Removes duplicated evidence items with identical data payloads."""
    seen_hashes = set()
    deduped = []
    
    for item in items:
        try:
            serialized = json.dumps(item.get("data", {}), sort_keys=True)
            item_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
        except Exception:
            item_hash = str(item.get("tool"))
            
        if item_hash not in seen_hashes:
            seen_hashes.add(item_hash)
            deduped.append(item)
            
    return deduped


def rank_and_sort_evidence(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Sorts evidence items by composite score (relevance * confidence) descending."""
    return sorted(
        items,
        key=lambda x: (float(x.get("relevance", 0.9)) * float(x.get("confidence", 0.95))),
        reverse=True
    )


def build_structured_context(evidence: Dict[str, Any], question: str = "") -> Dict[str, Any]:
    """Collects outputs from every tool, normalizes, deduplicates, strips empty fields,

    and produces ONE unified structured context object.
    """
    raw_items = []
    
    for tool_name, payload in evidence.items():
        if payload is None:
            continue
        # Handle status missing_data gracefully
        if isinstance(payload, dict) and payload.get("status") in ["missing_data", "entity_not_found"]:
            continue
            
        normalized = normalize_evidence_item(tool_name, payload, question)
        if normalized["data"]:
            raw_items.append(normalized)
            
    deduped = deduplicate_items(raw_items)
    sorted_items = rank_and_sort_evidence(deduped)
    
    tools_executed = [item["tool"] for item in sorted_items]
    overall_confidence = (
        sum(item["confidence"] for item in sorted_items) / len(sorted_items)
        if sorted_items else 0.0
    )
    
    return {
        "summary_meta": {
            "tools_executed": tools_executed,
            "total_evidence_count": len(sorted_items),
            "overall_confidence": round(overall_confidence * 100, 1)
        },
        "context_items": sorted_items
    }


def context_builder_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """LangGraph node executing the Context Builder stage between tool execution and LLM synthesis."""
    evidence = state.get("evidence", {})
    question = state.get("question", "")
    trace = dict(state.get("intelligence_trace", {}))
    streaming_events = list(state.get("streaming_events", []))
    
    logger.info("[Context Builder Stage] Normalizing, deduplicating, and ranking evidence payload.")
    
    structured_context = build_structured_context(evidence, question)
    
    trace.setdefault("execution_graph", []).append("context_builder")
    streaming_events.append({
        "event": "context_builder",
        "timestamp": int(hash(question) % 1000000),
        "details": f"Context Builder produced single structured context object with {len(structured_context['context_items'])} items."
    })
    
    return {
        "structured_context": structured_context,
        "intelligence_trace": trace,
        "streaming_events": streaming_events
    }
