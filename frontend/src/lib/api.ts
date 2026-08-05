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

export interface InvestigationHistoryItem {
  id: string;
  user_id?: string | null;
  question: string;
  ai_response: AIResponse;
  session?: string | null;
  timestamp: string | Date;
  provider_used: string;
  investigation_metadata?: any;
  created_at: string | Date;
  is_saved?: boolean;
}

export interface UserPayload {
  id: string;
  email: string;
  name?: string | null;
}

export interface AuthResponse {
  token: string;
  user: UserPayload;
}

const getBackendUrl = (): string => {
  return (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
};

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('frontwing_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export async function submitEngineerQuery(
  question: string,
  conversationId?: string,
  signal?: AbortSignal
): Promise<AIResponse> {
  const backendUrl = getBackendUrl();
  console.log(`[API Client] Submitting query to gateway: ${backendUrl}/engineer/query`, { question, conversationId });
  
  try {
    const response = await fetch(`${backendUrl}/engineer/query`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        question,
        conversation_id: conversationId
      }),
      signal
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[API Client] AI Gateway Error details: ${errText}`);
      
      if (
        errText.includes("No timing data") || 
        errText.includes("Telemetry for this session")
      ) {
        throw new Error("Telemetry for this session has not been ingested yet.");
      }
      
      if (errText.includes("rate limit") || errText.includes("429")) {
        throw new Error("Rate limit exceeded");
      }
      
      throw new Error("An error occurred while communicating with the AI Race Engineer. Please try again.");
    }

    return await response.json();
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw error;
    }
    if (
      error.message === "Telemetry for this session has not been ingested yet." ||
      error.message === "An error occurred while communicating with the AI Race Engineer. Please try again." ||
      error.message === "Rate limit exceeded"
    ) {
      throw error;
    }
    
    console.error(`[API Client] Query exception:`, error);
    
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

/**
 * Fetch Investigation History from backend
 */
export async function fetchHistory(params?: {
  limit?: number;
  offset?: number;
  session?: string;
  search?: string;
}): Promise<{ investigations: InvestigationHistoryItem[]; total: number }> {
  const backendUrl = getBackendUrl();
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());
  if (params?.session) queryParams.append('session', params.session);
  if (params?.search) queryParams.append('search', params.search);

  const url = `${backendUrl}/history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch investigation history');
  }

  return await response.json();
}

/**
 * Fetch a specific investigation by ID
 */
export async function fetchInvestigationById(id: string): Promise<InvestigationHistoryItem | null> {
  const backendUrl = getBackendUrl();
  const response = await fetch(`${backendUrl}/history/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Failed to fetch investigation');
  }

  return await response.json();
}

/**
 * Delete an investigation by ID
 */
export async function deleteHistory(id: string): Promise<boolean> {
  const backendUrl = getBackendUrl();
  const response = await fetch(`${backendUrl}/history/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  return response.ok;
}

/**
 * Toggle bookmark / save investigation
 */
export async function toggleSaveInvestigation(id: string): Promise<{ saved: boolean }> {
  const backendUrl = getBackendUrl();
  const response = await fetch(`${backendUrl}/history/save/${id}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to toggle saved investigation');
  }

  return await response.json();
}

/**
 * User Authentication: Register
 */
export async function registerUser(email: string, password: string, name?: string): Promise<AuthResponse> {
  const backendUrl = getBackendUrl();
  const response = await fetch(`${backendUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Registration failed');
  }

  const result: AuthResponse = await response.json();
  localStorage.setItem('frontwing_token', result.token);
  return result;
}

/**
 * User Authentication: Login
 */
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const backendUrl = getBackendUrl();
  const response = await fetch(`${backendUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Login failed');
  }

  const result: AuthResponse = await response.json();
  localStorage.setItem('frontwing_token', result.token);
  return result;
}

/**
 * User Authentication: Get Current User
 */
export async function getMe(): Promise<UserPayload | null> {
  const backendUrl = getBackendUrl();
  const token = localStorage.getItem('frontwing_token');
  if (!token) return null;

  try {
    const response = await fetch(`${backendUrl}/auth/me`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.user || null;
  } catch {
    return null;
  }
}
