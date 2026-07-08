from typing import TypedDict, List, Dict, Any, Optional

class AgentState(TypedDict):
    """Strongly typed shared state for the Chief Race Engineer state graph.
    
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

    # Conversation history context
    history: List[Dict[str, Any]]
    
    # --- SPRINT 3 UPGRADES ---
    # Structured planner output (Chief Race Engineer)
    structured_plan: Dict[str, Any] 
    # Fields: Intent, Complexity, Required Engineers, Required Tools, Execution Order, Expected Evidence, Confidence Estimate, Reasoning, Fallback Plan
    
    # Structured F1 Investigation Report
    investigation_report: Dict[str, Any]
    # Fields: Executive Summary, Evidence, Telemetry Findings, Simulation Findings, Historical Findings, Alternative Scenarios, Final Recommendation, Confidence
    
    # Reflection loop metadata (Reflection Engineer)
    reflection_count: int
    reflection_notes: List[str]
    
    # Judge evaluation metrics (Judge Engineer)
    judge_evaluation: Dict[str, Any] 
    
    # Observability Trace V2
    intelligence_trace: Dict[str, Any]
    # Fields: investigation_id, planning_graph, execution_graph, timelines, latency_statistics
