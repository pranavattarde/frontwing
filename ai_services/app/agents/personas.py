from abc import ABC, abstractmethod
from typing import Dict, Any, List
from app.tools.registry import tool_registry
from app.agents.knowledge import rag_knowledge
from app.prompts.loader import load_prompt
from app.core.logger import logger

class BaseEngineer(ABC):
    """Abstract base class representing an F1 specialized agent engineer persona."""
    
    @property
    @abstractmethod
    def role(self) -> str:
        """The F1 engineering role played by this engineer."""
        pass
        
    @property
    @abstractmethod
    def name(self) -> str:
        """The user-facing title of this engineer."""
        pass
        
    @abstractmethod
    def execute(self, state: Dict[str, Any], tool_inputs: Dict[str, Any]) -> Any:
        """Executes targeted domain-specific tools or analyses, allowing engineer collaboration.
        
        Args:
            state: The current agent state context (can be updated for collaboration traces).
            tool_inputs: Arguments passed to the target tool.
            
        Returns:
            The output evidence or grade computed by the engineer.
        """
        pass


class ChiefRaceEngineer(BaseEngineer):
    @property
    def role(self) -> str:
        return "orchestration"
        
    @property
    def name(self) -> str:
        return "Chief Race Engineer"
        
    def execute(self, state: Dict[str, Any], tool_inputs: Dict[str, Any]) -> Any:
        # Chief coordinates other engineers based on question intent
        # For trace/validation, Chief can invoke Telemetry or Strategy Engineers
        logger_call = {"status": "active", "note": "Chief coordinating executing engineers."}
        return logger_call


class StrategyEngineer(BaseEngineer):
    @property
    def role(self) -> str:
        return "strategy_simulation"
        
    @property
    def name(self) -> str:
        return "Strategy Engineer"
        
    def execute(self, state: Dict[str, Any], tool_inputs: Dict[str, Any]) -> Any:
        # Strategy Engineer can collaborate with Knowledge Engineer to check track rules/notes
        if "collaboration_graph" in state:
            state["collaboration_graph"].append([self.name, "Knowledge Engineer"])
            
        knowledge_eng = engineer_registry.get_engineer("Knowledge Engineer")
        knowledge_eng.execute(state, {"query": "tyre strategy wear"})
        
        tool = tool_registry.get_tool("simulation_tool")
        return tool.execute(tool_inputs)


class TelemetryEngineer(BaseEngineer):
    @property
    def role(self) -> str:
        return "telemetry_alignment"
        
    @property
    def name(self) -> str:
        return "Telemetry Engineer"
        
    def execute(self, state: Dict[str, Any], tool_inputs: Dict[str, Any]) -> Any:
        # Telemetry Engineer collaborates with Knowledge Engineer to fetch circuit curves notes
        if "collaboration_graph" in state:
            state["collaboration_graph"].append([self.name, "Knowledge Engineer"])
            
        knowledge_eng = engineer_registry.get_engineer("Knowledge Engineer")
        knowledge_eng.execute(state, {"query": "Spielberg lockup wind"})
        
        tool = tool_registry.get_tool("telemetry_tool")
        return tool.execute(tool_inputs)


class InvestigationEngineer(BaseEngineer):
    @property
    def role(self) -> str:
        return "root_cause_analysis"
        
    @property
    def name(self) -> str:
        return "Investigation Engineer"
        
    def execute(self, state: Dict[str, Any], tool_inputs: Dict[str, Any]) -> Any:
        # Load external prompt instruction dynamically
        prompt = load_prompt("investigation")
        logger.info(f"[Investigation Engineer] Loaded dynamic prompt rules: '{prompt[:40]}...'")
        
        # Investigation Engineer collaborates with Telemetry Engineer and Knowledge Engineer
        if "collaboration_graph" in state:
            state["collaboration_graph"].append([self.name, "Knowledge Engineer"])
            
        knowledge_eng = engineer_registry.get_engineer("Knowledge Engineer")
        knowledge_eng.execute(state, {"query": "2024 Austrian GP Sainz recovery"})
        
        tool = tool_registry.get_tool("scoring_tool")
        return tool.execute(tool_inputs)


class KnowledgeEngineer(BaseEngineer):
    @property
    def role(self) -> str:
        return "rag_reference"
        
    @property
    def name(self) -> str:
        return "Knowledge Engineer"
        
    def execute(self, state: Dict[str, Any], tool_inputs: Dict[str, Any]) -> Any:
        # RAG query lookup
        query = tool_inputs.get("query", "")
        references = rag_knowledge.retrieve(query)
        return {
            "status": "success",
            "query": query,
            "references": references
        }


class JudgeEngineer(BaseEngineer):
    @property
    def role(self) -> str:
        return "factual_validation"
        
    @property
    def name(self) -> str:
        return "Judge Engineer"
        
    def execute(self, state: Dict[str, Any], tool_inputs: Dict[str, Any]) -> Any:
        return {"status": "active", "grading": "Evaluating evidence completeness criteria."}


class ReflectionEngineer(BaseEngineer):
    @property
    def role(self) -> str:
        return "self_evaluation"
        
    @property
    def name(self) -> str:
        return "Reflection Engineer"
        
    def execute(self, state: Dict[str, Any], tool_inputs: Dict[str, Any]) -> Any:
        return {"status": "active", "reflection": "Analyzing telemetry loop agreements."}


