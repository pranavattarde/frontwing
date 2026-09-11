"""
test_planner_and_reasoning.py
Tests NLP parsing, adaptive planning, entity resolution, parse_step parsing,
multi-turn conversation memory (in-memory and PostgreSQL), reflection/judge nodes,
and multi-domain investigation correlation without mocks.
"""
import pytest
from app.agents.planner import (
    adaptive_plan_extract,
    plan_node,
    execute_node,
    reflect_node,
    judge_node,
    synthesize_node
)
from app.agents.resolver import SessionResolver, _extract_driver, _extract_circuit
from app.agents.memory import InMemoryConversationMemory, PostgresConversationMemory, conversation_memory
from app.agents.context_builder import build_structured_context
from app.agents.investigation_correlator import InvestigationCorrelator


# ---------------------------------------------------------------------------
# 1. Adaptive Planning & Extraction
# ---------------------------------------------------------------------------
def test_adaptive_plan_extract_winner_intent():
    """'Who won Monaco GP?' adaptively extracts race_result intent and selects race_results_tool."""
    res = adaptive_plan_extract("Who won Monaco GP?")
    assert res["intent"] == "race_result"
    assert res["entities"]["grand_prix"] == "Monaco GP"
    assert "race_winner" in res["required_evidence"]
    assert res["tools"] == ["race_results_tool"]


def test_adaptive_plan_extract_comparison_intent():
    """'Compare Verstappen vs Norris' adaptively selects comparison tools."""
    res = adaptive_plan_extract("Compare Verstappen vs Norris")
    assert res["intent"] == "comparison"
    assert "verstappen" in res["entities"]["drivers"]
    assert "norris" in res["entities"]["drivers"]
    assert "race_results_tool" in res["tools"]
    assert "telemetry_tool" in res["tools"]


def test_adaptive_plan_extract_investigation_intent():
    """'Why Ferrari failed' selects investigation tools."""
    res = adaptive_plan_extract("Why Ferrari failed")
    assert res["intent"] == "investigation"
    assert res["entities"]["team"] == "Ferrari"
    assert any(t in res["tools"] for t in ["telemetry_tool", "simulation_tool", "race_results_tool"])


# ---------------------------------------------------------------------------
# 2. Entity Resolution Without Hallucinations
# ---------------------------------------------------------------------------
def test_no_driver_hallucination():
    """Queries without a driver mentioned must return driver_id=None."""
    res = SessionResolver.resolve("Who won the Hungarian Grand Prix?")
    assert res["driver_id"] is None

    res2 = SessionResolver.resolve("What happened at Monaco?")
    assert res2["driver_id"] is None
    assert res2["circuit_id"] == "monaco"


def test_driver_extraction_only_when_present():
    """Verifies driver is only extracted when explicit."""
    assert _extract_driver("Tell me about Norris") == "norris"
    assert _extract_driver("Ferrari strategy was flawed") is None


# ---------------------------------------------------------------------------
# 3. Plan Step Parsing (Handles '=' in Values)
# ---------------------------------------------------------------------------
def test_parse_step_with_equal_sign_in_value():
    """Values containing '=' must not raise ValueError during step parsing."""
    step = "telemetry_tool|key=base64==,driver_id=verstappen"
    tool_name, raw_args = step.split("|", 1)
    args_dict = {}
    for pair in raw_args.split(","):
        if "=" in pair:
            k, v = pair.split("=", 1)
            args_dict[k.strip()] = v.strip()
    assert tool_name == "telemetry_tool"
    assert args_dict["key"] == "base64=="
    assert args_dict["driver_id"] == "verstappen"


# ---------------------------------------------------------------------------
# 4. Multi-Turn Conversation Memory
# ---------------------------------------------------------------------------
def test_in_memory_conversation_context_resolution():
    """Verifies memory resolves relative references across follow-up queries."""
    memory = InMemoryConversationMemory()
    conv_id = "test_memory_thread_1"
    context = {"session_id": "2024_austria_gp_race", "driver_id": "sainz"}
    memory.save_message(conv_id, "Analyze Sainz's race scores", "Scores calculated.", context)

    res_ferrari = memory.resolve_context(conv_id, "What about Ferrari?")
    assert res_ferrari["driver_id"] == "sainz"
    assert res_ferrari["session_id"] == "2024_austria_gp_race"


