const getBackendUrl = () => {
  return import.meta.env?.VITE_API_URL || "http://localhost:5000";
};

export const handleAuthUnauthorized = () => {
  localStorage.removeItem("frontwing_token");
  localStorage.removeItem("frontwing_user");
  window.dispatchEvent(new CustomEvent("frontwing-auth-unauthorized"));
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
    if (response.status === 401) {
      handleAuthUnauthorized();
      throw new Error("Authentication required. Please sign in to run race intelligence investigations.");
    }
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
    if (error.message.includes("Authentication required") || error.message === "Telemetry for this session has not been ingested yet." || error.message === "An error occurred while communicating with the AI Race Engineer. Please try again." || error.message === "Rate limit exceeded") {
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
  if (response.status === 401) {
    handleAuthUnauthorized();
    return { investigations: [], total: 0 };
  }
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
  if (response.status === 401) {
    handleAuthUnauthorized();
    return null;
  }
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
  if (response.status === 401) {
    handleAuthUnauthorized();
    return false;
  }
  return response.ok;
}

export async function toggleSaveInvestigation(id) {
  const backendUrl = getBackendUrl();
  const response = await fetch(`${backendUrl}/history/save/${id}`, {
    method: "POST",
    headers: getAuthHeaders()
  });
  if (response.status === 401) {
    handleAuthUnauthorized();
    throw new Error("Authentication required to save investigations");
  }
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
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Registration failed");
  }
  if (data.token) {
    localStorage.setItem("frontwing_token", data.token);
  }
  if (data.user) {
    localStorage.setItem("frontwing_user", JSON.stringify(data.user));
  }
  window.dispatchEvent(new CustomEvent("frontwing-auth-changed", { detail: data.user }));
  return data;
}

export async function loginUser(email, password) {
  const backendUrl = getBackendUrl();
  const response = await fetch(`${backendUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Login failed");
  }
  if (data.token) {
    localStorage.setItem("frontwing_token", data.token);
  }
  if (data.user) {
    localStorage.setItem("frontwing_user", JSON.stringify(data.user));
  }
  window.dispatchEvent(new CustomEvent("frontwing-auth-changed", { detail: data.user }));
  return data;
}

export function logoutUser() {
  localStorage.removeItem("frontwing_token");
  localStorage.removeItem("frontwing_user");
  window.dispatchEvent(new CustomEvent("frontwing-auth-changed", { detail: null }));
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem("frontwing_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
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
    if (response.status === 401) {
      handleAuthUnauthorized();
      return null;
    }
    if (!response.ok) return null;
    const data = await response.json();
    if (data.user) {
      localStorage.setItem("frontwing_user", JSON.stringify(data.user));
    }
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

export async function submitStrategyQuery(question, conversationId = null, context = {}, signal) {
  const backendUrl = getBackendUrl();
  console.log(`[API Client] Submitting strategy query: ${backendUrl}/strategy/query`, { question, conversationId, context });
  try {
    const response = await fetch(`${backendUrl}/strategy/query`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        question,
        conversation_id: conversationId,
        session_id: context?.session_id,
        driver_id: context?.driver_id,
        grand_prix: context?.grand_prix,
        season: context?.season,
        context: context || {}
      }),
      signal
    });
    if (response.status === 401) {
      handleAuthUnauthorized();
      throw new Error("Authentication required. Please sign in to run strategy simulations.");
    }
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

export async function fetchHeroCurrent() {
  const backendUrl = getBackendUrl();
  try {
    const response = await fetch(`${backendUrl}/api/hero/current`);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.warn("[API Client] Failed to fetch current hero content:", err);
    return null;
  }
}

export async function fetchEditorialCurrent() {
  const backendUrl = getBackendUrl();
  try {
    const response = await fetch(`${backendUrl}/api/editorial/current`);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.warn("[API Client] Failed to fetch current editorial content:", err);
    return null;
  }
}

export async function fetchGhostBattleYears() {
  const backendUrl = getBackendUrl();
  try {
    const response = await fetch(`${backendUrl}/api/ghost-battle/available-years`, {
      headers: getAuthHeaders()
    });
    if (response.status === 401) {
      handleAuthUnauthorized();
      throw new Error("Authentication required to access Ghost Battle.");
    }
    if (!response.ok) throw new Error("Failed to fetch available years");
    return await response.json();
  } catch (err) {
    console.error("[API Client] fetchGhostBattleYears failed:", err);
    throw err;
  }
}

export async function fetchGhostBattleGPs(year) {
  const backendUrl = getBackendUrl();
  try {
    const response = await fetch(`${backendUrl}/api/ghost-battle/available-gps?year=${encodeURIComponent(year)}`, {
      headers: getAuthHeaders()
    });
    if (response.status === 401) {
      handleAuthUnauthorized();
      throw new Error("Authentication required to access Ghost Battle.");
    }
    if (!response.ok) throw new Error(`Failed to fetch completed GPs for year ${year}`);
    return await response.json();
  } catch (err) {
    console.error("[API Client] fetchGhostBattleGPs failed:", err);
    throw err;
  }
}

export async function fetchGhostBattleRoster(sessionId) {
  const backendUrl = getBackendUrl();
  try {
    const response = await fetch(`${backendUrl}/api/ghost-battle/drivers-teams?session_id=${encodeURIComponent(sessionId)}`, {
      headers: getAuthHeaders()
    });
    if (response.status === 401) {
      handleAuthUnauthorized();
      throw new Error("Authentication required to access Ghost Battle.");
    }
    if (!response.ok) throw new Error(`Failed to fetch driver roster for session ${sessionId}`);
    return await response.json();
  } catch (err) {
    console.error("[API Client] fetchGhostBattleRoster failed:", err);
    throw err;
  }
}

export async function fetchGhostBattleData(sessionId, driverIds) {
  const backendUrl = getBackendUrl();
  try {
    const response = await fetch(`${backendUrl}/api/ghost-battle/data`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ session_id: sessionId, driver_ids: driverIds })
    });
    if (response.status === 401) {
      handleAuthUnauthorized();
      throw new Error("Authentication required to access Ghost Battle.");
    }
    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.message || "Failed to load Ghost Battle telemetry simulation.");
    }
    return await response.json();
  } catch (err) {
    console.error("[API Client] fetchGhostBattleData failed:", err);
    throw err;
  }
}




