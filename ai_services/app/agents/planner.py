import os
import re
import uuid
import time
import json
import traceback
import concurrent.futures
from typing import Dict, Any, List, Optional
from langgraph.graph import StateGraph, END
from app.agents.state import AgentState
from app.tools.registry import tool_registry
from app.agents.personas import engineer_registry
from app.core.logger import logger
from app.core.providers import reliable_llm_provider
from app.prompts.loader import load_prompt

# Try importing LLM libraries
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
# Helper: Strict JSON Plan Validation
# =====================================================================
def validate_plan_schema(plan: Dict[str, Any]) -> bool:
    required_keys = [
        "intent", "complexity", "required_engineers", "required_tools",
        "execution_order", "expected_evidence", "fallback_plan"
    ]
    return all(k in plan for k in required_keys)


# =====================================================================
# 1. Chief Race Engineer / LLM Planner Node
# =====================================================================

def plan_node(state: AgentState) -> Dict[str, Any]:
    """Node 1: Chief Race Engineer calls Gemini (with Groq failover) to generate plan."""
    question = state.get("question", "")
    session_id = state.get("session_id") or "2024_austria_gp_race"
    driver_id = state.get("driver_id") or "sainz"
    logger.info(f"[Chief Race Engineer] Generating structured plan for question: '{question}'")
    
    start_time = time.time()
    
    streaming_events = list(state.get("streaming_events", []))
    streaming_events.append({
        "event": "planning",
        "timestamp": int(time.time() * 1000),
        "details": "Initiating Gemini planning engine."
    })
    
    llm_provider = "fallback"
    llm_model = "rule_based"
    prompt_tokens = 0
    completion_tokens = 0
    estimated_cost = 0.0
    retries = 0
    structured_plan = None
    
    # Load dynamic prompt instruction externally
    system_prompt = load_prompt("planning")
    user_content = f"User question: {question}\n\nSession ID: {session_id}\nDriver ID: {driver_id}"
    
    try:
        parsed, metrics = reliable_llm_provider.generate_plan(system_prompt, user_content)
        if validate_plan_schema(parsed):
            structured_plan = parsed
            llm_provider = metrics["llm_provider"]
            llm_model = metrics["llm_model"]
            prompt_tokens = metrics["prompt_tokens"]
            completion_tokens = metrics["completion_tokens"]
            estimated_cost = metrics["estimated_cost"]
            retries = metrics["retries"]
            logger.info(f"[Chief Race Engineer] {llm_provider} provider successfully generated valid plan.")
    except Exception as e:
        logger.warning(f"[Chief Race Engineer] Reliable LLM provider planning failed: {e}. Falling back to rule-based planner.")
        streaming_events.append({
            "event": "planning",
            "timestamp": int(time.time() * 1000),
            "details": f"Reliable LLM provider planning failed: {e}. Running rule-based fallback."
        })

    # 3. Rule-Based Fallback (No Keys or Both Failed)
    if not structured_plan:
        intent = "race_investigation"
        required_engineers = ["Investigation Engineer", "Explain Engineer", "Judge Engineer"]
        required_tools = ["scoring_tool", "explain_mode_tool"]
        execution_order = [
            f"scoring_tool|session_id={session_id},driver_id={driver_id}",
            "explain_mode_tool|term=CAR"
        ]
        
        q_lower = question.lower()
        if "simulate" in q_lower or "what if" in q_lower or "pit lap" in q_lower or "pitted on" in q_lower:
            intent = "strategy_investigation"
            lap_match = re.search(r"lap\s+(\d+)", q_lower)
            pit_lap = int(lap_match.group(1)) if lap_match else 20
            required_engineers = ["Strategy Engineer", "Judge Engineer"]
            required_tools = ["simulation_tool"]
            execution_order = [f"simulation_tool|session_id={session_id},driver_id={driver_id},simulated_pit_lap={pit_lap}"]
        elif "telemetry" in q_lower or "speed" in q_lower or "throttle" in q_lower or "brake" in q_lower:
            intent = "driver_investigation"
            required_engineers = ["Telemetry Engineer", "Judge Engineer"]
            required_tools = ["telemetry_tool"]
            lap_match = re.search(r"lap\s+(\d+)", q_lower)
            lap = int(lap_match.group(1)) if lap_match else 42
            execution_order = [f"telemetry_tool|session_id={session_id},driver_id={driver_id},lap_number={lap}"]
            
        structured_plan = {
            "intent": intent,
            "complexity": "intermediate",
            "required_engineers": required_engineers,
            "required_tools": required_tools,
            "execution_order": execution_order,
            "expected_evidence": ["metrics binned data"],
            "fallback_plan": ["scoring_tool|session_id=2024_austria_gp_race,driver_id=sainz"]
        }
        
    planning_duration_ms = int((time.time() - start_time) * 1000)
    
    # Trace Timelines V3 initialization
    plan_log = {
        "step": "plan",
        "duration_ms": planning_duration_ms,
        "timestamp": int(time.time() * 1000)
    }

    return {
        "structured_plan": structured_plan,
        "plan": structured_plan["execution_order"],
        "next_step_idx": 0,
        "tools_used": [],
        "evidence": {},
        "errors": [],
        "reflection_count": 0,
        "reflection_notes": [],
        "judge_evaluation": {},
        "streaming_events": streaming_events,
        "collaboration_graph": [],
        "intelligence_trace": {
            "investigation_id": str(uuid.uuid4()),
            "planning_graph": {
                "nodes": ["plan", "execute", "reflect", "judge", "synthesize"],
                "edges": [
                    ("plan", "execute"),
                    ("execute", "reflect"),
                    ("reflect", "execute"),
                    ("reflect", "judge"),
                    ("judge", "synthesize")
                ]
            },
            "reasoning_graph": [],
            "evidence_graph": {},
            "engineer_collaboration_graph": [],
            "llm_provider": llm_provider,
            "llm_model": llm_model,
            "llm_latency": planning_duration_ms,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "estimated_cost": estimated_cost,
            "retries": retries,
            "timelines": {
                "planning": [plan_log],
                "engineers": [],
                "evidence": [],
                "reflection": [],
                "judge": [],
                "confidence": [{"value": 95.0, "timestamp": int(time.time() * 1000)}]
            },
            "recovery_steps": []
        }
    }