class ExplainEngineer(BaseEngineer):
    @property
    def role(self) -> str:
        return "term_explanation"
        
    @property
    def name(self) -> str:
        return "Explain Engineer"
        
    def execute(self, state: Dict[str, Any], tool_inputs: Dict[str, Any]) -> Any:
        # Load external prompt dynamically
        prompt = load_prompt("explain")
        logger.info(f"[Explain Engineer] Loaded dynamic prompt rules: '{prompt[:40]}...'")
        evidence = state.get("evidence", {})
        
        # Beginner, Intermediate, and Engineer (expert) versions from the same evidence
        beginner_parts = []
        intermediate_parts = []
        engineer_parts = []
        
        if "simulation_tool" in evidence:
            sim = evidence["simulation_tool"]
            pos_diff = sim.get("position_change", 0)
            gain_sec = sim.get("simulated_net_time_gain_ms", 0) / 1000.0
            
            beginner_parts.append(
                f"We ran a strategy projection. Changing the tyre stop timing could gain or lose positions. "
                f"Pitting on Lap {sim.get('simulated_pit_lap')} results in P{sim.get('projected_finishing_position')} finishing."
            )
            intermediate_parts.append(
                f"A strategy playground simulation shows pitting on lap {sim.get('simulated_pit_lap')} yields a projected "
                f"gain of {pos_diff} position(s) with a net time delta of {gain_sec:+.3f}s."
            )
            engineer_parts.append(
                f"Strategic projection of lap {sim.get('simulated_pit_lap')} pit window outputs P{sim.get('projected_finishing_position')} "
                f"finishing placement. Net simulated duration delta is {gain_sec:+.3f}s with pit loss of {sim['run_parameters']['pit_loss']}s."
            )
            
        if "scoring_tool" in evidence:
            scores = evidence["scoring_tool"]
            composite = scores.get("composite_score", 0.0)
            
            beginner_parts.append(
                f"The driver's overall race score is {composite} out of 100."
            )
            intermediate_parts.append(
                f"Driver debrief index computes composite grade at {composite}/100, including stint strategy score {scores.get('strategy_score', 0.0)}/100."
            )
            engineer_parts.append(
                f"Composite performance metric isolates grade at {composite}/100 (CAR {scores.get('strategy_score', 0.0)}/100, "
                f"tire management {scores.get('tire_score', 0.0)}/100, pit lane LF factors {scores.get('pitstop_score', 0.0)}/100)."
            )
            
        if "explain_mode_tool" in evidence:
            exp = evidence["explain_mode_tool"]
            beginner_parts.append(f"Definition of {exp.get('term')}: {exp.get('explanation')}")
            intermediate_parts.append(f"Formula index {exp.get('term')}: {exp.get('formula')}. Explanation: {exp.get('explanation')}")
            engineer_parts.append(f"Mathematical definition for F1 term {exp.get('term')}: {exp.get('formula')} (progressive audience: expert context).")
            
        if not beginner_parts:
            # Fallback when empty evidence
            beginner_parts.append("System is active. F1 investigation report is ready.")
            intermediate_parts.append("No active scoring or strategy simulation data was parsed. Composite references are offline.")
            engineer_parts.append("Status log: null execution evidence. Graph nodes yielded zero score variations.")
            
        return {
            "beginner": " ".join(beginner_parts),
            "intermediate": " ".join(intermediate_parts),
            "engineer": " ".join(engineer_parts)
        }


class ResearchEngineer(BaseEngineer):
    @property
    def role(self) -> str:
        return "modular_rag_retrieval"
        
    @property
    def name(self) -> str:
        return "Research Engineer"
        
    def execute(self, state: Dict[str, Any], tool_inputs: Dict[str, Any]) -> Any:
        prompt = load_prompt("research")
        logger.info(f"[Research Engineer] Loaded dynamic prompt rules: '{prompt[:40]}...'")
        query = tool_inputs.get("query", "")
        references = rag_knowledge.retrieve(query)
        return {
            "status": "success",
            "query": query,
            "references": references
        }


# =====================================================================
# 3. Engineer Registry
# =====================================================================

class EngineerRegistry:
    def __init__(self):
        self._engineers: Dict[str, BaseEngineer] = {}
        
    def register(self, engineer: BaseEngineer) -> None:
        self._engineers[engineer.name] = engineer
        
    def get_engineer(self, name: str) -> BaseEngineer:
        if name not in self._engineers:
            raise KeyError(f"Engineer persona with name '{name}' is not registered.")
        return self._engineers[name]


# Global Registry Instance
engineer_registry = EngineerRegistry()
engineer_registry.register(ChiefRaceEngineer())
engineer_registry.register(StrategyEngineer())
engineer_registry.register(TelemetryEngineer())
engineer_registry.register(InvestigationEngineer())
engineer_registry.register(KnowledgeEngineer())
engineer_registry.register(JudgeEngineer())
engineer_registry.register(ReflectionEngineer())
engineer_registry.register(ExplainEngineer())
engineer_registry.register(ResearchEngineer())

