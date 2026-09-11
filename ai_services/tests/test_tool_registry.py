"""
test_tool_registry.py
Tests the tool registry, tool input schema validation, parameter inference,
explain mode mathematical definitions, and modular knowledge RAG retrieval.
"""
import pytest
from app.tools.registry import tool_registry
from app.tools.adapters import ExplainModeTool, KnowledgeTool
from app.agents.knowledge import rag_knowledge
from app.agents.personas import (
    ChiefRaceEngineer,
    StrategyEngineer,
    TelemetryEngineer,
    InvestigationEngineer,
    JudgeEngineer,
    ReflectionEngineer,
    ExplainEngineer
)


def test_tool_registry_retrieval():
    """Verifies all required tools are registered and retrievable by name."""
    required = [
        "scoring_tool",
        "simulation_tool",
        "telemetry_tool",
        "race_results_tool",
        "explain_mode_tool",
        "knowledge_tool"
    ]
    for name in required:
        tool = tool_registry.get_tool(name)
        assert tool.name == name
        assert len(tool.description) > 0


def test_unregistered_tool_raises_key_error():
    """Getting an unregistered tool must raise KeyError."""
    with pytest.raises(KeyError):
        tool_registry.get_tool("non_existent_fake_tool_99")


def test_missing_required_param_returns_missing_data():
    """Executing a tool with missing required parameters returns status='missing_data'."""
    scoring = tool_registry.get_tool("scoring_tool")
    res = scoring.validate_and_execute({}, question="What is DRS?")
    assert isinstance(res, dict)
    assert res.get("status") == "missing_data"


def test_explain_mode_tool_definitions():
    """Verifies ExplainModeTool returns structured math definitions."""
    tool = tool_registry.get_tool("explain_mode_tool")
    res = tool.execute({"term": "CAR", "target_audience": "novice"})
    assert res["term"] == "CAR"
    assert res["name"] == "Clean Air Ratio"
    assert "percent" in res["explanation"].lower()


def test_knowledge_rag_retrieval():
    """Verifies semantic keyword RAG retrieval finds Sporting Regulations and Circuit Notes."""
    rules = rag_knowledge.retrieve("Article 40.8 safety car")
    assert len(rules) > 0
    assert rules[0]["source"] == "FIA Sporting Regulations"

    notes = rag_knowledge.retrieve("Spielberg uphill Turn 3 wind")
    assert len(notes) > 0
    assert notes[0]["source"] == "Circuit Notes"


def test_engineer_personas_conformance():
    """Verifies all engineer persona objects conform to name and role interface contracts."""
    chief = ChiefRaceEngineer()
    assert chief.name == "Chief Race Engineer"
    assert chief.role == "orchestration"

    strategy = StrategyEngineer()
    assert strategy.name == "Strategy Engineer"
    assert strategy.role == "strategy_simulation"

    telemetry = TelemetryEngineer()
    assert telemetry.name == "Telemetry Engineer"

    investigation = InvestigationEngineer()
    assert investigation.name == "Investigation Engineer"

    judge = JudgeEngineer()
    assert judge.name == "Judge Engineer"

    reflect = ReflectionEngineer()
    assert reflect.name == "Reflection Engineer"

    explain = ExplainEngineer()
    assert explain.name == "Explain Engineer"