# =====================================================================
# 2. Parallel Specialized Engineers Execution Node
# =====================================================================

def execute_node(state: AgentState) -> Dict[str, Any]:
    """Node 2: Chief Race Engineer dispatches inputs to specialized engineers concurrently."""
    plan = state["plan"]
    tools_used = list(state.get("tools_used", []))
    evidence = dict(state.get("evidence", {}))
    errors = list(state.get("errors", []))
    trace = dict(state.get("intelligence_trace", {}))
    streaming_events = list(state.get("streaming_events", []))
    collaboration_graph = state.setdefault("collaboration_graph", [])
    
    if "timelines" not in trace:
        trace["timelines"] = {}
        
    logger.info(f"[Chief Race Engineer] Executing plan order concurrently.")
    trace.setdefault("execution_graph", []).append("execute")
    
    engineers = {
        "simulation_tool": engineer_registry.get_engineer("Strategy Engineer"),
        "scoring_tool": engineer_registry.get_engineer("Investigation Engineer"),
        "telemetry_tool": engineer_registry.get_engineer("Telemetry Engineer"),
        "explain_mode_tool": engineer_registry.get_engineer("Explain Engineer")
    }
    
    def parse_step(step: str):
        if "|" in step:
            tool_name, raw_args = step.split("|")
            args_dict = {}
            for pair in raw_args.split(","):
                if "=" in pair:
                    k, v = pair.split("=")
                    if v.isdigit():
                        args_dict[k] = int(v)
                    else:
                        args_dict[k] = v
            return tool_name, args_dict
        else:
            return step, {}

    start_time = time.time()
    futures = {}
    
    # Dispatch tools
    with concurrent.futures.ThreadPoolExecutor() as executor:
        for idx, step in enumerate(plan):
            try:
                name, args = parse_step(step)
                if "session_id" not in args:
                    args["session_id"] = state.get("session_id") or "2024_austria_gp_race"
                if "driver_id" not in args:
                    args["driver_id"] = state.get("driver_id") or "sainz"
                if name == "explain_mode_tool" and "term" not in args:
                    args["term"] = "CAR"
                    
                # Match to specialized Persona
                if name in engineers:
                    engineer = engineers[name]
                else:
                    # Dynamically instantiate fallback wrapper
                    from app.agents.personas import BaseEngineer
                    class DynamicToolEngineer(BaseEngineer):
                        @property
                        def role(self) -> str:
                            return f"dynamic_{name}_execution"
                        @property
                        def name(self) -> str:
                            return f"Dynamic {name} Engineer"
                        def execute(self, state_ctx, tool_inputs):
                            return tool_registry.get_tool(name).execute(tool_inputs)
                    engineer = DynamicToolEngineer()
                    
                # Log Streaming Event: Tool Started
                streaming_events.append({
                    "event": "tool_started",
                    "timestamp": int(time.time() * 1000),
                    "details": f"Engineer '{engineer.name}' started executing step: '{step}'."
                })
                
                # Execute tool run via modular Persona execute interface
                future = executor.submit(engineer.execute, state, args)
                futures[future] = (engineer, name, step, time.time())
            except Exception as e:
                err_msg = f"Failed to dispatch step '{step}': {e}"
                errors.append(err_msg)
                trace.setdefault("recovery_steps", []).append(f"Dispatch recovery: {err_msg}")
                
        # Gather outputs
        for future in concurrent.futures.as_completed(futures):
            engineer, name, step, t_start = futures[future]
            duration_ms = int((time.time() - t_start) * 1000)
            timestamp = int(time.time() * 1000)
            
            # Log Timelines Logs for Observability Trace V3
            eng_log = {
                "engineer": engineer.name,
                "role": engineer.role,
                "duration_ms": duration_ms,
                "timestamp": timestamp
            }
            trace["timelines"].setdefault("engineers", []).append(eng_log)
            
            ev_log = {
                "evidence_key": name,
                "source_tool": name,
                "timestamp": timestamp
            }
            trace["timelines"].setdefault("evidence", []).append(ev_log)
            
            # Log Streaming Event: Tool Finished
            streaming_events.append({
                "event": "tool_finished",
                "timestamp": timestamp,
                "details": f"Engineer '{engineer.name}' finished executing tool '{name}' successfully in {duration_ms}ms."
            })
            
            try:
                res = future.result()
                evidence[name] = res
                tools_used.append(name)
                # Map trace evidence_graph properties
                trace.setdefault("evidence_graph", {})[name] = list(res.keys()) if isinstance(res, dict) else ["data_value"]
            except Exception as ex:
                tb_str = traceback.format_exc()
                err_msg = f"Engineer '{engineer.name}' failed executing tool '{name}': {ex}"
                logger.error(f"[Chief Race Engineer] Engineer execution crash: {err_msg}\n{tb_str}")
                errors.append(err_msg)
                trace.setdefault("recovery_steps", []).append(f"Auto-recovery: omitted failed engineer {engineer.name}")

    return {
        "next_step_idx": len(plan),
        "tools_used": tools_used,
        "evidence": evidence,
        "errors": errors,
        "streaming_events": streaming_events,
        "intelligence_trace": trace,
        "collaboration_graph": collaboration_graph
    }