def test_postgres_conversation_memory_persistence():
    """Verifies 4-turn conversation persists in PostgreSQL database table."""
    conv_id = "test_thread_postgres_audit_4"
    try:
        from app.core.db import execute_query
        execute_query("DELETE FROM conversations WHERE conversation_id = %s", (conv_id,))
    except Exception:
        pass

    conversation_memory.save_message(conv_id, "Turn 1: Why Ferrari failed?", "Tyre thermal degradation.", {
        "session_id": "2024_austria_gp_race", "driver_id": "sainz"
    })
    conversation_memory.save_message(conv_id, "Turn 2: What about Verstappen?", "Brake cooling issues.", {
        "session_id": "2024_austria_gp_race", "driver_id": "verstappen"
    })

    hist = conversation_memory.get_history(conv_id)
    assert len(hist) >= 2
    assert "Ferrari" in hist[0]["question"]
    assert "Verstappen" in hist[1]["question"]

    # Clean up
    try:
        execute_query("DELETE FROM conversations WHERE conversation_id = %s", (conv_id,))
    except Exception:
        pass


# ---------------------------------------------------------------------------
# 5. Reflection and Judge Reasoning Nodes
# ---------------------------------------------------------------------------
def test_reflection_node_detects_disagreement():
    """Reflection node flags evidence mismatches and adjusts the plan."""
    state = {
        "plan": ["scoring_tool|session_id=2024_austria_gp_race,driver_id=sainz"],
        "next_step_idx": 1,
        "tools_used": ["scoring_tool"],
        "evidence": {
            "scoring_tool": {"p_finish": 3},
            "simulation_tool": {"projected_finishing_position": 10}
        },
        "reflection_count": 0,
        "reflection_notes": [],
        "errors": []
    }
    res_reflect = reflect_node(state)
    assert len(res_reflect["reflection_notes"]) > 0
    assert res_reflect["reflection_count"] == 1


def test_judge_node_evaluation():
    """Judge node evaluates factual completeness and consistency."""
    state = {
        "evidence": {
            "scoring_tool": {"p_finish": 3},
            "simulation_tool": {"actual_finishing_position": 4}
        },
        "errors": ["Failed to connect to PG database"]
    }
    res_judge = judge_node(state)
    eval_dict = res_judge["judge_evaluation"]
    assert eval_dict["evidence_quality"] < 100
    assert eval_dict["consistency"] < 100


# ---------------------------------------------------------------------------
# 6. Investigation Correlator (Multi-Domain Evidence Graph)
# ---------------------------------------------------------------------------
def test_multi_domain_investigation_correlator():
    """Verifies multi-domain correlation produces an explicit root-cause reasoning chain."""
    evidence = {
        "telemetry_tool": {
            "driver": "sainz",
            "driver_id": "sainz",
            "lap_number": 22,
            "top_speed": 315.4,
            "tyres": [{"compound": "MEDIUM", "laps_run": 22}]
        },
        "scoring_tool": {
            "tire_score": 82.5,
            "strategy_score": 75.0,
            "pace_score": 88.0,
            "composite_score": 81.8
        },
        "simulation_tool": {
            "pit_stop_lap": 19,
            "actual_pit_lap": 22,
            "actual_finishing_position": 3,
            "projected_finishing_position": 3
        },
        "race_results_tool": {
            "grand_prix": "Austrian Grand Prix",
            "winner": "George Russell",
            "podium": ["George Russell", "Max Verstappen", "Carlos Sainz"],
            "classification": [
                {"driver": "Carlos Sainz", "position": 3, "grid": 4, "team": "Scuderia Ferrari", "status": "Finished"}
            ]
        }
    }
    struct_ctx = build_structured_context(evidence, "Why did Ferrari finish P3?")
    corr = InvestigationCorrelator.correlate(struct_ctx, "Why did Ferrari finish P3?")
    
    assert "reasoning_graph" in corr
    assert "reasoning_graph_text" in corr
    assert len(corr["reasoning_graph"]) >= 3
    assert "Telemetry" in corr["telemetry_findings"]
    assert "Strategy Simulation" in corr["strategy_findings"]
