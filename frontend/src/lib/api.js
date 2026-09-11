const getBackendUrl = () => {
  return import.meta.env?.VITE_API_URL || "http://localhost:5000";
};
const getAuthHeaders = () => {
  const token = localStorage.getItem("frontwing_token");
  const headers = {
    "Content-Type": "application/json"
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};
export async function submitEngineerQuery(question, conversationId, signal, context = {}) {
  const backendUrl = getBackendUrl();
  console.log(`[API Client] Submitting query to gateway: ${backendUrl}/engineer/query`, { question, conversationId, context });
  try {
    const response = await fetch(`${backendUrl}/engineer/query`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        question,
        conversation_id: conversationId,
        session_id: context.session_id,
        driver_id: context.driver_id,
        grand_prix: context.grand_prix,
        season: context.season,
        drivers: context.drivers,
        context: context
      }),
      signal
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error(`[API Client] AI Gateway Error details: ${errText}`);
      if (errText.includes("No timing data") || errText.includes("Telemetry for this session")) {
        throw new Error("Telemetry for this session has not been ingested yet.");
      }
      if (errText.includes("rate limit") || errText.includes("429")) {
        throw new Error("Rate limit exceeded");
      }
      throw new Error("An error occurred while communicating with the AI Race Engineer. Please try again.");
    }
    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }
    if (error.message === "Telemetry for this session has not been ingested yet." || error.message === "An error occurred while communicating with the AI Race Engineer. Please try again." || error.message === "Rate limit exceeded") {
      throw error;
    }
    console.error(`[API Client] Query exception:`, error);
    const msg = error.message || "";
    if (msg.includes("No timing data") || msg.includes("Telemetry for this session")) {
      throw new Error("Telemetry for this session has not been ingested yet.");
    }
    throw new Error("An error occurred while communicating with the AI Race Engineer. Please try again.");
  }
}
export async function fetchHistory(params) {
  const backendUrl = getBackendUrl();
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  if (params?.offset) queryParams.append("offset", params.offset.toString());
  if (params?.session) queryParams.append("session", params.session);
  if (params?.search) queryParams.append("search", params.search);
  const url = `${backendUrl}/history${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    throw new Error("Failed to fetch investigation history");
  }
  return await response.json();
}
export async function fetchInvestigationById(id) {
  const backendUrl = getBackendUrl();
  const response = await fetch(`${backendUrl}/history/${id}`, {
    method: "GET",
    headers: getAuthHeaders()
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error("Failed to fetch investigation");
  }
  return await response.json();
}
export async function deleteHistory(id) {
  const backendUrl = getBackendUrl();
  const response = await fetch(`${backendUrl}/history/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
  return response.ok;
}
export async function toggleSaveInvestigation(id) {
  const backendUrl = getBackendUrl();
  const response = await fetch(`${backendUrl}/history/save/${id}`, {
    method: "POST",
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    throw new Error("Failed to toggle saved investigation");
  }
  return await response.json();
}
export async function registerUser(email, password, name) {
  const backendUrl = getBackendUrl();
  const response = await fetch(`${backendUrl}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name })
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Registration failed");
  }
  const result = await response.json();
  localStorage.setItem("frontwing_token", result.token);
  return result;
}
export async function loginUser(email, password) {
  const backendUrl = getBackendUrl();
  const response = await fetch(`${backendUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Login failed");
  }
  const result = await response.json();
  localStorage.setItem("frontwing_token", result.token);
  return result;
}
export async function getMe() {
  const backendUrl = getBackendUrl();
  const token = localStorage.getItem("frontwing_token");
  if (!token) return null;
  try {
    const response = await fetch(`${backendUrl}/auth/me`, {
      method: "GET",
      headers: getAuthHeaders()
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.user || null;
  } catch {
    return null;
  }
}

export async function fetchBackfillStatus(sessionId) {
  const backendUrl = getBackendUrl();
  try {
    const response = await fetch(`${backendUrl}/sessions/backfill-status/${encodeURIComponent(sessionId)}`, {
      method: "GET",
      headers: getAuthHeaders()
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.warn(`[API Client] Failed to fetch backfill status for ${sessionId}:`, err);
    return null;
  }
}

export async function submitStrategyQuery(question, context = {}, signal) {
  const backendUrl = getBackendUrl();
  console.log(`[API Client] Submitting strategy query: ${backendUrl}/strategy/query`, { question, context });
  try {
    const response = await fetch(`${backendUrl}/strategy/query`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        question,
        session_id: context.session_id,
        driver_id: context.driver_id,
        grand_prix: context.grand_prix,
        season: context.season,
        context: context
      }),
      signal
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error(`[API Client] Strategy Gateway Error: ${errText}`);
      throw new Error(errText || "Strategy query failed");
    }
    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") throw error;
    console.error(`[API Client] Strategy query exception:`, error);
    throw error;
  }
}


