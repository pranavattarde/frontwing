import os
import re
import traceback
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
    """Node 1: Understands the question and designs the execution plan."""
    question = state.get("question", "")
    logger.info(f"[Planner] Planning steps for question: '{question}'")
    
    plan = []
    session_id = state.get("session_id") or "2024_austria_gp_race"
    driver_id = state.get("driver_id") or "sainz"
    
    # Try calling LLM for structured planning if API key is present
    if HAS_LLM and os.getenv("GROQ_API_KEY"):
        try:
            llm = ChatGroq(model_name="llama-3.1-70b-versatile", temperature=0)
            sys_msg = (
                "You are the Lead F1 Planner Agent. Your job is to select the correct tools to answer "
                "the user's query. The available tools are:\n"
                "1. scoring_tool: session_id, driver_id\n"
                "2. simulation_tool: session_id, driver_id, simulated_pit_lap\n"
                "3. telemetry_tool: session_id, driver_id, lap_number\n"
                "4. historical_data_tool: sql_query or session_id\n"
                "5. explain_mode_tool: term\n\n"
                "Provide a list of tools to run, one per line, strictly in format: tool_name|arg1=val1,arg2=val2"
            )
            response = llm.invoke([SystemMessage(content=sys_msg), HumanMessage(content=question)])
            lines = [l.strip() for l in response.content.split("\n") if "|" in l]
            if lines:
                plan = lines
                logger.info(f"[Planner] LLM generated plan: {plan}")
        except Exception as e:
            logger.warning(f"[Planner] LLM planning failed: {e}. Falling back to deterministic planner.")

    # Rule-Based Planner Fallback (when keys are missing or LLM call fails)
    if not plan:
        q_lower = question.lower()
        if "simulate" in q_lower or "what if" in q_lower or "pit lap" in q_lower or "pitted on" in q_lower:
            # Parse simulated pit lap (e.g. "lap 20")
            lap_match = re.search(r"lap\s+(\d+)", q_lower)
            pit_lap = int(lap_match.group(1)) if lap_match else 20
            plan.append(f"simulation_tool|session_id={session_id},driver_id={driver_id},simulated_pit_lap={pit_lap}")
        elif "telemetry" in q_lower or "speed" in q_lower or "throttle" in q_lower or "brake" in q_lower:
            # Parse lap number
            lap_match = re.search(r"lap\s+(\d+)", q_lower)
            lap = int(lap_match.group(1)) if lap_match else 42
            plan.append(f"telemetry_tool|session_id={session_id},driver_id={driver_id},lap_number={lap}")
        elif "term" in q_lower or "explain" in q_lower or "definition" in q_lower or "car" in q_lower or "spg" in q_lower or "tse" in q_lower:
            term = "CAR"
            if "spg" in q_lower:
                term = "SPG"
            elif "tse" in q_lower:
                term = "TSE"
            plan.append(f"explain_mode_tool|term={term}")
        else:
            # Default to Scoring
            plan.append(f"scoring_tool|session_id={session_id},driver_id={driver_id}")
            plan.append("explain_mode_tool|term=CAR")
            
        logger.info(f"[Planner] Rule-based generated plan: {plan}")
        
    return {
        "plan": plan,
        "next_step_idx": 0,
        "tools_used": [],
        "evidence": {},
        "errors": []
    }