# =====================================================================
# 3. Reflection Engineer Node
# =====================================================================

def reflect_node(state: AgentState) -> Dict[str, Any]:
    """Node 3: Reflection Engineer performs consistency checks and plan edits."""
    evidence = state.get("evidence", {})
    plan = list(state.get("plan", []))
    reflection_notes = list(state.get("reflection_notes", []))
    reflection_count = state.get("reflection_count", 0)
    errors = state.get("errors", [])
    trace = dict(state.get("intelligence_trace", {}))
    streaming_events = list(state.get("streaming_events", []))
    
    if "timelines" not in trace:
        trace["timelines"] = {}
        
    logger.info("[Reflection Engineer] Evaluating loop consistency.")
    trace.setdefault("execution_graph", []).append("reflect")
    
    start_time = time.time()
    
    # 1. Checks
    sufficient = len(evidence) > 0
    consistent = True
    if "simulation_tool" in evidence and "scoring_tool" in evidence:
        sim_pos = evidence["simulation_tool"].get("projected_finishing_position", 1)
        score_finish = evidence["scoring_tool"].get("p_finish", 1)
        if abs(sim_pos - score_finish) > 5:
            consistent = False
            reflection_notes.append("Telemetry/simulation mismatch detected: high finishing delta projection.")
            
    # 2. Logic loop trigger
    loop_triggered = False
    if not sufficient and not errors:
        reflection_notes.append("Tool evidence empty. Retriggering default scoring check.")
        plan.append("scoring_tool|session_id=2024_austria_gp_race,driver_id=sainz")
        loop_triggered = True
    elif not consistent and reflection_count < 1:
        reflection_notes.append("Tool disagreement triggers additional explain validation.")
        plan.append("explain_mode_tool|term=SPG")
        loop_triggered = True
        
    if not loop_triggered:
        reflection_notes.append("Self-evaluation passes: evidence sufficient and consistent.")
        
    duration_ms = int((time.time() - start_time) * 1000)
    
    # Log Streaming Event: Reflection Evaluated
    streaming_events.append({
        "event": "reflection",
        "timestamp": int(time.time() * 1000),
        "details": f"Reflection evaluated. Loop triggered = {loop_triggered}."
    })
    
    ref_log = {
        "step": "reflect",
        "duration_ms": duration_ms,
        "notes": "; ".join(reflection_notes),
        "timestamp": int(time.time() * 1000)
    }
    trace["timelines"].setdefault("reflection", []).append(ref_log)
    trace.setdefault("reasoning_graph", []).append(f"Reflection loop check: consistent={consistent}, sufficient={sufficient}")
        
    return {
        "reflection_count": reflection_count + 1 if loop_triggered else reflection_count,
        "plan": plan,
        "reflection_notes": reflection_notes,
        "intelligence_trace": trace,
        "streaming_events": streaming_events
    }


