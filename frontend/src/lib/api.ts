/**
 * FrontWing Frontend API Client
 */

export interface AIResponse {
  question: string;
  planning_steps: string[];
  tools_used: string[];
  evidence: Record<string, any>;
  confidence: number;
  final_answer: string;
  explain_mode_options: string[];
  errors: string[];
  investigation_report?: {
    "Executive Summary"?: string;
    "Evidence"?: string[];
    "Telemetry Findings"?: string;
    "Simulation Findings"?: string;
    "Historical Findings"?: string;
    "Alternative Scenarios"?: string;
    "Final Recommendation"?: string;
    "Confidence"?: number;
  };
  intelligence_trace?: Record<string, any>;
  streaming_events?: any[];
  explanations?: Record<string, string>;
}

export async function submitEngineerQuery(question: string, conversationId?: string): Promise<AIResponse> {
  const backendUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
  console.log(`[API Client] Submitting query to gateway: ${backendUrl}/engineer/query`, { question, conversationId });
  
  try {
    const response = await fetch(`${backendUrl}/engineer/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        conversation_id: conversationId
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[API Client] AI Gateway Error details: ${errText}`);
      
      // Map simulation/timing data missing error
      if (
        errText.includes("No timing data") || 
        errText.includes("Telemetry for this session")
      ) {
        throw new Error("Telemetry for this session has not been ingested yet.");
      }
      
      // Do not expose other backend exceptions directly to users
      throw new Error("An error occurred while communicating with the AI Race Engineer. Please try again.");
    }

    return await response.json();
  } catch (error: any) {
    // If it's already one of our user-friendly errors, rethrow it
    if (
      error.message === "Telemetry for this session has not been ingested yet." ||
      error.message === "An error occurred while communicating with the AI Race Engineer. Please try again."
    ) {
      throw error;
    }
    
    console.error(`[API Client] Query exception:`, error);
    
    // Check error message content for timing data issues
    const msg = error.message || '';
    if (
      msg.includes("No timing data") || 
      msg.includes("Telemetry for this session")
    ) {
      throw new Error("Telemetry for this session has not been ingested yet.");
    }
    
    throw new Error("An error occurred while communicating with the AI Race Engineer. Please try again.");
  }
}
