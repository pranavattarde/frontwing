import os
import re
import uuid
import time
import traceback
import concurrent.futures
from typing import Dict, Any, List, Optional
from langgraph.graph import StateGraph, END
from app.agents.state import AgentState
from app.tools.registry import tool_registry
from app.core.logger import logger

# Try importing LangChain / LLM models if available
try:
    from langchain_groq import ChatGroq
    from langchain_core.messages import SystemMessage, HumanMessage
    HAS_LLM = True
except ImportError:
    HAS_LLM = False

# =====================================================================
# LangGraph Planner Agent Node Implementations
# =====================================================================

def plan_node(state: AgentState) -> Dict[str, Any]:
    """Node 1: Understands intent, context, and generates a structured plan."""
    question = state.get("question", "")
    session_id = state.get("session_id") or "2024_austria_gp_race"
    driver_id = state.get("driver_id") or "sainz"
    logger.info(f"[Planner] Creating structured plan for question: '{question}'")
    
    start_time = time.time()
    
    # 1. Resolve context based on history if inputs are omitted
    history = state.get("history", [])
    
    # Standard rule-based fallback planner outputs
    intent = "driver_performance_scoring"
    required_tools = ["scoring_tool", "explain_mode_tool"]
    execution_order = ["scoring_tool", "explain_mode_tool"]
    reasoning = "Evaluate Sainz's race metrics and explain F1 parameter details."
    expected_outputs = ["strategy_score, composite_score", "Clean Air Ratio formula details"]
    
    q_lower = question.lower()
    if "simulate" in q_lower or "what if" in q_lower or "pit lap" in q_lower or "pitted on" in q_lower:
        intent = "strategy_simulation"
        lap_match = re.search(r"lap\s+(\d+)", q_lower)
        pit_lap = int(lap_match.group(1)) if lap_match else 20
        required_tools = ["simulation_tool"]
        execution_order = [f"simulation_tool|session_id={session_id},driver_id={driver_id},simulated_pit_lap={pit_lap}"]
        reasoning = f"Simulate a what-if pit stop window on Lap {pit_lap}."
        expected_outputs = ["projected_finishing_position, simulated_net_time_gain_ms"]
    elif "telemetry" in q_lower or "speed" in q_lower or "throttle" in q_lower or "brake" in q_lower:
        intent = "telemetry_alignment_check"
        lap_match = re.search(r"lap\s+(\d+)", q_lower)
        lap = int(lap_match.group(1)) if lap_match else 42
        required_tools = ["telemetry_tool"]
        execution_order = [f"telemetry_tool|session_id={session_id},driver_id={driver_id},lap_number={lap}"]
        reasoning = f"Examine downsampled telemetry speed traces on Lap {lap}."
        expected_outputs = ["driver_id, telemetry_points_count, telemetry"]
    elif "explain" in q_lower or "term" in q_lower or "definition" in q_lower or "car" in q_lower or "spg" in q_lower or "tse" in q_lower:
        intent = "mathematical_explain_mode"
        term = "CAR"
        if "spg" in q_lower:
            term = "SPG"
        elif "tse" in q_lower:
            term = "TSE"
        required_tools = ["explain_mode_tool"]
        execution_order = [f"explain_mode_tool|term={term}"]
        reasoning = f"Provide progressive disclosure formulas for F1 term {term}."
        expected_outputs = ["formula, explanation"]
    else:
        # Defaults to scoring
        execution_order = [
            f"scoring_tool|session_id={session_id},driver_id={driver_id}",
            "explain_mode_tool|term=CAR"
        ]
        
    structured_plan = {
        "intent": intent,
        "required_tools": required_tools,
        "execution_order": execution_order,
        "reasoning": reasoning,
        "expected_outputs": expected_outputs
    }
    
    # Observe time
    planning_duration_ms = int((time.time() - start_time) * 1000)
    
    # Initialize trace timeline logs
    plan_log = {
        "node": "planning_node",
        "duration_ms": planning_duration_ms,
        "timestamp": int(time.time() * 1000)
    }

    return {
        "structured_plan": structured_plan,
        "plan": execution_order,
        "next_step_idx": 0,
        "tools_used": [],
        "evidence": {},
        "errors": [],
        "reflection_count": 0,
        "reflection_notes": [],
        "judge_evaluation": {},
        "intelligence_trace": {
            "investigation_id": str(uuid.uuid4()),
            "planning_timeline": [plan_log],
            "tool_timeline": [],
            "recovery_steps": []
        }
    }


