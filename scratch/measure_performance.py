import sys
import os
import time
import json
import redis

# Ensure ai_services is in sys.path
sys.path.insert(0, os.path.abspath("ai_services"))

from app.core.providers import reliable_llm_provider
from app.core.entity_resolver import EntityResolver
from app.tools.registry import tool_registry
from app.agents.planner import run_ai_race_engineer

# Queries to evaluate
BENCHMARK_QUERIES = [
    {
        "type": "Race Result",
        "question": "Who won the 2024 Dutch Grand Prix and what was the podium?"
    },
    {
        "type": "Telemetry Comparison",
        "question": "Compare Verstappen and Norris at 2024 Dutch GP"
    },
    {
        "type": "Driver Scoring",
        "question": "Score Verstappen's driving performance at 2024 Dutch GP"
    },
    {
        "type": "What-If Simulation",
        "question": "What if Verstappen pitted on lap 20 at the 2024 Dutch GP?"
    },
    {
        "type": "Strategy Analysis",
        "question": "Analyze the pit stop strategy for Norris in the 2024 Dutch GP"
    }
]

def run_benchmarks(label="BASELINE"):
    r = redis.from_url("redis://localhost:6379/0")
    
    results = []
    
    print(f"\n================================================================================")
    print(f"STARTING BENCHMARK SUITE: {label}")
    print(f"================================================================================\n")
    
    for idx, item in enumerate(BENCHMARK_QUERIES, 1):
        q_type = item["type"]
        q_text = item["question"]
        
        # 1. Flush Redis to guarantee fresh cold cache
        r.flushdb()
        
        timings = {
            "planning_llm_ms": 0.0,
            "entity_resolution_ms": 0.0,
            "tools_ms": {},
            "synthesis_llm_ms": 0.0,
            "total_ms": 0.0
        }
        
        # Original references
        orig_generate_plan = reliable_llm_provider.generate_plan
        orig_resolve = EntityResolver.resolve
        orig_generate_response = reliable_llm_provider.generate_response
        
        # Instrument Planning LLM
        def timed_generate_plan(*args, **kwargs):
            t0 = time.perf_counter()
            res = orig_generate_plan(*args, **kwargs)
            timings["planning_llm_ms"] += (time.perf_counter() - t0) * 1000.0
            return res
            
        # Instrument Entity Resolution
        def timed_resolve(*args, **kwargs):
            t0 = time.perf_counter()
            res = orig_resolve(*args, **kwargs)
            timings["entity_resolution_ms"] += (time.perf_counter() - t0) * 1000.0
            return res
            
        # Instrument Synthesis LLM
        def timed_generate_response(*args, **kwargs):
            t0 = time.perf_counter()
            res = orig_generate_response(*args, **kwargs)
            timings["synthesis_llm_ms"] += (time.perf_counter() - t0) * 1000.0
            return res
            
        # Instrument all registered tools
        orig_tool_executes = {}
        for t_name, tool_obj in tool_registry._tools.items():
            orig_tool_executes[t_name] = tool_obj.execute
            def make_timed_tool_execute(name, orig_fn):
                def _timed_tool_exec(*args, **kwargs):
                    t0 = time.perf_counter()
                    res = orig_fn(*args, **kwargs)
                    dur = (time.perf_counter() - t0) * 1000.0
                    timings["tools_ms"][name] = timings["tools_ms"].get(name, 0.0) + dur
                    return res
                return _timed_tool_exec
            tool_obj.execute = make_timed_tool_execute(t_name, tool_obj.execute)
            
        reliable_llm_provider.generate_plan = timed_generate_plan
        EntityResolver.resolve = timed_resolve
        reliable_llm_provider.generate_response = timed_generate_response
        
        print(f"[{idx}/5] Running {q_type} Query:")
        print(f"      Question: \"{q_text}\"")
        
        t_start_total = time.perf_counter()
        try:
            response = run_ai_race_engineer(q_text)
            t_total = (time.perf_counter() - t_start_total) * 1000.0
            timings["total_ms"] = t_total
            tools_used = response.get("tools_used", [])
            answer_preview = response.get("final_answer", "")[:100].replace("\n", " ")
            print(f"      SUCCESS in {t_total:.1f}ms | Tools: {tools_used}")
            print(f"      Preview: {answer_preview}...")
        except Exception as e:
            t_total = (time.perf_counter() - t_start_total) * 1000.0
            timings["total_ms"] = t_total
            print(f"      FAILED in {t_total:.1f}ms: {e}")
            tools_used = []
        finally:
            # Restore originals
            reliable_llm_provider.generate_plan = orig_generate_plan
            EntityResolver.resolve = orig_resolve
            reliable_llm_provider.generate_response = orig_generate_response
            for t_name, tool_obj in tool_registry._tools.items():
                if t_name in orig_tool_executes:
                    tool_obj.execute = orig_tool_executes[t_name]
                    
        results.append({
            "type": q_type,
            "question": q_text,
            "tools_used": tools_used,
            "timings": timings
        })
        time.sleep(1) # short pause between cold runs
        
    print(f"\n================================================================================")
    print(f"SUMMARY TABLE: {label}")
    print(f"================================================================================")
    print(f"{'Query Type':<22} | {'Total (ms)':<10} | {'Plan LLM':<10} | {'Entity Res':<10} | {'Tools Breakdown':<35} | {'Synth LLM':<10}")
    print("-" * 110)
    for r in results:
        t = r["timings"]
        tools_str = ", ".join([f"{k}: {v:.0f}ms" for k, v in t["tools_ms"].items()])
        print(f"{r['type']:<22} | {t['total_ms']:<10.1f} | {t['planning_llm_ms']:<10.1f} | {t['entity_resolution_ms']:<10.1f} | {tools_str:<35} | {t['synthesis_llm_ms']:<10.1f}")
    print("================================================================================\n")
    
    with open(f"scratch/benchmark_{label.lower()}.json", "w") as f:
        json.dump(results, f, indent=2)
    return results

if __name__ == "__main__":
    lbl = sys.argv[1] if len(sys.argv) > 1 else "BASELINE"
    run_benchmarks(lbl)