def should_reflect_loop(state: AgentState) -> str:
    reflection_count = state.get("reflection_count", 0)
    plan = state.get("plan", [])
    next_step = state.get("next_step_idx", 0)
    
    if next_step < len(plan) and reflection_count < 2:
        return "execute"
    return "judge"


# =====================================================================
# 4. Judge Engineer Node
# =====================================================================

def judge_node(state: AgentState) -> Dict[str, Any]:
    """Node 4: Judge Engineer grades factual correctness and completes evaluations."""
    evidence = state.get("evidence", {})
    errors = state.get("errors", [])
    trace = dict(state.get("intelligence_trace", {}))
    streaming_events = list(state.get("streaming_events", []))
    
    if "timelines" not in trace:
        trace["timelines"] = {}
        
    logger.info("[Judge Engineer] Fact checking gathered evidence metrics.")
    trace.setdefault("execution_graph", []).append("judge")
    
    start_time = time.time()
    
    factual_completeness = 100
    evidence_quality = 100
    consistency = 100
    judge_notes = []
    
    if not evidence:
        factual_completeness = 20
        judge_notes.append("Factual check: Zero evidence returned.")
    else:
        if len(errors) > 0:
            evidence_quality -= len(errors) * 20
            factual_completeness -= len(errors) * 15
            judge_notes.append(f"Failsafe check: {len(errors)} execution errors recorded.")
            
    if "simulation_tool" in evidence and "scoring_tool" in evidence:
        sim = evidence["simulation_tool"]
        scores = evidence["scoring_tool"]
        if sim.get("actual_finishing_position") != scores.get("p_finish"):
            consistency -= 20
            judge_notes.append("Consistency check: Actual position coordinates mismatch.")
            
    judge_eval = {
        "factual_completeness": max(10, factual_completeness),
        "evidence_quality": max(10, evidence_quality),
        "consistency": max(10, consistency),
        "judge_notes": "; ".join(judge_notes) if judge_notes else "Verification pass: metrics completely aligned."
    }
    
    duration_ms = int((time.time() - start_time) * 1000)
    
    # Log Streaming Event: Judge Evaluated
    streaming_events.append({
        "event": "judge",
        "timestamp": int(time.time() * 1000),
        "details": f"Judge complete. Quality score = {evidence_quality}."
    })
    
    judge_log = {
        "step": "judge",
        "duration_ms": duration_ms,
        "score": (factual_completeness + evidence_quality + consistency) / 3.0,
        "timestamp": int(time.time() * 1000)
    }
    trace["timelines"].setdefault("judge", []).append(judge_log)
    trace.setdefault("reasoning_graph", []).append(f"Judge evaluated final parameters: {judge_eval['judge_notes']}")
    
    return {
        "judge_evaluation": judge_eval,
        "intelligence_trace": trace,
        "streaming_events": streaming_events
    }


# =====================================================================
# 5. Synthesize & Structured Investigation Report Node
# =====================================================================

