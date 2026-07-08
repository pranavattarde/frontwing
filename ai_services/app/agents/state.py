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

    # --- SPRINT 2 EXTENSIONS ---
    # Conversation history context
    history: List[Dict[str, Any]]
    
    # Structured planner output
    structured_plan: Dict[str, Any] # Intent, Required Tools, Execution Order, Reasoning, Expected Outputs
    
    # Reflection loop metadata
    reflection_count: int
    reflection_notes: List[str]
    
    # Judge evaluation metrics
    judge_evaluation: Dict[str, Any] # factual completeness, evidence quality, confidence, consistency
    
    # Observability layers
    intelligence_trace: Dict[str, Any]