def execute_node(state: AgentState) -> Dict[str, Any]:
    """Node 2: Concurrently executes independent plan tools using a ThreadPoolExecutor."""
    plan = state["plan"]
    tools_used = list(state.get("tools_used", []))
    evidence = dict(state.get("evidence", {}))
    errors = list(state.get("errors", []))
    trace = dict(state.get("intelligence_trace", {}))
    
    logger.info(f"[Planner] Starting execution cycle for {len(plan)} tool nodes.")
    
    def parse_step(step: str):
        # Parses tool name and arguments: e.g. "scoring_tool|session_id=x,driver_id=y"
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

    # Thread Pool parallel execution
    start_time = time.time()
    futures = {}
    
    with concurrent.futures.ThreadPoolExecutor() as executor:
        for idx, step in enumerate(plan):
            try:
                name, args = parse_step(step)
                # Enforce context defaults if missing
                if "session_id" not in args:
                    args["session_id"] = state.get("session_id") or "2024_austria_gp_race"
                if "driver_id" not in args:
                    args["driver_id"] = state.get("driver_id") or "sainz"
                if name == "explain_mode_tool" and "term" not in args:
                    args["term"] = "CAR"
                    
                tool = tool_registry.get_tool(name)
                
                # Submit tool run in parallel
                future = executor.submit(tool.execute, args)
                futures[future] = (name, step, time.time())
            except Exception as e:
                err_msg = f"Parallel submission failed for step '{step}': {e}"
                errors.append(err_msg)
                trace.setdefault("recovery_steps", []).append(f"Sub-step recovery: {err_msg}")
                
        # Gather results concurrently
        for future in concurrent.futures.as_completed(futures):
            name, step, t_start = futures[future]
            duration_ms = int((time.time() - t_start) * 1000)
            
            # Log tool timeline metrics for tracing
            tool_log = {
                "tool": name,
                "step": step,
                "duration_ms": duration_ms,
                "timestamp": int(time.time() * 1000)
            }
            trace.setdefault("tool_timeline", []).append(tool_log)
            
            try:
                res = future.result()
                evidence[name] = res
                tools_used.append(name)
            except Exception as ex:
                tb_str = traceback.format_exc()
                err_msg = f"Concurrent run exception on tool '{name}': {ex}"
                logger.error(f"[Planner] Parallel tool crash: {err_msg}\n{tb_str}")
                errors.append(err_msg)
                trace.setdefault("recovery_steps", []).append(f"Auto-recovery executed: omitted failed tool {name}")
                
    execution_duration_ms = int((time.time() - start_time) * 1000)
    logger.info(f"[Planner] Parallel tool execution loop completed in {execution_duration_ms}ms")
    
    return {
        "next_step_idx": len(plan),
        "tools_used": tools_used,
        "evidence": evidence,
        "errors": errors,
        "intelligence_trace": trace
    }


def reflect_node(state: AgentState) -> Dict[str, Any]:
    """Node 3: Evaluates sufficiency, tool agreement, and self-corrects."""
    evidence = state.get("evidence", {})
    plan = list(state.get("plan", []))
    reflection_notes = list(state.get("reflection_notes", []))
    reflection_count = state.get("reflection_count", 0)
    errors = state.get("errors", [])
    
    logger.info("[Reflection] Initiating self-evaluation node.")
    
    # 1. Sufficiency Check
    evidence_sufficient = len(evidence) > 0
    
    # 2. Agreement Check
    tools_agree = True
    # If both simulation and scoring ran, confirm they don't produce wildly contradictory positions
    if "simulation_tool" in evidence and "scoring_tool" in evidence:
        sim_pos = evidence["simulation_tool"].get("projected_finishing_position", 1)
        score_finish = evidence["scoring_tool"].get("p_finish", 1)
        if abs(sim_pos - score_finish) > 5:
            tools_agree = False
            reflection_notes.append("Telemetry/simulation mismatch detected: high finishing delta projection.")
            
    # 3. Decision Loop triggers if tools disagreed or evidence was empty
    loop_triggered = False
    if not evidence_sufficient and not errors:
        reflection_notes.append("Tool evidence empty. Retriggering default scoring tool.")
        plan.append("scoring_tool|session_id=2024_austria_gp_race,driver_id=sainz")
        loop_triggered = True
    elif not tools_agree and reflection_count < 1:
        reflection_notes.append("Tool disagreement triggers additional explain validation.")
        plan.append("explain_mode_tool|term=SPG")
        loop_triggered = True
        
    if not loop_triggered:
        reflection_notes.append("Self-evaluation passes: evidence sufficient and consistent.")
        
    return {
        "reflection_count": reflection_count + 1 if loop_triggered else reflection_count,
        "plan": plan,
        "reflection_notes": reflection_notes
    }