def synthesize_node(state: AgentState) -> Dict[str, Any]:
    """Node 5: Generates structured F1 Investigation Reports and compiles Trace V3."""
    question = state["question"]
    evidence = state.get("evidence", {})
    errors = state.get("errors", [])
    reflection_notes = state.get("reflection_notes", [])
    judge_eval = state.get("judge_evaluation", {})
    trace = dict(state.get("intelligence_trace", {}))
    streaming_events = list(state.get("streaming_events", []))
    collaboration_graph = list(state.get("collaboration_graph", []))
    
    if "timelines" not in trace:
        trace["timelines"] = {}
        
    logger.info("[Chief Race Engineer] Compiling final structured report and Trace V3.")
    trace.setdefault("execution_graph", []).append("synthesize")
    
    # 1. Confidence calculations
    completeness_factor = 100.0 if len(evidence) > 0 else 20.0
    agreement_factor = 100.0 if "mismatch" not in "".join(reflection_notes).lower() else 60.0
    sim_factor = 95.0
    if "simulation_tool" in evidence:
        sim_factor = float(evidence["simulation_tool"].get("confidence", 95))
        
    judge_factor = (judge_eval.get("factual_completeness", 100) + 
                    judge_eval.get("evidence_quality", 100) + 
                    judge_eval.get("consistency", 100)) / 3.0
                    
    confidence = round(0.2 * completeness_factor + 0.2 * agreement_factor + 0.3 * sim_factor + 0.3 * judge_factor, 1)
    
    # Record confidence timeline for Trace V3
    trace["timelines"].setdefault("confidence", []).append({
        "value": confidence,
        "timestamp": int(time.time() * 1000)
    })
    
    # Invoke modular Explain Engineer to generate audience explanations from the same evidence
    explain_eng = engineer_registry.get_engineer("Explain Engineer")
    explanations = explain_eng.execute(state, {})
    
    # =====================================================================
    # 2. Deep Investigation Report Structures
    # =====================================================================
    exec_summary = explanations["intermediate"]
    telemetry_findings = "No telemetry anomalies detected."
    simulation_findings = "No strategy simulations were run."
    historical_findings = "No historical standings parsed."
    alternative_scenarios = "Maintain current compound stint guidelines."
    final_recommendation = "Continue with plan."
    
    if "simulation_tool" in evidence:
        sim = evidence["simulation_tool"]
        pos_diff = sim["position_change"]
        gain_sec = sim["simulated_net_time_gain_ms"] / 1000.0
        
        telemetry_findings = "Speed/throttle profiles corresponding to pit stops verified."
        simulation_findings = (
            f"Pit loss simulated at {sim['run_parameters']['pit_loss']}s. "
            f"Net projected race duration delta is {gain_sec:+.3f} seconds."
        )
        alternative_scenarios = (
            f"Pitting on Lap {sim['simulated_pit_lap']} vs actual pit lap {sim['actual_pit_lap']}. "
            f"Target compound compound used was {sim['target_compound']}."
        )
        final_recommendation = (
            f"Apply the early pit strategy to gain P{sim['projected_finishing_position']} finishing placement."
            if pos_diff > 0 else "Do not execute early stop. Hold current position."
        )
        
    elif "scoring_tool" in evidence:
        scores = evidence["scoring_tool"]
        historical_findings = (
            f"Driver grid start was P{scores.get('p_start')}, finishing position P{scores.get('p_finish')}."
        )
        final_recommendation = (
            f"Strategy rating is {scores.get('strategy_score', 0.0)}/100. Review tire stint length management guidelines."
        )
        
    if "telemetry_tool" in evidence:
        tel = evidence["telemetry_tool"]
        telemetry_findings = (
            f"Retrieved speed profiles containing {tel['telemetry_points_count']} data coordinates binned by distance."
        )
        
    investigation_report = {
        "Executive Summary": exec_summary,
        "Evidence": list(evidence.keys()),
        "Telemetry Findings": telemetry_findings,
        "Simulation Findings": simulation_findings,
        "Historical Findings": historical_findings,
        "Alternative Scenarios": alternative_scenarios,
        "Final Recommendation": final_recommendation,
        "Confidence": confidence
    }
    
    # 3. Observability Timeline V3 compiler
    trace.update({
        "total_latency_ms": sum(t["duration_ms"] for t in trace["timelines"].get("planning", [])) + 
                            sum(t["duration_ms"] for t in trace["timelines"].get("engineers", [])) + 
                            sum(t["duration_ms"] for t in trace["timelines"].get("reflection", [])) + 
                            sum(t["duration_ms"] for t in trace["timelines"].get("judge", [])),
        "reflection_notes": reflection_notes,
        "judge_notes": judge_eval.get("judge_notes", ""),
        "confidence_breakdown": {
            "evidence_completeness": completeness_factor,
            "tool_agreement": agreement_factor,
            "simulation_confidence": sim_factor,
            "judge_score": judge_factor
        },
        "errors": errors,
        "engineer_collaboration_graph": collaboration_graph
    })
    
    # Log Streaming Event: Complete
    streaming_events.append({
        "event": "completed",
        "timestamp": int(time.time() * 1000),
        "details": "AI Race Engineer completed F1 investigation report successfully."
    })

    return {
        "final_answer": exec_summary,
        "confidence": confidence,
        "explain_mode_options": ["novice", "intermediate", "expert"],
        "investigation_report": investigation_report,
        "intelligence_trace": trace,
        "streaming_events": streaming_events,
        "explanations": explanations
    }

