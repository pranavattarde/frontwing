from typing import TypedDict, List, Dict, Any, Optional

class AgentState(TypedDict):
    """Strongly typed shared state for the AI Race Engineer Planner Agent.
    
    Tracks inputs, intermediate results, evidence, and errors across the LangGraph.
    """
    # Inputs
    question: str
    session_id: Optional[str]
    driver_id: Optional[str]
    
    # Plan & Execution Tracker
    plan: List[str]
    tools_used: List[str]
    next_step_idx: int
    
    # Evidence gathered from tools
    evidence: Dict[str, Any]
    
    # Outputs to user
    final_answer: str
    confidence: float
    explain_mode_options: List[str]
    
    # Error log & warnings
    errors: List[str]
