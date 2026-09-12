import os
import time
import uuid
from app.core.config import settings
from app.agents.planner import run_ai_race_engineer
from app.agents.strategy_planner import run_strategy_planner
from langsmith import Client

def verify_live_tracing():
    print("=== STEP 1: Running Live Race Engineer Query ===")
    query = "Who won the 2024 British Grand Prix and what was the podium?"
    print(f"Query: {query}")
    
    res = run_ai_race_engineer(question=query, tags=["general-query"])
    print(f"Answer: {res.get('final_answer')}")
    print(f"Tools Used: {res.get('tools_used')}")
    
    print("\nFlushing tracer queue (waiting 3s)...")
    time.sleep(3)
    
    print("\n=== STEP 2: Verifying LangSmith Trace Hierarchy ===")
    client = Client()
    
    # Fetch recent root runs
    runs = list(client.list_runs(
        project_name="FrontWing",
        is_root=True,
        limit=5
    ))
    
    if not runs:
        print("ERROR: No root runs found in project 'FrontWing'")
        return
        
    latest_run = runs[0]
    trace_id = str(latest_run.id)
    print(f"Trace ID: {trace_id}")
    print(f"Root Run Name: {latest_run.name}")
    print(f"Root Run Type: {latest_run.run_type}")
    print(f"Root Tags: {latest_run.tags}")
    print(f"Status: {latest_run.status}")
    print(f"Total Latency: {(latest_run.end_time - latest_run.start_time).total_seconds():.3f}s" if latest_run.end_time else "Latency: in progress")
    
    # Fetch all child runs belonging to this trace
    all_runs_in_trace = list(client.list_runs(
        project_name="FrontWing",
        trace_id=latest_run.id
    ))
    
    print(f"\nTotal Spans in Trace: {len(all_runs_in_trace)}")
    print("\n--- Span Tree Hierarchy ---")
    
    # Sort runs by start_time
    all_runs_in_trace.sort(key=lambda r: r.start_time)
    
    for r in all_runs_in_trace:
        indent = "  " if r.parent_run_id else ""
        sub_indent = "    " if r.run_type in ("tool", "llm") else ""
        print(f"{indent}{sub_indent}• [{r.run_type.upper()}] '{r.name}' (ID: {r.id}) - Status: {r.status}")
        if r.run_type == "tool":
            print(f"{indent}{sub_indent}    Inputs: {list(r.inputs.keys()) if r.inputs else 'None'}")
            print(f"{indent}{sub_indent}    Outputs: {list(r.outputs.keys()) if isinstance(r.outputs, dict) else type(r.outputs).__name__}")
        elif r.run_type == "llm":
            meta = r.extra.get("metadata", {}) if r.extra else {}
            print(f"{indent}{sub_indent}    Model: {meta.get('ls_model_name', 'default')} | Provider: {meta.get('ls_provider', 'default')}")
            
    print("\n=== STEP 3: Running Live Strategy Engineer Query ===")
    strat_query = "What if Norris pitted on lap 25 at 2024 Dutch GP?"
    print(f"Strategy Query: {strat_query}")
    strat_res = run_strategy_planner(question=strat_query)
    print(f"Executive Summary: {strat_res.get('executive_summary')[:100]}...")
    
    time.sleep(3)
    strat_runs = list(client.list_runs(
        project_name="FrontWing",
        is_root=True,
        limit=1
    ))
    if strat_runs:
        s_run = strat_runs[0]
        print(f"\nStrategy Trace ID: {s_run.id}")
        print(f"Strategy Run Name: {s_run.name}")
        print(f"Strategy Tags: {s_run.tags}")
        
    print("\n=== VERIFICATION COMPLETE ===")

if __name__ == "__main__":
    verify_live_tracing()
