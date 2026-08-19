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
import { cn, generateId } from "@/lib/utils";
import {
  AUSTRIAN_GP,
  TELEMETRY_PIA_LAP42,
  TELEMETRY_SAI_LAP42
} from "@/lib/data";
import { submitEngineerQuery, fetchInvestigationById, toggleSaveInvestigation } from "@/lib/api";
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
  const verdictText = response.investigation_report?.["Executive Summary"] || response.final_answer || response.error || "Race debrief analysis complete.";
  let narrativeContent = "";
  if (response.investigation_report) {
    const rep = response.investigation_report;
    const parts = [];
    if (rep["Reasoning Graph Text"]) {
      parts.push(`**Root-Cause Reasoning Graph:**
${rep["Reasoning Graph Text"]}`);
    }
    if (rep["Telemetry Findings"] && rep["Telemetry Findings"] !== "Unavailable" && !rep["Telemetry Findings"].includes("insufficient")) {
      parts.push(`**Telemetry Findings:** ${rep["Telemetry Findings"]}`);
    }
    if (rep["Simulation Findings"] && rep["Simulation Findings"] !== "Unavailable" && !rep["Simulation Findings"].includes("insufficient")) {
      parts.push(`**Simulation Findings:** ${rep["Simulation Findings"]}`);
    }
    if (rep["Historical Findings"] && rep["Historical Findings"] !== "Unavailable" && rep["Historical Findings"] !== "No historical standings parsed.") {
      parts.push(`**Historical Findings:** ${rep["Historical Findings"]}`);
    }
    if (rep["Regulations Findings"] && rep["Regulations Findings"] !== "Unavailable" && rep["Regulations Findings"] !== "No specific regulatory infractions logged.") {
      parts.push(`**Regulations Findings:** ${rep["Regulations Findings"]}`);
    }
    if (rep["Alternative Scenarios"] && rep["Alternative Scenarios"] !== "Unavailable") {
      parts.push(`**Alternative Scenarios:** ${rep["Alternative Scenarios"]}`);
    }
    if (rep["Final Recommendation"] && rep["Final Recommendation"] !== "Unavailable") {
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
  const simData = evidence && typeof evidence === "object" ? evidence.simulation_tool : null;
  if (telemData && (telemData.lap_times || telemData.telemetry || telemData.sector_times)) {
    const driverCode = (telemData.driver_id || simData && simData.driver_id || "DRV").toUpperCase();
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
  const [questionTitle, setQuestionTitle] = useState("Investigation Thread");
  const executedQueriesRef = useRef(/* @__PURE__ */ new Set());
  const inFlightRef = useRef(false);
  const lastResponseRef = useRef(null);
  const [expandedTelemetry, setExpandedTelemetry] = useState(null);
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Investigation Thread", href: "#" },
    { label: questionTitle, href: "#" }
  ];
  const lastResponse = lastResponseRef.current;
  const sessionId = lastResponse?.evidence?.simulation_tool?.session_id || lastResponse?.evidence?.telemetry_tool?.session_id || AUSTRIAN_GP.id;
  const trackName = lastResponse?.evidence?.telemetry_tool?.session_id ? lastResponse.evidence.telemetry_tool.session_id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : AUSTRIAN_GP.circuit;
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
  const executeQuery = async (queryText, currentId) => {
    const activeId = currentId || id || generateId();
    executedQueriesRef.current.add(activeId);
    inFlightRef.current = true;
    setIsLoading(true);
    setErrorMsg(null);
    setLoadingStage("parsing");
    setLoadingDetail("Initializing AI Race Engineer...");
    setQuestionTitle(queryText);
    const controller = new AbortController();
    setAbortController(controller);
    const startTime = Date.now();
    try {
      const apiResponse = await submitEngineerQuery(queryText, activeId, controller.signal);
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
  const handleSuggestionClick = (suggestion) => {
    if (isLoading || isStreaming) return;
    executeQuery(suggestion);
  };
  const handleFollowUpSubmit = (query) => {
    if (isLoading || isStreaming || !query.trim()) return;
    setMessages((prev) => [
      ...prev.filter((m) => m.type !== "follow-up"),
      {
        id: `user-${Date.now()}`,
        type: "narrative",
        content: `**Follow-up question:** *${query}*`,
        timestamp: Date.now()
      }
    ]);
    executeQuery(query);
  };
  if (errorMsg) {
    return <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-text-secondary"><div className="max-w-md w-full border border-drs-cyan/30 bg-panel/50 rounded-card p-8 flex flex-col gap-6 items-center text-center shadow-lg relative overflow-hidden backdrop-blur-md"><div className="absolute inset-0 bg-[linear-gradient(to_right,#1c2025_1px,transparent_1px),linear-gradient(to_bottom,#1c2025_1px,transparent_1px)] bg-[size:24px_24px] opacity-5" /><div className="w-12 h-12 rounded-full border border-drs-cyan/20 flex items-center justify-center bg-drs-cyan/5 animate-pulse"><span className="text-drs-cyan font-bold text-lg font-mono">!</span></div><div className="flex flex-col gap-2"><h2 className="text-md font-mono text-text-primary uppercase tracking-widest">System Alert</h2><p className="text-text-muted text-xs leading-relaxed">{errorMsg}</p></div><div className="flex gap-4 w-full pt-2"><button
      onClick={() => executeQuery(questionTitle)}
      className="flex-1 py-2.5 px-4 rounded-button bg-drs-cyan text-canvas hover:bg-drs-cyan-hover transition-colors font-mono text-xs uppercase tracking-wider font-bold"
    >
              Retry Connection
            </button><button
      onClick={() => navigate("/")}
      className="flex-1 py-2.5 px-4 rounded-button border border-fw-border text-text-primary hover:bg-panel transition-colors font-mono text-xs uppercase tracking-wider"
    >
              Go Home
            </button></div></div></div>;
  }
  return <div className="min-h-screen bg-canvas text-text-secondary flex flex-col font-sans selection:bg-drs-cyan/20 selection:text-drs-cyan">{
    /* Navigation Header */
  }<BriefingHeader
    breadcrumbs={breadcrumbs}
    sessionState={isStreaming ? "streaming" : isLoading ? "loading" : "idle"}
    onLogoClick={() => navigate("/")}
    onBreadcrumbClick={(index) => {
      if (index === 0) navigate("/");
      if (index === 1) navigate(`/race/${sessionId}`);
    }}
  />{
    /* Main Investigation Canvas */
  }<div className="flex-1 flex w-full max-w-[1440px] mx-auto overflow-hidden"><main
    className={cn(
      "flex-1 flex flex-col justify-between py-6 px-4 transition-all duration-300",
      expandedTelemetry ? "max-w-[720px]" : "max-w-thread mx-auto"
    )}
  >{
    /* Question Header & Title Section */
  }<div className="border-b border-fw-border pb-4 mb-6 flex flex-col gap-3"><div className="flex items-center justify-between"><span className="text-mono-meta font-mono text-drs-cyan uppercase tracking-widest">
                INVESTIGATION_THREAD // {sessionId.toUpperCase()}</span><button
    onClick={handleToggleSave}
    className={cn(
      "px-3 py-1 rounded-button font-mono text-[10px] uppercase tracking-wider border transition-colors flex items-center gap-1.5",
      isSaved ? "border-drs-cyan bg-drs-cyan/10 text-drs-cyan" : "border-fw-border text-text-muted hover:text-text-primary hover:bg-panel"
    )}
  ><span>{isSaved ? "\u2605 SAVED" : "\u2606 SAVE DEBRIEF"}</span></button></div><h1 className="text-display-sm text-text-primary">{questionTitle}</h1></div>{
    /* Messages list container */
  }<div className="flex flex-col gap-6 flex-1 overflow-y-auto pr-1">{
    /* Latency & Metadata Bar */
  }{latency && providerInfo && !isLoading && <div className="flex items-center gap-4 text-[10px] font-mono text-text-muted border-b border-fw-border pb-3 mb-2 animate-slide-up"><div><span>GENERATED_IN: </span><span className="text-drs-cyan">{latency}s</span></div><div className="w-1.5 h-1.5 rounded-full bg-fw-border" /><div><span>PROVIDER: </span><span className="text-text-primary uppercase">{providerInfo.provider}</span></div><div className="w-1.5 h-1.5 rounded-full bg-fw-border" /><div><span>MODEL: </span><span className="text-text-muted font-mono">{providerInfo.model}</span></div></div>}{
    /* Loading Indicator inside thread layout */
  }{isLoading && <div className="flex flex-col gap-4 my-4 animate-slide-up"><AIThinkingIndicator stage={loadingStage} detail={loadingDetail} /><button
    onClick={handleCancel}
    className="self-center px-4 py-1.5 border border-drs-cyan/20 hover:border-drs-cyan text-drs-cyan hover:bg-drs-cyan/5 transition-colors rounded-button font-mono text-[10px] uppercase tracking-widest"
  >
                  Cancel Investigation
                </button></div>}{
    /* Sequential Messages Hierarchy: AI Verdict -> Narrative -> Charts -> Evidence -> Follow-ups */
  }{messages.map((msg) => {
    if (msg.type === "verdict") {
      return <VerdictBlock
        key={msg.id}
        verdict={msg.content}
        confidence={lastResponse?.confidence || 87}
        className="animate-slide-up"
      />;
    }
    if (msg.type === "narrative") {
      return <div key={msg.id} className="flex flex-col gap-4 animate-slide-up"><NarrativeStream content={msg.content} isStreaming={isStreaming} />{
        /* Reasoning Panel */
      }{!isStreaming && (lastResponse?.evidence?.simulation_tool || lastResponse?.evidence?.telemetry_tool) && <ExplanationPanel
        steps={activeReasoningSteps}
        conclusion={lastResponse?.investigation_report?.["Final Recommendation"] || lastResponse?.final_answer?.slice(0, 120) || "Strategic debrief completed."}
      />}</div>;
    }
    if (msg.type === "evidence-strategy" && msg.evidenceData) {
      const stratData = msg.evidenceData;
      return <EvidenceCard
        key={msg.id}
        title="STINT_STRATEGY_DEVIATION"
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
      const driverCodeA = telemetryToolData?.driver_id?.toUpperCase() || "PIA";
      const driverCodeB = telemetryToolData?.comparative_driver_id?.toUpperCase() || "SAI";
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
      const driverCodeA = telemetryToolData?.driver_id?.toUpperCase() || vis.driverCode || "VER";
      const telemetryDataA = telemetryToolData?.telemetry || [];
      const lapNumber = telemetryToolData?.lap_number || 1;
      return <div key={msg.id} className="flex flex-col gap-6 animate-slide-up"><div className="text-mono-meta font-mono text-drs-cyan uppercase tracking-widest border-b border-fw-border pb-2">
                      PRODUCTION_TELEMETRY_VISUALIZATION // 5_CHART_MATRIX
                    </div><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{
        /* 1. Lap Time Graph */
      }<LapTimeGraph
        data={vis.lapTimes}
        driverCode={driverCodeA}
      />{
        /* 2. Tyre Degradation */
      }<TyreDegradationGraph
        data={vis.tyreDeg}
        driverCode={driverCodeA}
      /></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{
        /* 3. Sector Comparison */
      }<SectorComparisonGraph
        data={vis.sectorTimes}
        driverCode={driverCodeA}
      />{
        /* 4. Speed Trace */
      }<TelemetryCard
        driverA={{ code: driverCodeA, color: "#00E5FF", data: telemetryDataA }}
        metric="speed"
        lapNumber={lapNumber}
        trackName={trackName}
        variant="collapsed"
        onExpand={() => setExpandedTelemetry({
          driverA: driverCodeA,
          metric: "speed",
          lapNumber
        })}
      /></div>{
        /* 5. Pit Window Timeline */
      }{vis.pitWindow && vis.pitWindow.pittingDriver && <PitWindowVisualizer
        pittingDriver={vis.pitWindow.pittingDriver}
        rivals={vis.pitWindow.rivals || []}
      />}</div>;
    }
    if (msg.type === "follow-up" && msg.evidenceData && !isStreaming) {
      return <FollowUpSuggestions
        key={msg.id}
        suggestions={msg.evidenceData}
        onSuggestionClick={handleSuggestionClick}
      />;
    }
    return null;
  })}</div>{
    /* Bottom-docked QuestionBar */
  }<div className="border-t border-fw-border pt-4 mt-6"><QuestionBar
    variant="inline"
    placeholder="Ask a follow-up or enter custom what-if scenario..."
    disabled={isStreaming || isLoading}
    onSubmit={handleFollowUpSubmit}
    contextLabel="RE_ENGINEER"
  /></div></main>{
    /* Right Pane: Split Screen Interactive Telemetry Overlay */
  }{expandedTelemetry && (() => {
    const telemetryToolData = lastResponse?.evidence?.telemetry_tool;
    const telemetryDataA = telemetryToolData?.telemetry || [];
    const telemetryDataB = telemetryToolData?.comparative_telemetry || [];
    return <aside className="hidden lg:flex w-[600px] border-l border-fw-border bg-panel flex-col animate-slide-in-right p-4 overflow-y-auto"><div className="flex justify-between items-center border-b border-fw-border pb-3 mb-4"><span className="text-mono-meta font-mono text-drs-cyan uppercase tracking-widest">
                  SPLIT_SCREEN_ANALYSIS // OVERLAY
                </span><button
      onClick={() => setExpandedTelemetry(null)}
      className="text-text-muted hover:text-text-primary font-mono text-mono-meta"
    >
                  [CLOSE]
                </button></div><div className="flex flex-col gap-6"><TelemetryCard
      driverA={{ code: expandedTelemetry.driverA, color: "#00E5FF", data: telemetryDataA }}
      driverB={{ code: expandedTelemetry.driverB || "", color: "#FFD600", data: telemetryDataB }}
      metric={expandedTelemetry.metric}
      lapNumber={expandedTelemetry.lapNumber}
      trackName={trackName}
      highlightZone={{ startM: 1e3, endM: 1500 }}
      variant="expanded"
    /><TelemetryCard
      driverA={{ code: expandedTelemetry.driverA, color: "#00E5FF", data: telemetryDataA }}
      driverB={{ code: expandedTelemetry.driverB || "", color: "#FFD600", data: telemetryDataB }}
      metric="throttle"
      lapNumber={expandedTelemetry.lapNumber}
      trackName={trackName}
      variant="expanded"
    /><TelemetryCard
      driverA={{ code: expandedTelemetry.driverA, color: "#00E5FF", data: telemetryDataA }}
      driverB={{ code: expandedTelemetry.driverB || "", color: "#FFD600", data: telemetryDataB }}
      metric="brake"
      lapNumber={expandedTelemetry.lapNumber}
      trackName={trackName}
      variant="expanded"
    /></div></aside>;
  })()}</div></div>;
}
