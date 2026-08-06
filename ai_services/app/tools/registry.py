from abc import ABC, abstractmethod
from typing import Dict, Any, List
import re
from app.core.logger import logger

class ToolValidationError(Exception):
    """Custom exception raised when F1 tool output validation fails."""
    pass

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

    def validate_output(self, output: Any) -> None:
        """Validates tool execution output payload structure and types."""
        # status: missing_data is always valid
        if isinstance(output, dict) and output.get("status") == "missing_data":
            return
            
        name = self.name
        if name == "scoring_tool":
            if not isinstance(output, dict):
                raise ToolValidationError("scoring_tool output must be a dictionary")
            required = ["strategy_score", "tire_score", "pace_score", "pitstop_score", "execution_score", "composite_score"]
            for r in required:
                if r not in output:
                    raise ToolValidationError(f"scoring_tool missing required field: {r}")
                val = output[r]
                if not (isinstance(val, (int, float)) or hasattr(val, "dtype")):
                    raise ToolValidationError(f"scoring_tool field {r} must be a number, got {type(val)}")
                    
        elif name in ["simulation_tool", "strategy_tool"]:
            if not isinstance(output, dict):
                raise ToolValidationError(f"{name} output must be a dictionary")
            required = ["pit_stop_lap", "compound_before", "compound_after", "traffic_loss", "undercut_gain"]
            for r in required:
                if r not in output:
                    raise ToolValidationError(f"{name} missing required field: {r}")
            if not isinstance(output["pit_stop_lap"], int):
                raise ToolValidationError(f"{name} pit_stop_lap must be an int")
            if not isinstance(output["compound_before"], str):
                raise ToolValidationError(f"{name} compound_before must be a string")
            if not isinstance(output["compound_after"], str):
                raise ToolValidationError(f"{name} compound_after must be a string")
            for f in ["traffic_loss", "undercut_gain"]:
                val = output[f]
                if not (isinstance(val, (int, float)) or hasattr(val, "dtype")):
                    raise ToolValidationError(f"{name} {f} must be a number")
                    
        elif name == "telemetry_tool":
            if not isinstance(output, dict):
                raise ToolValidationError("telemetry_tool output must be a dictionary")
            required = ["driver", "sector1_delta", "sector2_delta", "sector3_delta", "top_speed", "average_speed", "brake_events"]
            for r in required:
                if r not in output:
                    raise ToolValidationError(f"telemetry_tool missing required field: {r}")
            if not isinstance(output["driver"], str):
                raise ToolValidationError("telemetry_tool driver must be a string")
            for f in ["sector1_delta", "sector2_delta", "sector3_delta", "top_speed", "average_speed"]:
                val = output[f]
                if not (isinstance(val, (int, float)) or hasattr(val, "dtype")):
                    raise ToolValidationError(f"telemetry_tool {f} must be a number")
            if not isinstance(output["brake_events"], list):
                raise ToolValidationError("telemetry_tool brake_events must be a list")
                
        elif name == "knowledge_tool":
            if not isinstance(output, list):
                raise ToolValidationError("knowledge_tool output must be a list")
            for doc in output:
                if not isinstance(doc, dict):
                    raise ToolValidationError("knowledge_tool list elements must be dictionaries")
                required = ["title", "source", "content"]
                for r in required:
                    if r not in doc:
                        raise ToolValidationError(f"knowledge_tool document missing required field: {r}")
                    if not isinstance(doc[r], str):
                        raise ToolValidationError(f"knowledge_tool field {r} must be a string")
                        
        elif name == "investigation_tool":
            if not isinstance(output, dict):
                raise ToolValidationError("investigation_tool output must be a dictionary")
            required = ["incident", "root_causes", "evidence", "confidence"]
            for r in required:
                if r not in output:
                    raise ToolValidationError(f"investigation_tool missing required field: {r}")
            if not isinstance(output["incident"], str):
                raise ToolValidationError("investigation_tool incident must be a string")
            if not isinstance(output["root_causes"], list):
                raise ToolValidationError("investigation_tool root_causes must be a list")
            if not isinstance(output["evidence"], (list, dict, str)):
                raise ToolValidationError("investigation_tool evidence must be a list/dict/str")
            val = output["confidence"]
            if not (isinstance(val, (int, float)) or hasattr(val, "dtype")):
                raise ToolValidationError("investigation_tool confidence must be a number")
                
        elif name == "race_results_tool":
            if not isinstance(output, dict):
                raise ToolValidationError("race_results_tool output must be a dictionary")
            required = ["grand_prix", "season", "winner", "podium", "classification"]
            for r in required:
                if r not in output:
                    raise ToolValidationError(f"race_results_tool missing required field: {r}")
            if not isinstance(output["grand_prix"], str):
                raise ToolValidationError("race_results_tool grand_prix must be a string")
            if not isinstance(output["season"], int):
                raise ToolValidationError("race_results_tool season must be an int")
            if not isinstance(output["winner"], (str, dict)):
                raise ToolValidationError("race_results_tool winner must be a string/dict")
            if not isinstance(output["podium"], list):
                raise ToolValidationError("race_results_tool podium must be a list")
            if not isinstance(output["classification"], list):
                raise ToolValidationError("race_results_tool classification must be a list")
                
        elif name == "driver_database_tool":
            if not isinstance(output, dict) or "drivers" not in output or not isinstance(output["drivers"], list):
                raise ToolValidationError("driver_database_tool must return dict with list under 'drivers'")
                
        elif name == "constructor_database_tool":
            if not isinstance(output, dict) or "constructors" not in output or not isinstance(output["constructors"], list):
                raise ToolValidationError("constructor_database_tool must return dict with list under 'constructors'")
                
        elif name == "standings_tool":
            if not isinstance(output, dict):
                raise ToolValidationError("standings_tool output must be a dictionary")
            required = ["year", "standings_type", "standings"]
            for r in required:
                if r not in output:
                    raise ToolValidationError(f"standings_tool missing required field: {r}")
            if not isinstance(output["standings"], list):
                raise ToolValidationError("standings_tool standings must be a list")
                
        elif name == "historical_results_tool":
            if not isinstance(output, dict) or "historical_results" not in output or not isinstance(output["historical_results"], list):
                raise ToolValidationError("historical_results_tool must return dict with list under 'historical_results'")
                
        elif name == "explain_mode_tool":
            if not isinstance(output, dict):
                raise ToolValidationError("explain_mode_tool output must be a dictionary")
            required = ["beginner", "intermediate", "engineer"]
            for r in required:
                if r not in output:
                    raise ToolValidationError(f"explain_mode_tool missing required field: {r}")

    def print_debug_log(self, inputs: Dict[str, Any], output: Any, validation_status: str) -> None:
        """Prints diagnostic block detailing tool execution, parameter values, output payload and validity."""
        rows_returned = 1
        if isinstance(output, list):
            rows_returned = len(output)
        elif isinstance(output, dict):
            if output.get("status") == "missing_data":
                rows_returned = 0
            elif "classification" in output and isinstance(output["classification"], list):
                rows_returned = len(output["classification"])
            elif "drivers" in output and isinstance(output["drivers"], list):
                rows_returned = len(output["drivers"])
            elif "constructors" in output and isinstance(output["constructors"], list):
                rows_returned = len(output["constructors"])
            elif "standings" in output and isinstance(output["standings"], list):
                rows_returned = len(output["standings"])
            elif "historical_results" in output and isinstance(output["historical_results"], list):
                rows_returned = len(output["historical_results"])
                
        debug_block = (
            f"=========== TOOL ===========\n\n"
            f"Tool:\n{self.name}\n\n"
            f"Input:\n{inputs}\n\n"
            f"Output:\n{output}\n\n"
            f"Rows Returned:\n{rows_returned}\n\n"
            f"Validation:\n{validation_status}\n\n"
            f"============================"
        )
        print(debug_block)
        logger.info(f"\n{debug_block}")

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
        try:
            output = self.execute(inputs)
            self.validate_output(output)
            self.print_debug_log(inputs, output, "PASSED")
            return output
        except Exception as e:
            self.print_debug_log(inputs, getattr(e, "partial_output", None) or {}, "FAILED")
            raise e

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
