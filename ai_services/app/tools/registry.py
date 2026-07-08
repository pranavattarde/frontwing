from abc import ABC, abstractmethod
from typing import Dict, Any, List

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
