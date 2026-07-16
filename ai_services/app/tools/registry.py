from abc import ABC, abstractmethod
from typing import Dict, Any, List
import re
from app.core.logger import logger

class BaseF1Tool(ABC):
    """Abstract Base Class for all FrontWing F1 tools."""
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Unique identifier of the tool."""
        pass
        
    @property
    @abstractmethod
    def description(self) -> str:
        """Detailed explanation of what the tool does, used by the planner for routing."""
        pass
        
    @property
    @abstractmethod
    def input_schema(self) -> Dict[str, Any]:
        """Description of the input parameters required by the tool."""
        pass
        
    @abstractmethod
    def execute(self, inputs: Dict[str, Any]) -> Any:
        """Executes the tool with the provided arguments.
        
        Args:
            inputs: Dictionary containing input parameters matching the schema.
            
        Returns:
            The output/evidence from the tool.
        """
        pass

    def validate_and_execute(self, inputs: Dict[str, Any], question: str = "") -> Any:
        """Validates input payload properties, infers missing required parameters, and executes the tool safely."""
        schema = self.input_schema
        required = schema.get("required", [])
        
        # Fill missing required parameters
        for req_param in required:
            if req_param not in inputs or inputs[req_param] is None:
                inferred_val = self.infer_parameter(req_param, inputs, question)
                logger.info(f"[Tool Parameter Inference] Tool '{self.name}' inferred missing required parameter '{req_param}' = '{inferred_val}'")
                inputs[req_param] = inferred_val
                
        # Validate types according to schema properties
        properties = schema.get("properties", {})
        for k, v in list(inputs.items()):
            if k in properties:
                prop_type = properties[k].get("type")
                if prop_type == "integer" and not isinstance(v, int):
                    try:
                        inputs[k] = int(v)
                    except (ValueError, TypeError):
                        inputs[k] = 1 # fallback integer
                elif prop_type == "string" and not isinstance(v, str):
                    inputs[k] = str(v)
                    
        return self.execute(inputs)

    def infer_parameter(self, param_name: str, inputs: Dict[str, Any], question: str = "") -> Any:
        """Infers missing required parameters using contextual hints and database checks."""
        q_lower = question.lower()
        
        if param_name == "session_id":
            # Attempt to resolve latest session from the database
            try:
                from app.core.db import execute_query
                res = execute_query("SELECT id FROM sessions ORDER BY date DESC, start_time DESC LIMIT 1", fetch=True)
                if res:
                    return res[0]["id"]
            except Exception:
                pass
            return "2026_monaco_gp_race"
            
        elif param_name == "driver_id":
            drivers_map = {
                "leclerc": ["leclerc", "charles", "lec"],
                "verstappen": ["verstappen", "max", "ves"],
                "norris": ["norris", "lando", "nor"],
                "hamilton": ["hamilton", "lewis", "ham"],
                "sainz": ["sainz", "carlos"]
            }
            for drv, aliases in drivers_map.items():
                if any(alias in q_lower for alias in aliases):
                    return drv
            return "leclerc"
            
        elif param_name == "lap_number":
            match = re.search(r"\blap\s+(\d+)\b", q_lower)
            if match:
                return int(match.group(1))
            return 42
            
        elif param_name == "simulated_pit_lap":
            match = re.search(r"\blap\s+(\d+)\b", q_lower)
            if match:
                return int(match.group(1))
            return 20
            
        elif param_name == "term":
            for term in ["CAR", "SPG", "TSE"]:
                if term.lower() in q_lower:
                    return term
            return "CAR"
            
        elif param_name in ["query", "sql_query"]:
            return question if question else "Formula 1"
            
        return "unknown"


class ToolRegistry:
    """Registry that registers and retrieves all F1 tools."""
    
    def __init__(self):
        self._tools: Dict[str, BaseF1Tool] = {}
        
    def register(self, tool: BaseF1Tool) -> None:
        """Registers a tool in the registry."""
        if tool.name in self._tools:
            raise ValueError(f"Tool with name '{tool.name}' is already registered.")
        self._tools[tool.name] = tool
        
    def get_tool(self, name: str) -> BaseF1Tool:
        """Retrieves a registered tool by its name."""
        if name not in self._tools:
            raise KeyError(f"Tool with name '{name}' is not registered.")
        return self._tools[name]
        
    def list_tools(self) -> List[BaseF1Tool]:
        """Returns a list of all registered tools."""
        return list(self._tools.values())


# Global instance of the tool registry
tool_registry = ToolRegistry()

# Trigger side-effect tool registrations dynamically
try:
    import app.tools.adapters
except ImportError:
    pass