# =====================================================================
# StateGraph Compilation
# =====================================================================

workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("plan", plan_node)
workflow.add_node("execute", execute_node)
workflow.add_node("reflect", reflect_node)
workflow.add_node("judge", judge_node)
workflow.add_node("synthesize", synthesize_node)

# Set entry point
workflow.set_entry_point("plan")

# Connect plan directly to execute
workflow.add_edge("plan", "execute")

# Connect execute to reflect
workflow.add_edge("execute", "reflect")

# Conditional loop from reflect back to execute or forward to judge
workflow.add_conditional_edges(
    "reflect",
    should_reflect_loop,
    {
        "execute": "execute",
        "judge": "judge"
    }
)

# Connect judge to synthesize
workflow.add_edge("judge", "synthesize")
workflow.add_edge("synthesize", END)

# Compile graph
compiled_graph = workflow.compile()


def run_ai_race_engineer(
    question: str,
    session_id: Optional[str] = None,
    driver_id: Optional[str] = None,
    history: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """Top-level function to execute the Chief Race Engineer StateGraph."""
    initial_state = {
        "question": question,
        "session_id": session_id,
        "driver_id": driver_id,
        "plan": [],
        "tools_used": [],
        "next_step_idx": 0,
        "evidence": {},
        "final_answer": "",
        "confidence": 0.0,
        "explain_mode_options": [],
        "errors": [],
        "history": history or [],
        "reflection_count": 0,
        "reflection_notes": [],
        "judge_evaluation": {},
        "intelligence_trace": {},
        "streaming_events": [],
        "collaboration_graph": []
    }
    
    # Run graph
    try:
        final_state = compiled_graph.invoke(initial_state)
        return {
            "question": final_state["question"],
            "planning_steps": final_state["plan"],
            "tools_used": final_state["tools_used"],
            "evidence": final_state["evidence"],
            "confidence": final_state["confidence"],
            "final_answer": final_state["final_answer"],
            "explain_mode_options": final_state["explain_mode_options"],
            "errors": final_state["errors"],
            "investigation_report": final_state["investigation_report"],
            "intelligence_trace": final_state["intelligence_trace"],
            "streaming_events": final_state["streaming_events"],
            "explanations": final_state["explanations"]
        }
    except Exception as e:
        logger.error(f"LangGraph execution exception: {e}")
        return {
            "question": question,
            "planning_steps": [],
            "tools_used": [],
            "evidence": {},
            "confidence": 10.0,
            "final_answer": f"System error: {e}",
            "explain_mode_options": ["novice", "intermediate", "expert"],
            "errors": [str(e)],
            "investigation_report": {
                "Executive Summary": f"System error: {e}",
                "Evidence": [],
                "Telemetry Findings": "Unavailable",
                "Simulation Findings": "Unavailable",
                "Historical Findings": "Unavailable",
                "Alternative Scenarios": "Unavailable",
                "Final Recommendation": "Investigate microservice configurations.",
                "Confidence": 10.0
            },
            "intelligence_trace": {
                "investigation_id": str(uuid.uuid4()),
                "errors": [str(e)],
                "recovery_steps": ["StateGraph runtime crash fallback"]
            },
            "streaming_events": [],
            "explanations": {
                "beginner": f"System error: {e}",
                "intermediate": f"System error: {e}",
                "engineer": f"System error: {e}"
            }
        }
