import os

# Caching prompt contents to minimize disk reads
_PROMPT_CACHE = {}

def load_prompt(name: str) -> str:
    """Loads prompt markdown template dynamically. Returns fallback if missing."""
    if name in _PROMPT_CACHE:
        return _PROMPT_CACHE[name]
        
    base_dir = os.path.dirname(os.path.abspath(__file__))
    filename = f"{name}.md"
    filepath = os.path.join(base_dir, filename)
    
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read().strip()
                _PROMPT_CACHE[name] = content
                return content
        except Exception:
            pass
            
    # Robust hardcoded fallback strings to protect application runtime against filesystem glitches
    fallbacks = {
        "planning": "Lead F1 Planner. Output strict JSON with required_engineers and execution_order.",
        "reflection": "Reflection Engineer. Verify telemetry loops and strategy delta consistency.",
        "judge": "Judge Engineer. Fact check outcomes completeness and errors.",
        "investigation": "Lead Investigation Engineer. Analyze composite performance scores.",
        "research": "F1 Research Engineer. Retrieve RAG document indexes.",
        "explain": "Explain Engineer. Generate beginner, intermediate, and expert summaries."
    }
    return fallbacks.get(name, "F1 AI Engineer assistant role instructions.")