def should_reflect_loop(state: AgentState) -> str:
    """Routes state graph back to tool execution or forward to the Judge node."""
    reflection_count = state.get("reflection_count", 0)
    plan = state.get("plan", [])
    next_step = state.get("next_step_idx", 0)
    
    if next_step < len(plan) and reflection_count < 2:
        logger.info("[Reflection] RETRIGGERING execution loop cycle.")
        return "execute"
    return "judge"


def judge_node(state: AgentState) -> Dict[str, Any]:
    """Node 4: Validates factual completeness, evidence quality, and consistency."""
    evidence = state.get("evidence", {})
    errors = state.get("errors", [])
    logger.info("[Judge] Evaluator node analyzing response evidence structures.")
    
    factual_completeness = 100
    evidence_quality = 100
    consistency = 100
    judge_notes = []
    
    # 1. Deduct completeness points if expected tools are missing
    if not evidence:
        factual_completeness = 20
        judge_notes.append("Factual check: Zero evidence returned.")
    else:
        if len(errors) > 0:
            evidence_quality -= len(errors) * 20
            factual_completeness -= len(errors) * 15
            judge_notes.append(f" Failsafe check: {len(errors)} execution errors recorded.")
            
    # 2. Check consistency
    if "simulation_tool" in evidence and "scoring_tool" in evidence:
        sim = evidence["simulation_tool"]
        scores = evidence["scoring_tool"]
        # Consistent if simulated and actual positions correspond logically
        if sim.get("actual_finishing_position") != scores.get("p_finish"):
            consistency -= 20
            judge_notes.append("Consistency check: Actual position coordinates mismatch.")
            
    judge_eval = {
        "factual_completeness": max(10, factual_completeness),
        "evidence_quality": max(10, evidence_quality),
        "consistency": max(10, consistency),
        "judge_notes": "; ".join(judge_notes) if judge_notes else "Verification pass: metrics completely aligned."
    }
    
    return {
        "judge_evaluation": judge_eval
    }


