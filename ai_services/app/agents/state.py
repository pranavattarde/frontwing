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
    
    # Observability Trace
    intelligence_trace: Dict[str, Any]
    # Fields: investigation_id, planning_graph, execution_graph, timelines, latency_statistics

    # --- SPRINT 4 UPGRADES ---
    # Streaming events tracker
    streaming_events: List[Dict[str, Any]]
    # Collaboration trace logs
    collaboration_graph: List[List[str]] # e.g. [["Chief", "Telemetry"], ["Telemetry", "Knowledge"]]
    
    # Audience specific explanations (beginner, intermediate, engineer)
    explanations: Dict[str, str]

    # Dedicated Context Builder stage output
    structured_context: Dict[str, Any]

    # --- SPRINT NLP UPGRADE ---
    # NLP Semantic Query Understanding Contract
    semantic_contract: Dict[str, Any]

