import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BriefingHeader } from "@/components/BriefingHeader";
import { QuestionBar } from "@/components/QuestionBar";
import { VerdictBlock } from "@/components/VerdictBlock";
import { NarrativeStream } from "@/components/NarrativeStream";
import { EvidenceCard } from "@/components/EvidenceCard";
import { StrategyTimeline } from "@/components/StrategyTimeline";
import { TelemetryCard } from "@/components/TelemetryCard";
import { SimulationResult } from "@/components/SimulationResult";
import { FollowUpSuggestions } from "@/components/FollowUpSuggestions";
import { ExplanationPanel } from "@/components/ExplanationPanel";
import { AIThinkingIndicator } from "@/components/AIThinkingIndicator";
import { LapTimeGraph } from "@/components/LapTimeGraph";
import { TyreDegradationGraph } from "@/components/TyreDegradationGraph";
import { SectorComparisonGraph } from "@/components/SectorComparisonGraph";
import { PitWindowVisualizer } from "@/components/PitWindowVisualizer";
import { ScoreCard } from "@/components/ScoreCard";
import { SimulationCard } from "@/components/SimulationCard";
import { TelemetryComparisonCard } from "@/components/TelemetryComparisonCard";
import { cn, generateId } from "@/lib/utils";
import { submitEngineerQuery, fetchInvestigationById, toggleSaveInvestigation, fetchBackfillStatus } from "@/lib/api";
export function normalizeStints(stintsList, isActual) {
  if (!stintsList || !Array.isArray(stintsList)) return [];
  return stintsList.map((s) => ({
    compound: (s.compound || s.compound_id || "medium").toLowerCase(),
    startLap: s.start_lap || s.start || 1,
    endLap: s.end_lap || s.end || 71,
    wearSlope: s.wear_slope || s.wearSlope || 0.05,
    isActual
  }));
}
export function formatTimeSeconds(seconds) {
  if (!seconds) return "1:26:42.880";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor(seconds % 3600 / 60);
  const secs = seconds % 60;
  return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toFixed(3).padStart(6, "0")}`;
}
function mapResponseToMessages(id, response, timestamp, isLast) {
  if (!response || typeof response !== "object") {
    return [
      {
        id: `verdict-${id}-${timestamp}`,
        type: "verdict",
        content: "No response payload received from AI Race Engineer.",
        timestamp
      },
      {
        id: `narrative-${id}-${timestamp}`,
        type: "narrative",
        content: "The query executed but returned an empty response. Please verify backend service status and try again.",
        timestamp: timestamp + 500
      }
    ];
  }
  const evidence = response.evidence || response.investigation_report?.Evidence || {};
  const callouts = [];
  if (evidence && typeof evidence === "object" && evidence.simulation_tool) {
    const sim = evidence.simulation_tool;
    const gainSec = (sim.simulated_net_time_gain_ms || 0) / 1e3;
    const sign = gainSec >= 0 ? "+" : "";
    callouts.push({
      text: `Net time gain: ${sign}${gainSec.toFixed(3)}s`,
      type: gainSec >= 0 ? "gain" : "loss"
    });
    if (sim.position_change !== void 0) {
      callouts.push({
        text: `Position change: ${sim.position_change >= 0 ? "+" : ""}${sim.position_change}`,
        type: sim.position_change >= 0 ? "gain" : "loss"
      });
    }
  }
  if (evidence && typeof evidence === "object" && evidence.scoring_tool) {
    const score = evidence.scoring_tool;
    if (score.composite_score !== void 0) {
      callouts.push({
        text: `Composite Score: ${score.composite_score}`,
        type: "neutral"
      });
    }
  }
  const rawVerdict = response.investigation_report?.["Executive Summary"] || response.final_answer || response.error || "Race debrief analysis complete.";
  let verdictText = rawVerdict;
  if (typeof rawVerdict === "string" && rawVerdict.includes("|")) {
    const lines = rawVerdict.split("\n").map(l => l.trim()).filter(Boolean);
    const cleanLines = lines.filter(l => !l.startsWith("|") && !l.startsWith("---") && !l.startsWith("Sector-by-Sector Breakdown") && !l.startsWith("**Sector-by-Sector"));
    verdictText = cleanLines.join("\n");
  }

  if (Array.isArray(response.sources) && response.sources.length > 0) {
    const sourcesFormatted = "\n\n**Sources:**\n" + response.sources.map(s => {
      if (typeof s === "object" && s.title && s.url) {
        return `- [${s.title}](${s.url})`;
      }
      return `- ${s}`;
    }).join("\n");
    if (!verdictText.includes("**Sources:**")) {
      verdictText += sourcesFormatted;
    }
  }

  let narrativeContent = "";
  if (response.investigation_report) {
    const rep = response.investigation_report;
    const parts = [];
    if (rep["Telemetry Findings"] && rep["Telemetry Findings"] !== "Unavailable" && !rep["Telemetry Findings"].includes("insufficient") && !rep["Telemetry Findings"].includes("No data available") && rep["Telemetry Findings"] !== "None.") {
      parts.push(`**Telemetry Findings:** ${rep["Telemetry Findings"]}`);
    }
    if (rep["Simulation Findings"] && rep["Simulation Findings"] !== "Unavailable" && !rep["Simulation Findings"].includes("insufficient") && !rep["Simulation Findings"].includes("No data available") && rep["Simulation Findings"] !== "None.") {
      parts.push(`**Simulation Findings:** ${rep["Simulation Findings"]}`);
    }
    if (rep["Historical Findings"] && rep["Historical Findings"] !== "Unavailable" && rep["Historical Findings"] !== "No historical standings parsed." && !rep["Historical Findings"].includes("No data available") && rep["Historical Findings"] !== "None.") {
      parts.push(`**Historical Findings:** ${rep["Historical Findings"]}`);
    }
    if (rep["Regulations Findings"] && rep["Regulations Findings"] !== "Unavailable" && rep["Regulations Findings"] !== "No specific regulatory infractions logged." && !rep["Regulations Findings"].includes("No data available") && rep["Regulations Findings"] !== "None.") {
      parts.push(`**Regulations Findings:** ${rep["Regulations Findings"]}`);
    }
    if (rep["Alternative Scenarios"] && rep["Alternative Scenarios"] !== "Unavailable" && !rep["Alternative Scenarios"].includes("No data available") && rep["Alternative Scenarios"] !== "None.") {
      parts.push(`**Alternative Scenarios:** ${rep["Alternative Scenarios"]}`);
    }
    if (rep["Final Recommendation"] && rep["Final Recommendation"] !== "Unavailable" && !rep["Final Recommendation"].includes("No data available") && rep["Final Recommendation"] !== "None.") {
      parts.push(`**Recommendation:** ${rep["Final Recommendation"]}`);
    }
    if (parts.length > 0) {
      narrativeContent = parts.join("\n\n");
    }
  }
  if (!narrativeContent) {
    narrativeContent = response.explanations?.engineer || response.explanations?.intermediate || response.final_answer || "Verified race analysis debrief completed.";
  }
  if (narrativeContent === verdictText) {
    narrativeContent = response.explanations?.engineer || "Strategic debrief completed successfully based on verified race data.";
  }
  const messages = [
    {
      id: `verdict-${id}-${timestamp}`,
      type: "verdict",
      content: verdictText,
      timestamp
    },
    {
      id: `narrative-${id}-${timestamp}`,
      type: "narrative",
      content: narrativeContent,
      callouts: callouts.length > 0 ? callouts : void 0,
      timestamp: timestamp + 500
    }
  ];
  const telemData = evidence && typeof evidence === "object" ? evidence.telemetry_tool : null;
  const simData = evidence && typeof evidence === "object" ? (evidence.simulation_tool || evidence.strategy_tool) : null;
  const scoreData = evidence && typeof evidence === "object" ? evidence.scoring_tool : null;

  // 1. Driver Performance Scorecard
  if (scoreData && (scoreData.composite_score !== undefined || scoreData.pace_score !== undefined)) {
    messages.push({
      id: `scorecard-${id}-${timestamp}`,
      type: "scorecard",
      content: "Driver Performance Index",
      evidenceData: scoreData,
      timestamp: timestamp + 700
    });
  }

  // 2. What-If Strategy Simulation Card
  if (simData && (simData.simulated_pit_lap !== undefined || simData.position_change !== undefined || simData.simulated_net_time_gain_ms !== undefined)) {
    messages.push({
      id: `simulationcard-${id}-${timestamp}`,
      type: "simulationcard",
      content: "What-If Strategy Simulation",
      evidenceData: simData,
      timestamp: timestamp + 800
    });
  }

  // 2.5 Head-to-Head Comparative Telemetry & Ghost Fight Card
  if (telemData && telemData.comparative_driver_id && (telemData.comparative_telemetry || telemData.comparative_analysis || telemData.sector_times)) {
    const driverCodeA = String(telemData.driver_id || "DRIVER_A").toUpperCase();
    const driverCodeB = String(telemData.comparative_driver_id || "DRIVER_B").toUpperCase();
    messages.push({
      id: `comparison-${id}-${timestamp}`,
      type: "telemetry-comparison",
      content: "Head-to-Head Telemetry Comparison",
      evidenceData: {
        comparativeAnalysis: telemData.comparative_analysis,
        telemetryDataA: telemData.telemetry || [],
        telemetryDataB: telemData.comparative_telemetry || [],
        driverA: { code: driverCodeA, name: telemData.driver || driverCodeA },
        driverB: { code: driverCodeB, name: telemData.comparative_driver || driverCodeB },
        trackName: telemData.grand_prix || "Grand Prix",
        lapNumberA: telemData.lap_number || 1,
        lapNumberB: telemData.comparative_lap_number || 1
      },
      timestamp: timestamp + 850
    });
  }

  // 3. Production Telemetry Visualizations (5-Chart Matrix)
  if (telemData && (telemData.lap_times || telemData.telemetry || telemData.sector_times)) {
    const driverCode = String(telemData.driver_id || (simData && simData.driver_id) || "DRV").toUpperCase();

    messages.push({
      id: `visualizations-${id}-${timestamp}`,
      type: "production-visualizations",
      content: "Production Telemetry Visualizations",
      evidenceData: {
        lapTimes: telemData.lap_times || [],
        tyreDeg: telemData.tyre_degradation || [],
        sectorTimes: telemData.sector_times || [],
        pitWindow: simData && simData.pit_windows ? {
          pittingDriver: {
            code: driverCode,
            exitLap: simData.actual_pit_lap || simData.pit_stop_lap || 22,
            pitLossTime: simData.traffic_loss || 22
          },
          rivals: simData.rivals || []
        } : null,
        driverCode
      },
      timestamp: timestamp + 1200
    });
  }
  if (isLast) {
    const suggestedFollowups = [
      "Compare lap timings and delta analysis",
      "Show me the pit exit traffic window details",
      "Analyze tire pace decay comparisons",
      "Show details of teammate telemetry margin"
    ];
    messages.push({
      id: `followup-${id}-${timestamp}`,
      type: "follow-up",
      content: "",
      evidenceData: suggestedFollowups,
      timestamp: timestamp + 2e3
    });
  }
  return messages;
}
export function InvestigationThread() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [isStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loadingStage, setLoadingStage] = useState("parsing");
  const [loadingDetail, setLoadingDetail] = useState("Initializing AI Race Engineer...");
  const [latency, setLatency] = useState(null);
  const [providerInfo, setProviderInfo] = useState(null);
  const [abortController, setAbortController] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [questionTitle, setQuestionTitle] = useState("");
  const [prefillQuery, setPrefillQuery] = useState("");
  const [currentResponse, setCurrentResponse] = useState(null);
  const executedQueriesRef = useRef(/* @__PURE__ */ new Set());
  const inFlightRef = useRef(false);
  const lastResponseRef = useRef(null);
  const [expandedTelemetry, setExpandedTelemetry] = useState(null);

  const lastResponse = currentResponse || lastResponseRef.current;
  const sessionId = lastResponse?.evidence?.simulation_tool?.session_id ||
                    lastResponse?.evidence?.telemetry_tool?.session_id ||
                    lastResponse?.evidence?.race_results_tool?.session_id ||
                    lastResponse?.session_id ||
                    lastResponse?.session ||
                    lastResponse?.intelligence_trace?.resolved_session_id;

  const resolvedGrandPrix = lastResponse?.grand_prix ||
                            lastResponse?.evidence?.telemetry_tool?.grand_prix ||
                            lastResponse?.evidence?.race_results_tool?.grand_prix ||
                            lastResponse?.evidence?.simulation_tool?.grand_prix ||
                            lastResponse?.intelligence_trace?.entities?.grand_prix ||
                            (sessionId ? sessionId.replace(/^\d{4}_/, "").replace(/_gp.*$/, " GP").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : null);

  const rawTrackName = lastResponse?.evidence?.telemetry_tool?.circuit_name ||
                       lastResponse?.evidence?.telemetry_tool?.grand_prix ||
                       lastResponse?.evidence?.race_results_tool?.grand_prix ||
                       resolvedGrandPrix ||
                       (sessionId ? sessionId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Circuit");
  const trackName = rawTrackName;

  const breadcrumbs = [
    { label: "Home", href: "/" },
    ...(resolvedGrandPrix ? [{ label: resolvedGrandPrix, href: sessionId ? `/race/${sessionId}` : "#" }] : []),
    ...(questionTitle ? [{ label: questionTitle, href: "#" }] : [{ label: "Investigation", href: "#" }])
  ];

  const planningSteps = lastResponse?.planning_steps || [];


  const reasoningSteps = (planningSteps || []).map((step, idx) => {
    const [toolName, rawParams] = step.split("|");
    return {
      title: `Step ${idx + 1}: ${(toolName || "").replace("_", " ").toUpperCase()}`,
      description: `Dispatched tool ${toolName} with parameters: ${rawParams || "None"}. Collected timing metrics and strategist inputs.`,
      dataReference: `Chief Race Engineer execution plan`,
      confidence: lastResponse?.confidence || 87
    };
  });
  const defaultReasoningSteps = [
    {
      title: "Executing AI Race Engineer Plan",
      description: lastResponse?.final_answer?.slice(0, 150) || "Analyzing race data...",
      dataReference: "Chief Race Engineer execution plan",
      confidence: lastResponse?.confidence || 80
    }
  ];
  const activeReasoningSteps = reasoningSteps.length > 0 ? reasoningSteps : defaultReasoningSteps;
  useEffect(() => {
    if (!isLoading) return;
    const stages = [
      { stage: "parsing", detail: "Parsing intent and telemetry parameters..." },
      { stage: "loading_data", detail: "Querying FastF1 timing matrices..." },
      { stage: "computing", detail: "Running strategy regressions & simulations..." },
      { stage: "generating", detail: "Synthesizing race debrief report..." }
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % stages.length;
      setLoadingStage(stages[idx].stage);
      setLoadingDetail(stages[idx].detail);
    }, 1200);
    return () => clearInterval(interval);
  }, [isLoading]);
  useEffect(() => {
    if (!id) return;
    initInvestigation(id);
  }, [id]);
  const initInvestigation = async (targetId) => {
    if (inFlightRef.current || executedQueriesRef.current.has(targetId)) {
      return;
    }
    const storedItem = localStorage.getItem(`frontwing_investigation_${targetId}`);
    if (storedItem) {
      try {
        const data = JSON.parse(storedItem);
        setQuestionTitle(data.question || "Investigation Thread");
        setIsSaved(!!data.is_saved);
        if (data.status === "completed" || data.exchanges && data.exchanges.length > 0 || data.response) {
          executedQueriesRef.current.add(targetId);
          const lastEx = data.exchanges ? data.exchanges[data.exchanges.length - 1] : { question: data.question, response: data.response, timestamp: data.timestamp || Date.now() };
          if (lastEx && lastEx.response) {
            lastResponseRef.current = lastEx.response;
            setCurrentResponse(lastEx.response);
            const msgs = mapResponseToMessages(targetId, lastEx.response, lastEx.timestamp || Date.now(), true);
            setMessages(msgs);
            const trace = lastEx.response.intelligence_trace || {};
            const provider = trace.llm_provider || "Gemini";
            const model = trace.llm_model || "gemini-2.0-flash";
            const hasFailover = trace.failover_reason && trace.failover_reason !== "None";
            setProviderInfo({
              provider: hasFailover ? `${provider} (Failover)` : provider,
              model
            });
            const elapsed = trace.llm_latency ? (trace.llm_latency / 1e3).toFixed(1) : "2.1";
            setLatency(parseFloat(elapsed));
            setIsLoading(false);
            setErrorMsg(null);
            return;
          }
        } else if (data.status === "loading" && data.question) {
          executedQueriesRef.current.add(targetId);
          await executeQuery(data.question, targetId);
          return;
        }
      } catch (err) {
        console.warn("[InvestigationThread] Parse error for local storage:", err);
      }
    }
    try {
      const remoteItem = await fetchInvestigationById(targetId);
      if (remoteItem && remoteItem.ai_response) {
        executedQueriesRef.current.add(targetId);
        lastResponseRef.current = remoteItem.ai_response;
        setCurrentResponse(remoteItem.ai_response);
        setQuestionTitle(remoteItem.question);
        setIsSaved(!!remoteItem.is_saved);
        const msgs = mapResponseToMessages(targetId, remoteItem.ai_response, new Date(remoteItem.timestamp).getTime(), true);
        setMessages(msgs);
        setIsLoading(false);
        setErrorMsg(null);
        return;
      }
    } catch (err) {
      console.log("[InvestigationThread] Remote fetch skipped, item unavailable:", err);
    }
    setIsLoading(false);
    setErrorMsg("Investigation thread not found. Please submit a question from the home screen.");
  };
  const getInitialLoadingDetail = (text) => {
    const q = (text || "").toLowerCase();
    if (q.includes("telemetry") || q.includes("speed") || q.includes("throttle") || q.includes("brake") || q.includes("corner") || q.includes("sector")) {
      return "Loading telemetry streams & sector timing...";
    }
    if (q.includes("strategy") || q.includes("pit") || q.includes("stint") || q.includes("tire") || q.includes("tyre") || q.includes("undercut")) {
      return "Analyzing pit strategy & tyre degradation...";
    }
    if (q.includes("result") || q.includes("who won") || q.includes("position") || q.includes("podium") || q.includes("standings")) {
      return "Retrieving official race results & classifications...";
    }
    if (q.includes("score") || q.includes("rate") || q.includes("performance")) {
      return "Computing driver performance metrics...";
    }
    return "Searching knowledge base & race records...";
  };

  const executeQuery = async (queryText, currentId, contextData = {}) => {
    const startTime = Date.now();
    const activeId = currentId || id || generateId();
    executedQueriesRef.current.add(activeId);
    inFlightRef.current = true;
    setIsLoading(true);
    setErrorMsg(null);
    setLoadingStage("parsing");
    setLoadingDetail(getInitialLoadingDetail(queryText));
    setQuestionTitle(queryText);
    const controller = new AbortController();
    setAbortController(controller);
    // STAGE B: Strategy Isolation Boundary Check
    // Strategy questions are out-of-scope for the General tab and must redirect to the Strategy Engineer tab
    const isStrategyQuestion = (text) => {
      const q = (text || "").toLowerCase().trim();
      const patterns = [
        /\bwhat\s+if\b/,
        /\bsimulate\b/,
        /\bwhat\s+happens?\s+if\b/,
        /\bwhy\s+did\s+.*\s+finish\b/,
        /\bwhat\s+went\s+wrong\s+with\s+.*\s+strategy\b/,
        /\bcould\s+.*\s+(?:have\s+)?pitted\b/,
        /\bif\s+.*\s+pitted\b/,
        /\b(?:earlier|later)\s+(?:pit\s+stop|pit|stop)\b/,
        /\b\d+\s+laps?\s+(?:earlier|later)\b/,
        /\balternative\s+(?:strategy|pit|lap)\b/,
        /\bpit\s+(?:on\s+)?lap\s+\d+\b/,
        /\bbox\s+(?:on\s+)?lap\s+\d+\b/
      ];
      return patterns.some((p) => p.test(q));
    };

    if (isStrategyQuestion(queryText)) {
      setIsLoading(false);
      inFlightRef.current = false;
      const redirectMsgs = [
        {
          id: `verdict-${activeId}-${Date.now()}`,
          type: "verdict",
          content: "⚠️ Strategy analysis and What-If simulations are out of scope for the General Investigation tab.",
          timestamp: Date.now()
        },
        {
          id: `narrative-${activeId}-${Date.now()}`,
          type: "narrative",
          content: `**Strategy Question Detected:** "${queryText}"\n\nThe General Investigation tab is reserved for telemetry channel analysis, fastest lap comparisons, and race classifications. Counterfactual simulations, stint degradation, and pit strategy cost analysis are exclusively handled in the **Strategy Engineer** workspace.\n\n👉 [**Open Strategy Engineer Workspace →**](/strategy)`,
          timestamp: Date.now() + 100
        }
      ];
      setMessages(redirectMsgs);
      return;
    }

    try {
      let apiResponse = await submitEngineerQuery(queryText, activeId, controller.signal, contextData);

      // FIX O: Dedicated lightweight status polling loop with hard cap & stagnant progress detection
      if (apiResponse && apiResponse.status === "backfilling") {
        const backfillSessionId = apiResponse.session_id || apiResponse.job?.session_id;
        if (!backfillSessionId) {
          throw new Error("This is taking longer than expected, please try again.");
        }
        setLoadingStage("loading_data");
        setLoadingDetail(apiResponse.stage || `Downloading telemetry package for ${backfillSessionId}...`);

        let completed = false;
        let attempts = 0;
        let noProgressAttempts = 0;
        let lastProgressPct = apiResponse.progress_pct ?? null;
        let lastStage = apiResponse.stage ?? null;
        const maxAttempts = 60; // Hard cap of 60 attempts (~2.5 minutes at 2500ms interval)

        while (!completed && attempts < maxAttempts) {
          if (controller.signal.aborted) break;
          await new Promise((r) => setTimeout(r, 2500));
          attempts++;

          // Poll ONLY the dedicated lightweight status endpoint
          const statusRes = await fetchBackfillStatus(backfillSessionId);
          if (statusRes) {
            if (statusRes.status === "completed") {
              completed = true;
              setLoadingDetail("Telemetry ingestion complete! Synthesizing telemetry findings...");
              break;
            } else if (statusRes.status === "failed") {
              throw new Error(statusRes.error || "Telemetry backfill failed.");
            }

            const currentPct = statusRes.progress_pct;
            const currentStage = statusRes.stage;

            // Detect stagnant progress
            if (currentPct === lastProgressPct && currentStage === lastStage) {
              noProgressAttempts++;
            } else {
              noProgressAttempts = 0;
              lastProgressPct = currentPct;
              lastStage = currentStage;
            }

            if (noProgressAttempts >= 60) {
              throw new Error("This is taking longer than expected, please try again.");
            }

            if (currentStage) {
              const pctText = currentPct !== undefined && currentPct !== null ? ` (${currentPct}%)` : "";
              setLoadingDetail(`${currentStage}${pctText}`);
            }
          } else {
            noProgressAttempts++;
            if (noProgressAttempts >= 60) {
              throw new Error("This is taking longer than expected, please try again.");
            }
          }
        }

        if (!completed && attempts >= maxAttempts) {
          throw new Error("This is taking longer than expected, please try again.");
        }

        if (completed && !controller.signal.aborted) {
          // Exactly ONE re-submission to obtain complete response with telemetry
          apiResponse = await submitEngineerQuery(queryText, activeId, controller.signal, contextData);
          if (apiResponse && apiResponse.status === "backfilling") {
            throw new Error("This is taking longer than expected, please try again.");
          }
        }
      }

      lastResponseRef.current = apiResponse;
      const endTime = Date.now();
      const elapsedSeconds = ((endTime - startTime) / 1e3).toFixed(1);
      const trace = apiResponse.intelligence_trace || {};
      const provider = trace.llm_provider || "Gemini";
      const model = trace.llm_model || "gemini-2.0-flash";
      const hasFailover = trace.failover_reason && trace.failover_reason !== "None";
      setLatency(parseFloat(elapsedSeconds));
      setProviderInfo({
        provider: hasFailover ? `${provider} (Failover)` : provider,
        model
      });
      const backendUuid = apiResponse.id;
      const targetId = backendUuid || activeId;
      if (backendUuid) {
        executedQueriesRef.current.add(backendUuid);
      }
      const completedData = {
        id: targetId,
        question: queryText,
        status: "completed",
        exchanges: [{
          question: queryText,
          response: apiResponse,
          timestamp: Date.now()
        }],
        timestamp: Date.now()
      };
      localStorage.setItem(`frontwing_investigation_${activeId}`, JSON.stringify(completedData));
      if (backendUuid) {
        localStorage.setItem(`frontwing_investigation_${backendUuid}`, JSON.stringify(completedData));
      }
      lastResponseRef.current = apiResponse;
      setCurrentResponse(apiResponse);
      setIsLoading(false);
      inFlightRef.current = false;
      setAbortController(null);
      const newMsgs = mapResponseToMessages(targetId, apiResponse, Date.now(), true);
      setMessages(newMsgs);
      if (backendUuid && backendUuid !== id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(backendUuid)) {
        window.history.replaceState(null, "", `/investigate/${backendUuid}`);
      }
    } catch (error) {
      inFlightRef.current = false;
      if (error.name === "AbortError") {
        console.log("[InvestigationThread] Fetch aborted by client.");
        return;
      }
      console.error("[InvestigationThread] Fetch error:", error);
      setIsLoading(false);
      setAbortController(null);
      setErrorMsg(error.message || "An error occurred while communicating with the AI Race Engineer.");
    }
  };
  const handleToggleSave = async () => {
    if (!id) return;
    try {
      const res = await toggleSaveInvestigation(id);
      setIsSaved(res.saved);
    } catch {
      const nextSaved = !isSaved;
      setIsSaved(nextSaved);
      const stored = localStorage.getItem(`frontwing_investigation_${id}`);
      if (stored) {
        const data = JSON.parse(stored);
        data.is_saved = nextSaved;
        localStorage.setItem(`frontwing_investigation_${id}`, JSON.stringify(data));
      }
    }
  };
  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
    }
    localStorage.removeItem(`frontwing_investigation_${id}`);
    navigate("/");
  };
  const getParentContext = () => {
    const resp = lastResponseRef.current || {};
    const ev = resp.evidence || {};
    const trace = resp.intelligence_trace || {};
    
    // Extract actual queried drivers (FIX 4: Never pull incidental podium/classification drivers)
    let drivers = [];
    if (resp.drivers && Array.isArray(resp.drivers) && resp.drivers.length > 0) {
      drivers = resp.drivers.map(d => String(d).toLowerCase().trim());
    } else if (trace.entities?.drivers && Array.isArray(trace.entities.drivers) && trace.entities.drivers.length > 0) {
      drivers = trace.entities.drivers.map(d => String(d).toLowerCase().trim());
    } else if (trace.semantic_contract?.comparison_drivers && Array.isArray(trace.semantic_contract.comparison_drivers) && trace.semantic_contract.comparison_drivers.length > 0) {
      drivers = trace.semantic_contract.comparison_drivers.map(d => String(d).toLowerCase().trim());
    } else if (ev.telemetry_tool?.driver_id && ev.telemetry_tool?.compare_driver) {
      drivers = [String(ev.telemetry_tool.driver_id).toLowerCase().trim(), String(ev.telemetry_tool.compare_driver).toLowerCase().trim()];
    } else if (ev.telemetry_tool?.driver_a && ev.telemetry_tool?.driver_b) {
      drivers = [String(ev.telemetry_tool.driver_a).toLowerCase().trim(), String(ev.telemetry_tool.driver_b).toLowerCase().trim()];
    } else if (ev.scoring_tool?.driver_id) {
      drivers = [String(ev.scoring_tool.driver_id).toLowerCase().trim()];
    } else if (ev.simulation_tool?.driver_id) {
      drivers = [String(ev.simulation_tool.driver_id).toLowerCase().trim()];
    } else if (ev.race_results_tool?.driver_id) {
      drivers = [String(ev.race_results_tool.driver_id).toLowerCase().trim()];
    } else if (trace.entities?.driver) {
      drivers = [String(trace.entities.driver).toLowerCase().trim()];
    }

    const driverId = drivers.length > 0 ? drivers[0] : (ev.scoring_tool?.driver_id || ev.simulation_tool?.driver_id || ev.telemetry_tool?.driver_id || trace.entities?.driver);
    const resolvedSessionId = sessionId || ev.race_results_tool?.session_id || ev.telemetry_tool?.session_id || ev.simulation_tool?.session_id || ev.scoring_tool?.session_id || trace.resolved_session_id;
    const grandPrix = resp.grand_prix || ev.race_results_tool?.grand_prix || ev.telemetry_tool?.grand_prix || ev.simulation_tool?.grand_prix || trace.entities?.grand_prix || (resolvedSessionId ? resolvedSessionId.replace(/^\d{4}_/, "").replace(/_gp.*$/, " GP").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : undefined);
    const season = resp.season || ev.race_results_tool?.season || ev.telemetry_tool?.season || trace.entities?.season || (resolvedSessionId && /^\d{4}/.test(resolvedSessionId) ? parseInt(resolvedSessionId.slice(0, 4)) : 2024);
    
    return {
      session_id: resolvedSessionId || undefined,
      driver_id: driverId || undefined,
      drivers: drivers.length > 0 ? drivers : undefined,
      grand_prix: grandPrix,
      season: season
    };
  };
  const handleSuggestionClick = (suggestion) => {
    if (isLoading || isStreaming) return;
    // Prefill the QuestionBar without auto-submitting (Fix AA)
    setPrefillQuery(suggestion);
  };
  const handleFollowUpSubmit = (query) => {
    if (isLoading || isStreaming || !query.trim()) return;
    setPrefillQuery("");
    const parentContext = getParentContext();
    setMessages((prev) => [
      ...prev.filter((m) => m.type !== "follow-up"),
      {
        id: `user-${Date.now()}`,
        type: "narrative",
        content: `**Follow-up question:** *${query}*`,
        timestamp: Date.now()
      }
    ]);
    executeQuery(query, null, parentContext);
  };

  const handleRetryConnection = () => {
    const token = localStorage.getItem("frontwing_token");
    if (!token) {
      // Re-trigger auth modal if unauthenticated (Fix Z)
      window.dispatchEvent(new CustomEvent("frontwing-open-auth-modal"));
      return;
    }

    let queryToRun = questionTitle;
    if (!queryToRun && id) {
      try {
        const stored = localStorage.getItem(`frontwing_investigation_${id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          queryToRun = parsed.question;
        }
      } catch {}
    }

    if (!queryToRun) {
      queryToRun = "Analyze telemetry delta and strategy for current session";
    }

    setErrorMsg(null);
    inFlightRef.current = false;
    if (id) {
      executedQueriesRef.current.delete(id);
    }
    executeQuery(queryToRun, id);
  };

  const handleGoHome = () => {
    if (id) {
      localStorage.removeItem(`frontwing_investigation_${id}`);
    }
    navigate("/", { replace: true });
    setTimeout(() => {
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }, 50);
  };

  useEffect(() => {
    const handleAuthChange = () => {
      const token = localStorage.getItem("frontwing_token");
      if (token && errorMsg && errorMsg.toLowerCase().includes("authentication")) {
        handleRetryConnection();
      }
    };
    window.addEventListener("frontwing-auth-changed", handleAuthChange);
    return () => window.removeEventListener("frontwing-auth-changed", handleAuthChange);
  }, [errorMsg, questionTitle, id]);

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-text-secondary">
        <div className="max-w-md w-full border border-border-subtle bg-surface-base/90 rounded-card p-8 flex flex-col gap-6 items-center text-center shadow-card relative overflow-hidden backdrop-blur-md">
          <div className="w-12 h-12 rounded-full border border-accent-danger/20 flex items-center justify-center bg-accent-danger/10 animate-pulse">
            <span className="text-accent-danger font-bold text-lg font-mono">!</span>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-md font-mono text-text-primary uppercase tracking-widest">System Alert</h2>
            <p className="text-text-muted text-xs leading-relaxed">{errorMsg}</p>
          </div>
          <div className="flex gap-4 w-full pt-2">
            <button
              onClick={handleRetryConnection}
              className="flex-1 btn-f1-primary py-2.5 px-4 text-xs font-mono font-bold uppercase tracking-wider"
            >
              Retry Connection
            </button>
            <button
              onClick={handleGoHome}
              className="flex-1 py-2.5 px-4 rounded-badge border border-border-subtle text-text-primary hover:bg-surface-raised transition-colors font-mono text-xs uppercase tracking-wider"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-canvas text-text-secondary flex flex-col font-sans selection:bg-accent-primary/20 selection:text-accent-primary">
      {/* Navigation Header */}
      <BriefingHeader
        breadcrumbs={breadcrumbs}
        sessionState={isStreaming ? "streaming" : isLoading ? "loading" : "idle"}
        onLogoClick={() => navigate("/")}
        onBreadcrumbClick={(index) => {
          if (index === 0) navigate("/");
          if (index === 1) navigate(`/race/${sessionId}`);
        }}
      />
      {/* Main Investigation Canvas — Full Viewport Width */}
      <div className="flex-1 flex w-full max-w-[1600px] mx-auto">
        <main
          className={cn(
            "flex-1 flex flex-col justify-between py-6 px-4 lg:px-8 w-full transition-all duration-300",
            expandedTelemetry ? "lg:w-7/12" : "w-full"
          )}
        >
          {/* Question Header & Title Section */}
          <div className="border-b border-border-subtle pb-4 mb-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-mono-meta font-mono text-accent-primary tracking-widest">
                Investigation Thread • {resolvedGrandPrix || sessionId || "Active Session"}
              </span>
              <button
                onClick={handleToggleSave}
                className={cn(
                  "px-3 py-1 rounded-badge font-mono text-[10px] tracking-wider border transition-colors flex items-center gap-1.5",
                  isSaved ? "border-accent-primary bg-accent-primary/10 text-accent-primary" : "border-border-subtle text-text-muted hover:text-text-primary hover:bg-surface-raised"
                )}
              >
                <span>{isSaved ? "★ Saved" : "☆ Save Debrief"}</span>
              </button>
            </div>
            <h1 className="text-display-sm text-text-primary">{questionTitle || "Live Telemetry Investigation"}</h1>
          </div>
          {/* Messages list container */}
          <div className="flex flex-col gap-6 flex-1 pr-1">
            {/* Latency Bar */}
            {latency && !isLoading && (
              <div className="flex items-center gap-4 text-[10px] font-mono text-text-muted border-b border-border-subtle pb-3 mb-2 animate-slide-up">
                <div>
                  <span>Response Time: </span>
                  <span className="text-timing-green type-tabular font-semibold">{latency}s</span>
                </div>
              </div>
            )}
            {/* Loading Indicator inside thread layout */}
            {isLoading && (
              <div className="flex flex-col gap-4 my-4 animate-slide-up">
                <AIThinkingIndicator stage={loadingStage} detail={loadingDetail} />
                <button
                  onClick={handleCancel}
                  className="self-center px-4 py-1.5 border border-accent-primary/30 hover:border-accent-primary text-accent-primary hover:bg-accent-primary/10 transition-colors rounded-badge font-mono text-[10px] uppercase tracking-widest"
                >
                  Cancel Investigation
                </button>
              </div>
            )}
          {/* Sequential Messages Hierarchy: AI Verdict -> Narrative -> Charts -> Evidence -> Follow-ups */}
          {messages.map((msg) => {
    if (msg.type === "verdict") {
      return <VerdictBlock
        key={msg.id}
        verdict={msg.content}
        confidence={lastResponse?.confidence || 87}
        className="animate-slide-up"
      />;
    }
    if (msg.type === "narrative") {
      return (
        <div key={msg.id} className="flex flex-col gap-4 animate-slide-up">
          <NarrativeStream content={msg.content} isStreaming={isStreaming} />
          {/* Collapsible Technical Reasoning & Diagnostic Telemetry Logs */}
          {!isStreaming && (lastResponse?.evidence?.simulation_tool || lastResponse?.evidence?.telemetry_tool || lastResponse?.planning_steps) && (
            <ExplanationPanel
              steps={activeReasoningSteps}
              conclusion={lastResponse?.investigation_report?.["Final Recommendation"] || lastResponse?.final_answer?.slice(0, 120) || "Strategic debrief completed."}
              reasoningGraph={lastResponse?.investigation_report?.["Reasoning Graph Text"]}
              planningSteps={planningSteps}
            />
          )}
        </div>
      );
    }
    if (msg.type === "scorecard" && msg.evidenceData) {
      return <ScoreCard
        key={msg.id}
        data={msg.evidenceData}
        className="animate-slide-up"
      />;
    }
    if (msg.type === "simulationcard" && msg.evidenceData) {
      return <SimulationCard
        key={msg.id}
        data={msg.evidenceData}
        className="animate-slide-up"
      />;
    }
    if (msg.type === "telemetry-comparison" && msg.evidenceData) {
      return <TelemetryComparisonCard
        key={msg.id}
        comparativeAnalysis={msg.evidenceData.comparativeAnalysis}
        telemetryDataA={msg.evidenceData.telemetryDataA}
        telemetryDataB={msg.evidenceData.telemetryDataB}
        driverA={msg.evidenceData.driverA}
        driverB={msg.evidenceData.driverB}
        trackName={msg.evidenceData.trackName}
        lapNumberA={msg.evidenceData.lapNumberA}
        lapNumberB={msg.evidenceData.lapNumberB}
        className="animate-slide-up"
      />;
    }
    if (msg.type === "evidence-strategy" && msg.evidenceData) {
      const stratData = msg.evidenceData;
      return <EvidenceCard
        key={msg.id}
        title="Stint Strategy Deviation"
        subtitle={`${stratData.driverCode} Stint Length Plan`}
        variant="expanded"
        className="animate-slide-up"
      ><StrategyTimeline
        stints={stratData.actual}
        simulated={stratData.simulated}
        totalLaps={stratData.totalLaps}
        driverCode={stratData.driverCode}
        variant="comparison"
      /></EvidenceCard>;
    }
    if (msg.type === "evidence-simulation" && msg.evidenceData) {
      const telemetryToolData = lastResponse?.evidence?.telemetry_tool;
      const driverCodeA = telemetryToolData?.driver_id ? String(telemetryToolData.driver_id).toUpperCase() : "DRIVER_A";
      const driverCodeB = telemetryToolData?.comparative_driver_id ? String(telemetryToolData.comparative_driver_id).toUpperCase() : "DRIVER_B";
      const telemetryDataA = telemetryToolData?.telemetry || [];
      const telemetryDataB = telemetryToolData?.comparative_telemetry || [];
      const lapNumber = telemetryToolData?.lap_number || 42;
      return <div key={msg.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up"><SimulationResult
        result={msg.evidenceData}
        variant="detailed"
        onDrillDown={() => navigate(`/strategy/${sessionId}`)}
      />{
        /* Telemetry card inside thread */
      }<TelemetryCard
        driverA={{ code: driverCodeA, color: "#FF8000", data: telemetryDataA }}
        driverB={{ code: driverCodeB, color: "#E80020", data: telemetryDataB }}
        metric="speed"
        lapNumber={lapNumber}
        trackName={trackName}
        highlightZone={{ startM: 1e3, endM: 1500 }}
        variant="collapsed"
        onExpand={() => setExpandedTelemetry({
          driverA: driverCodeA,
          driverB: driverCodeB,
          metric: "speed",
          lapNumber
        })}
      /></div>;
    }
    if (msg.type === "production-visualizations" && msg.evidenceData) {
      const vis = msg.evidenceData;
      const telemetryToolData = lastResponse?.evidence?.telemetry_tool;
      const driverCodeA = telemetryToolData?.driver_id ? String(telemetryToolData.driver_id).toUpperCase() : (vis.driverCode ? String(vis.driverCode).toUpperCase() : "DRIVER_A");
      const driverCodeB = telemetryToolData?.comparative_driver_id ? String(telemetryToolData.comparative_driver_id).toUpperCase() : null;

      const telemetryDataA = telemetryToolData?.telemetry || [];
      const telemetryDataB = telemetryToolData?.comparative_telemetry || [];
      const sectorTimes = (telemetryToolData?.sector_times && telemetryToolData.sector_times.length > 0) ? telemetryToolData.sector_times : vis.sectorTimes;
      const lapNumber = telemetryToolData?.lap || vis.lapNumber || 22;
      return (
        <div key={msg.id} className="flex flex-col gap-6 animate-slide-up">
          <div className="text-mono-meta font-mono text-accent-primary tracking-widest border-b border-border-subtle pb-2">
            Telemetry Visualization • 5-Chart Matrix
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Lap Time Graph */}
            <LapTimeGraph data={vis.lapTimes} driverCode={driverCodeA} />
            {/* 2. Tyre Degradation */}
            <TyreDegradationGraph data={vis.tyreDeg} driverCode={driverCodeA} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 3. Sector Comparison */}
            <SectorComparisonGraph
              data={sectorTimes}
              driverCode={driverCodeA}
              comparativeDriverCode={driverCodeB}
            />
            {/* 4. Speed Trace */}
            <TelemetryCard
              driverA={{ code: driverCodeA, color: "#00D2BE", data: telemetryDataA }}
              driverB={driverCodeB ? { code: driverCodeB, color: "#FFD600", data: telemetryDataB } : null}
              metric="speed"
              lapNumber={lapNumber}
              trackName={trackName}
              variant="collapsed"
              onExpand={() =>
                setExpandedTelemetry({
                  driverA: driverCodeA,
                  driverB: driverCodeB,
                  metric: "speed",
                  lapNumber
                })
              }
            />
          </div>
          {/* 5. Pit Window Timeline */}
          {vis.pitWindow && vis.pitWindow.pittingDriver && (
            <PitWindowVisualizer
              pittingDriver={vis.pitWindow.pittingDriver}
              rivals={vis.pitWindow.rivals || []}
            />
          )}
        </div>
      );
    }
    if (msg.type === "follow-up" && msg.evidenceData && !isStreaming) {
      return (
        <FollowUpSuggestions
          key={msg.id}
          suggestions={msg.evidenceData}
          onSuggestionClick={handleSuggestionClick}
        />
      );
    }
    return null;
  })}</div>{
    /* Bottom-docked QuestionBar */
  }<div className="border-t border-border-subtle pt-4 mt-6"><QuestionBar
    variant="inline"
    placeholder="Ask a follow-up or enter custom what-if scenario..."
    disabled={isStreaming || isLoading}
    onSubmit={handleFollowUpSubmit}
    prefillValue={prefillQuery}
    contextLabel="Race Engineer"
  /></div></main>{
    /* Right Pane: Split Screen Interactive Telemetry Overlay */
  }{expandedTelemetry && (() => {
    const telemetryToolData = lastResponse?.evidence?.telemetry_tool;
    const telemetryDataA = telemetryToolData?.telemetry || [];
    const telemetryDataB = telemetryToolData?.comparative_telemetry || [];
    return (
      <aside className="hidden lg:flex w-[600px] border-l border-border-subtle bg-surface-base flex-col animate-slide-in-right p-4 overflow-y-auto">
        <div className="flex justify-between items-center border-b border-border-subtle pb-3 mb-4">
          <span className="text-mono-meta font-mono text-accent-primary tracking-widest">
            Split-Screen Analysis • Overlay
          </span>
          <button
            onClick={() => setExpandedTelemetry(null)}
            className="text-text-muted hover:text-text-primary font-mono text-mono-meta"
          >
            [Close]
          </button>
        </div>
        <div className="flex flex-col gap-6">
          <TelemetryCard
            driverA={{ code: expandedTelemetry.driverA, color: "#00D2BE", data: telemetryDataA }}
            driverB={{ code: expandedTelemetry.driverB || "", color: "#FFD600", data: telemetryDataB }}
            metric={expandedTelemetry.metric}
            lapNumber={expandedTelemetry.lapNumber}
            trackName={trackName}
            highlightZone={{ startM: 1000, endM: 1500 }}
            variant="expanded"
          />
          <TelemetryCard
            driverA={{ code: expandedTelemetry.driverA, color: "#00D2BE", data: telemetryDataA }}
            driverB={{ code: expandedTelemetry.driverB || "", color: "#FFD600", data: telemetryDataB }}
            metric="throttle"
            lapNumber={expandedTelemetry.lapNumber}
            trackName={trackName}
            variant="expanded"
          />
          <TelemetryCard
            driverA={{ code: expandedTelemetry.driverA, color: "#00D2BE", data: telemetryDataA }}
            driverB={{ code: expandedTelemetry.driverB || "", color: "#FFD600", data: telemetryDataB }}
            metric="brake"
            lapNumber={expandedTelemetry.lapNumber}
            trackName={trackName}
            variant="expanded"
          />
        </div>
      </aside>
    );
  })()}
      </div>
    </div>
  );
}