def execute_node(state: AgentState) -> Dict[str, Any]:
    """Node 2: Dispatches and executes the next tool in the plan."""
    idx = state["next_step_idx"]
    plan = state["plan"]
    tools_used = list(state.get("tools_used", []))
    evidence = dict(state.get("evidence", {}))
    errors = list(state.get("errors", []))
    
    current_step = plan[idx]
    logger.info(f"[Planner] Executing step {idx + 1}/{len(plan)}: '{current_step}'")
    
    # Parse tool name and arguments: e.g. "scoring_tool|session_id=x,driver_id=y"
    try:
        tool_name, raw_args = current_step.split("|")
        args_dict = {}
        for pair in raw_args.split(","):
            if "=" in pair:
                k, v = pair.split("=")
                # Convert numbers to integers if possible
                if v.isdigit():
                    args_dict[k] = int(v)
                else:
                    args_dict[k] = v
                    
        # Check registry
        tool = tool_registry.get_tool(tool_name)
        
        # Execute tool
        res = tool.execute(args_dict)
        evidence[tool_name] = res
        tools_used.append(tool_name)
        logger.info(f"[Planner] Executed tool '{tool_name}' successfully.")
        
    except Exception as e:
        # Gracefully handle failures, log, and recover to prevent crash
        tb_str = traceback.format_exc()
        error_msg = f"Tool '{current_step}' failed: {e}"
        logger.error(f"[Planner] Tool execution crash: {error_msg}\n{tb_str}")
        errors.append(error_msg)
        
    return {
        "next_step_idx": idx + 1,
        "tools_used": tools_used,
        "evidence": evidence,
        "errors": errors
    }


def should_continue(state: AgentState) -> str:
    """Decides if the LangGraph loop should execute more tools or synthesize final reply."""
    idx = state["next_step_idx"]
    plan = state["plan"]
    if idx < len(plan):
        return "execute"
    return "synthesize"


def synthesize_node(state: AgentState) -> Dict[str, Any]:
    """Node 3: Consolidates evidence and structures the final Race Engineer response."""
    question = state["question"]
    tools_used = state.get("tools_used", [])
    evidence = state.get("evidence", {})
    errors = state.get("errors", [])
    
    logger.info(f"[Planner] Synthesizing final answer based on {len(tools_used)} executed tools")
    
    # Calculate confidence dynamically
    # Start at 95% and deduct 15% for each failed tool step
    confidence = 95.0 - (len(errors) * 15.0)
    confidence = max(10.0, confidence)
    
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
        # Check if simulation was run
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
        # Check if scoring was run
        elif "scoring_tool" in evidence:
            scores = evidence["scoring_tool"]
            final_answer = (
                f"Completed intelligence scoring check for driver. Composite performance grade is {scores['composite_score']}/100. "
                f"Stint Strategy is rated {scores['strategy_score']}/100, and Tire Management is rated {scores['tire_score']}/100."
            )
        # Check if telemetry was run
        elif "telemetry_tool" in evidence:
            tel = evidence["telemetry_tool"]
            final_answer = (
                f"Retrieved {tel['telemetry_points_count']} telemetry coordinates aligned by track distance metric bins. "
                f"Clean speed profile is loaded successfully for driver."
            )
        # Check if explain was run
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
            
    # Include default progressive disclosure options
    return {
        "final_answer": final_answer,
        "confidence": confidence,
        "explain_mode_options": explain_mode_options
    }

# =====================================================================
# StateGraph Compilation
# =====================================================================

workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("plan", plan_node)
workflow.add_node("execute", execute_node)
workflow.add_node("synthesize", synthesize_node)

# Set entry point
workflow.set_entry_point("plan")

# Set conditional edge loop
workflow.add_conditional_edges(
    "execute",
    should_continue,
    {
        "execute": "execute",
        "synthesize": "synthesize"
    }
)

# Connect planning node directly to execution node loop
workflow.add_edge("plan", "execute")
workflow.add_edge("synthesize", END)

# Compile graph
compiled_graph = workflow.compile()


def run_ai_race_engineer(question: str, session_id: Optional[str] = None, driver_id: Optional[str] = None) -> Dict[str, Any]:
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
        "errors": []
    }
    
    # Run graph
    try:
        final_state = compiled_graph.invoke(initial_state)
        # Keep response structured exactly as defined
        return {
            "question": final_state["question"],
            "planning_steps": final_state["plan"],
            "tools_used": final_state["tools_used"],
            "evidence": final_state["evidence"],
            "confidence": final_state["confidence"],
            "final_answer": final_state["final_answer"],
            "explain_mode_options": final_state["explain_mode_options"],
            "errors": final_state["errors"]
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
            "errors": [str(e)]
        }