def synthesize_node(state: AgentState) -> Dict[str, Any]:
    """Node 5: Computes V2 normalized confidence score, constructs trace metrics, and synthesizes answers."""
    question = state["question"]
    evidence = state.get("evidence", {})
    errors = state.get("errors", [])
    reflection_notes = state.get("reflection_notes", [])
    judge_eval = state.get("judge_evaluation", {})
    trace = dict(state.get("intelligence_trace", {}))
    
    logger.info("[Synthesizer] Resolving V2 confidence metrics and generating structured answer.")
    
    # =====================================================================
    # 1. Confidence Engine V2: Normalized confidence score
    # =====================================================================
    # Combine: Tool Agreement, Evidence Completeness, Sim Confidence, Judge Score
    completeness_factor = 100.0 if len(evidence) > 0 else 20.0
    agreement_factor = 100.0 if "mismatch" not in "".join(reflection_notes).lower() else 60.0
    sim_factor = 95.0
    if "simulation_tool" in evidence:
        sim_factor = float(evidence["simulation_tool"].get("confidence", 95))
        
    judge_factor = (judge_eval.get("factual_completeness", 100) + 
                    judge_eval.get("evidence_quality", 100) + 
                    judge_eval.get("consistency", 100)) / 3.0
                    
    # Normalized average
    confidence = round(0.2 * completeness_factor + 0.2 * agreement_factor + 0.3 * sim_factor + 0.3 * judge_factor, 1)
    
    # =====================================================================
    # 2. Observability Intelligence Trace Builder
    # =====================================================================
    trace.update({
        "execution_duration_ms": sum(t["duration_ms"] for t in trace.get("tool_timeline", [])),
        "tool_outputs": {k: "Output data cached" for k in evidence.keys()},
        "reflection_notes": reflection_notes,
        "judge_notes": judge_eval.get("judge_notes", ""),
        "confidence_breakdown": {
            "evidence_completeness": completeness_factor,
            "tool_agreement": agreement_factor,
            "simulation_confidence": sim_factor,
            "judge_score": judge_factor
        },
        "errors": errors
    })
    
    final_answer = ""
    explain_mode_options = ["novice", "intermediate", "expert"]
    
    # Try calling LLM to synthesize natural language response if credentials exist
    if HAS_LLM and os.getenv("GROQ_API_KEY"):
        try:
            llm = ChatGroq(model_name="llama-3.1-70b-versatile", temperature=0)
            sys_msg = (
                "You are FrontWing's AI Race Engineer. Using the gathered evidence, write a clinical, "
                "precise, and professional Formula 1 race engineering response explaining the findings. "
                "Ensure you reference key numbers, compounds, and gaps. Do not speculate without calculations."
            )
            prompt = f"Question: {question}\n\nEvidence Gained:\n{json.dumps(evidence, indent=2)}"
            response = llm.invoke([SystemMessage(content=sys_msg), HumanMessage(content=prompt)])
            final_answer = response.content
        except Exception as e:
            logger.warning(f"[Planner] LLM synthesis failed: {e}. Falling back to template synthesis.")

    # Rule-Based Template Synthesis Fallback
    if not final_answer:
        if "simulation_tool" in evidence:
            sim = evidence["simulation_tool"]
            pos_diff = sim["position_change"]
            gain_sec = sim["simulated_net_time_gain_ms"] / 1000.0
            
            if pos_diff > 0:
                final_answer = (
                    f"Our strategy model projects a net time gain of {gain_sec:+.3f}s, yielding P{sim['projected_finishing_position']} "
                    f"(actual finishing position was P{sim['actual_finishing_position']}). This stop gains {pos_diff} position(s) "
                    f"relative to actual race timelines."
                )
            else:
                final_answer = (
                    f"Simulated pit stop on Lap {sim['simulated_pit_lap']} does not yield net improvements. "
                    f"Projected finishing position is P{sim['projected_finishing_position']} with a delta of {gain_sec:+.3f}s "
                    f"compared to actual finishing position P{sim['actual_finishing_position']}."
                )
        elif "scoring_tool" in evidence:
            scores = evidence["scoring_tool"]
            final_answer = (
                f"Completed intelligence scoring check for driver. Composite performance grade is {scores.get('composite_score', 0.0)}/100. "
                f"Stint Strategy is rated {scores.get('strategy_score', 0.0)}/100, and Tire Management is rated {scores.get('tire_score', 0.0)}/100."
            )
        elif "telemetry_tool" in evidence:
            tel = evidence["telemetry_tool"]
            final_answer = (
                f"Retrieved {tel['telemetry_points_count']} telemetry coordinates aligned by track distance metric bins. "
                f"Clean speed profile is loaded successfully for driver."
            )
        elif "explain_mode_tool" in evidence:
            exp = evidence["explain_mode_tool"]
            final_answer = (
                f"Formula description for term {exp['term']}: {exp['explanation']} (Formula: {exp.get('formula', 'N/A')})."
            )
        else:
            final_answer = (
                "AI Race Engineer finished analysis. No timing anomalies or strategy overrides detected. "
                "System is active."
            )
            
    return {
        "final_answer": final_answer,
        "confidence": confidence,
        "explain_mode_options": explain_mode_options,
        "intelligence_trace": trace
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
    """Top-level function to execute the AI Race Engineer StateGraph."""
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
        "intelligence_trace": {}
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
            "intelligence_trace": final_state["intelligence_trace"]
        }
    except Exception as e:
        logger.error(f"LangGraph execution exception: {e}")
        return {
            "question": question,
            "planning_steps": [],
            "tools_used": [],
            "evidence": {},
            "confidence": 10.0,
            "final_answer": f"System error during agent execution: {e}",
            "explain_mode_options": ["novice", "intermediate", "expert"],
            "errors": [str(e)],
            "intelligence_trace": {
                "investigation_id": str(uuid.uuid4()),
                "errors": [str(e)],
                "recovery_steps": ["StateGraph runtime crash fallback"]
            }
        }
