import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BriefingHeader } from '@/components/BriefingHeader';
import { QuestionBar } from '@/components/QuestionBar';
import { VerdictBlock } from '@/components/VerdictBlock';
import { NarrativeStream } from '@/components/NarrativeStream';
import { EvidenceCard } from '@/components/EvidenceCard';
import { StrategyTimeline } from '@/components/StrategyTimeline';
import { TelemetryCard } from '@/components/TelemetryCard';
import { SimulationResult } from '@/components/SimulationResult';
import { FollowUpSuggestions } from '@/components/FollowUpSuggestions';
import { ExplanationPanel } from '@/components/ExplanationPanel';
import { AIThinkingIndicator } from '@/components/AIThinkingIndicator';
import { LapTimeGraph } from '@/components/LapTimeGraph';
import { TyreDegradationGraph } from '@/components/TyreDegradationGraph';
import { SectorComparisonGraph } from '@/components/SectorComparisonGraph';
import { PitWindowVisualizer } from '@/components/PitWindowVisualizer';
import { cn } from '@/lib/utils';
import {
  AUSTRIAN_GP,
  TELEMETRY_PIA_LAP42,
  TELEMETRY_SAI_LAP42,
} from '@/lib/data';
import type { ThreadMessage, BreadcrumbItem, Stint, AIStage } from '@/lib/types';
import { submitEngineerQuery, fetchInvestigationById, toggleSaveInvestigation } from '@/lib/api';

export function normalizeStints(stintsList: any[], isActual: boolean): Stint[] {
  if (!stintsList || !Array.isArray(stintsList)) return [];
  return stintsList.map((s: any) => ({
    compound: (s.compound || s.compound_id || 'medium').toLowerCase() as any,
    startLap: s.start_lap || s.start || 1,
    endLap: s.end_lap || s.end || 71,
    wearSlope: s.wear_slope || s.wearSlope || 0.05,
    isActual: isActual
  }));
}

export function formatTimeSeconds(seconds: number): string {
  if (!seconds) return '1:26:42.880';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toFixed(3).padStart(6, '0')}`;
}

function mapResponseToMessages(id: string, response: any, timestamp: number, isLast: boolean): ThreadMessage[] {
  const evidence = response.evidence || {};
  const callouts: any[] = [];
  
  if (evidence.simulation_tool) {
    const sim = evidence.simulation_tool;
    const gainSec = (sim.simulated_net_time_gain_ms || 0) / 1000;
    const sign = gainSec >= 0 ? '+' : '';
    callouts.push({
      text: `Net time gain: ${sign}${gainSec.toFixed(3)}s`,
      type: gainSec >= 0 ? 'gain' : 'loss'
    });
    if (sim.position_change !== undefined) {
      callouts.push({
        text: `Position change: ${sim.position_change >= 0 ? '+' : ''}${sim.position_change}`,
        type: sim.position_change >= 0 ? 'gain' : 'loss'
      });
    }
  }
  
  if (evidence.scoring_tool) {
    const score = evidence.scoring_tool;
    if (score.composite_score !== undefined) {
      callouts.push({
        text: `Composite Score: ${score.composite_score}`,
        type: 'neutral'
      });
    }
  }

  const verdictText = response.investigation_report?.["Executive Summary"] || response.final_answer || 'No verdict generated.';
  let narrativeContent = '';
  
  if (response.investigation_report) {
    const rep = response.investigation_report;
    const parts = [];
    if (rep["Reasoning Graph Text"]) {
      parts.push(`**Root-Cause Reasoning Graph:**\n${rep["Reasoning Graph Text"]}`);
    }
    if (rep["Telemetry Findings"] && rep["Telemetry Findings"] !== "Unavailable" && rep["Telemetry Findings"] !== "No telemetry anomalies detected.") {
      parts.push(`**Telemetry Findings:** ${rep["Telemetry Findings"]}`);
    }
    if (rep["Simulation Findings"] && rep["Simulation Findings"] !== "Unavailable" && rep["Simulation Findings"] !== "No strategy simulations were run.") {
      parts.push(`**Simulation Findings:** ${rep["Simulation Findings"]}`);
    }
    if (rep["Historical Findings"] && rep["Historical Findings"] !== "Unavailable" && rep["Historical Findings"] !== "No historical standings parsed.") {
      parts.push(`**Historical Findings:** ${rep["Historical Findings"]}`);
    }
    if (rep["Regulations Findings"] && rep["Regulations Findings"] !== "Unavailable") {
      parts.push(`**Regulations Findings:** ${rep["Regulations Findings"]}`);
    }
    if (rep["Alternative Scenarios"] && rep["Alternative Scenarios"] !== "Unavailable" && rep["Alternative Scenarios"] !== "Maintain current compound stint guidelines.") {
      parts.push(`**Alternative Scenarios:** ${rep["Alternative Scenarios"]}`);
    }
    if (rep["Final Recommendation"] && rep["Final Recommendation"] !== "Unavailable" && rep["Final Recommendation"] !== "Continue with plan.") {
      parts.push(`**Recommendation:** ${rep["Final Recommendation"]}`);
    }
    if (parts.length > 0) {
      narrativeContent = parts.join('\n\n');
    }
  }
  
  if (!narrativeContent) {
    narrativeContent = response.explanations?.engineer || response.final_answer || 'No narrative details provided.';
  }

  if (narrativeContent === verdictText) {
    narrativeContent = response.explanations?.engineer || 'Strategic debrief completed successfully.';
  }

  const messages: ThreadMessage[] = [
    {
      id: `verdict-${id}-${timestamp}`,
      type: 'verdict',
      content: verdictText,
      timestamp: timestamp,
    },
    {
      id: `narrative-${id}-${timestamp}`,
      type: 'narrative',
      content: narrativeContent,
      callouts: callouts.length > 0 ? callouts : undefined,
      timestamp: timestamp + 500,
    }
  ];

  // Push Production Visualizations ONLY if real telemetry evidence exists in response
  const telemData = evidence.telemetry_tool;
  const simData = evidence.simulation_tool;

  if (telemData && (telemData.lap_times || telemData.telemetry || telemData.sector_times)) {
    const driverCode = (telemData.driver_id || (simData && simData.driver_id) || 'DRV').toUpperCase();
    messages.push({
      id: `visualizations-${id}-${timestamp}`,
      type: 'production-visualizations',
      content: 'Production Telemetry Visualizations',
      evidenceData: {
        lapTimes: telemData.lap_times || [],
        tyreDeg: telemData.tyre_degradation || [],
        sectorTimes: telemData.sector_times || [],
        pitWindow: simData && simData.pit_windows ? {
          pittingDriver: {
            code: driverCode,
            exitLap: simData.actual_pit_lap || simData.pit_stop_lap || 22,
            pitLossTime: simData.traffic_loss || 22.0
          },
          rivals: simData.rivals || []
        } : null,
        driverCode: driverCode
      },
      timestamp: timestamp + 1200,
    });
  }

  if (isLast) {
    const suggestedFollowups = [
      'Compare lap timings and delta analysis',
      'Show me the pit exit traffic window details',
      'Analyze tire pace decay comparisons',
      'Show details of teammate telemetry margin'
    ];
    
    messages.push({
      id: `followup-${id}-${timestamp}`,
      type: 'follow-up',
      content: '',
      evidenceData: suggestedFollowups,
      timestamp: timestamp + 2000,
    });
  }

  return messages;
}

export function InvestigationThread() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState<AIStage>('parsing');
  const [loadingDetail, setLoadingDetail] = useState<string>('Initializing AI Race Engineer...');
  const [latency, setLatency] = useState<number | null>(null);
  const [providerInfo, setProviderInfo] = useState<{ provider: string; model: string } | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [questionTitle, setQuestionTitle] = useState<string>('Investigation Thread');

  // Split-screen dual pane state for wide desktop (>1024px)
  const [expandedTelemetry, setExpandedTelemetry] = useState<{
    driverA: string;
    driverB?: string | null;
    metric: 'speed' | 'throttle' | 'brake' | 'gear';
    lapNumber: number;
  } | null>(null);

  // Load stored exchange
  const stored = localStorage.getItem(`frontwing_investigation_${id}`);
  const investigationData = stored ? JSON.parse(stored) : null;
  const lastExchange = investigationData?.exchanges?.[investigationData.exchanges.length - 1];

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Investigation Thread', href: '#' },
    { label: questionTitle, href: '#' },
  ];

  const lastResponse = lastExchange?.response;
  
  const sessionId = lastResponse?.evidence?.simulation_tool?.session_id || lastResponse?.evidence?.telemetry_tool?.session_id || AUSTRIAN_GP.id;
  const trackName = lastResponse?.evidence?.telemetry_tool?.session_id 
    ? lastResponse.evidence.telemetry_tool.session_id.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
    : AUSTRIAN_GP.circuit;
  const planningSteps = lastResponse?.planning_steps || [];
  const reasoningSteps = planningSteps.map((step: string, idx: number) => {
    const [toolName, rawParams] = step.split('|');
    return {
      title: `Step ${idx + 1}: ${toolName.replace('_', ' ').toUpperCase()}`,
      description: `Dispatched tool ${toolName} with parameters: ${rawParams || 'None'}. Collected timing metrics and strategist inputs.`,
      dataReference: `Chief Race Engineer execution plan`,
      confidence: lastResponse?.confidence || 87,
    };
  });
  
  const defaultReasoningSteps = [
    {
      title: 'Executing AI Race Engineer Plan',
      description: lastResponse?.final_answer?.slice(0, 150) + '...',
      dataReference: 'Chief Race Engineer fallback execution plan',
      confidence: lastResponse?.confidence || 80
    }
  ];
  
  const activeReasoningSteps = reasoningSteps.length > 0 ? reasoningSteps : defaultReasoningSteps;

  // Rotating loading status messages & stage progress
  useEffect(() => {
    if (!isLoading) return;
    const stages: { stage: AIStage; detail: string }[] = [
      { stage: 'parsing', detail: 'Parsing intent and telemetry parameters...' },
      { stage: 'loading_data', detail: 'Querying FastF1 timing matrices...' },
      { stage: 'computing', detail: 'Running strategy regressions & simulations...' },
      { stage: 'generating', detail: 'Synthesizing race debrief report...' },
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % stages.length;
      setLoadingStage(stages[idx].stage);
      setLoadingDetail(stages[idx].detail);
    }, 1200);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Execute query or restore thread on load
  useEffect(() => {
    if (!id) return;
    initInvestigation(id);
  }, [id]);

  const initInvestigation = async (targetId: string) => {
    // 1. Attempt backend restoration first
    try {
      const remoteItem = await fetchInvestigationById(targetId);
      if (remoteItem && remoteItem.ai_response) {
        setQuestionTitle(remoteItem.question);
        setIsSaved(!!remoteItem.is_saved);
        const msgs = mapResponseToMessages(targetId, remoteItem.ai_response, new Date(remoteItem.timestamp).getTime(), true);
        setMessages(msgs);
        setIsLoading(false);
        setErrorMsg(null);
        return;
      }
    } catch (err) {
      console.log('[InvestigationThread] Remote fetch skipped, checking local storage:', err);
    }

    // 2. Fallback to local storage
    const stored = localStorage.getItem(`frontwing_investigation_${targetId}`);
    if (stored) {
      const data = JSON.parse(stored);
      setQuestionTitle(data.question || 'Investigation Thread');
      setIsSaved(!!data.is_saved);

      if (data.status === 'loading') {
        executeQuery(data.question);
      } else {
        if (!data.exchanges) {
          data.exchanges = [{
            question: data.question || 'Initial question',
            response: data.response,
            timestamp: data.timestamp || Date.now()
          }];
          localStorage.setItem(`frontwing_investigation_${targetId}`, JSON.stringify(data));
        }
        const lastEx = data.exchanges[data.exchanges.length - 1];
        const allMessages = lastEx
          ? mapResponseToMessages(targetId, lastEx.response, lastEx.timestamp, true)
          : [];
        setMessages(allMessages);
        
        if (lastEx && lastEx.response) {
          const trace = lastEx.response.intelligence_trace || {};
          const provider = trace.llm_provider || 'Gemini';
          const model = trace.llm_model || 'gemini-2.0-flash';
          const hasFailover = trace.failover_reason && trace.failover_reason !== 'None';
          setProviderInfo({
            provider: hasFailover ? `${provider} (Failover)` : provider,
            model: model
          });
          const elapsed = trace.llm_latency ? (trace.llm_latency / 1000).toFixed(1) : '2.1';
          setLatency(parseFloat(elapsed));
        }
        
        setIsLoading(false);
        setErrorMsg(null);
      }
    } else {
      // Lazy fallback if directly loading a dynamic URL
      const fallbackQuestion = "Could Ferrari have won the Austrian Grand Prix?";
      setQuestionTitle(fallbackQuestion);
      const data = {
        id: targetId,
        question: fallbackQuestion,
        status: 'loading',
        exchanges: [],
        timestamp: Date.now()
      };
      localStorage.setItem(`frontwing_investigation_${targetId}`, JSON.stringify(data));
      executeQuery(fallbackQuestion);
    }
  };

  const executeQuery = async (queryText: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setLoadingStage('parsing');
    setLoadingDetail('Initializing AI Race Engineer...');
    setQuestionTitle(queryText);
    
    const controller = new AbortController();
    setAbortController(controller);
    const startTime = Date.now();

    try {
      const apiResponse = await submitEngineerQuery(queryText, id, controller.signal);
      
      const endTime = Date.now();
      const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(1);
      
      const trace = apiResponse.intelligence_trace || {};
      const provider = trace.llm_provider || 'Gemini';
      const model = trace.llm_model || 'gemini-2.0-flash';
      const hasFailover = trace.failover_reason && trace.failover_reason !== 'None';
      
      setLatency(parseFloat(elapsedSeconds));
      setProviderInfo({
        provider: hasFailover ? `${provider} (Failover)` : provider,
        model: model
      });

      // Persist Backend UUID if returned
      const backendUuid = (apiResponse as any).id;
      const targetId = backendUuid || id;

      // Update local storage
      const stored = localStorage.getItem(`frontwing_investigation_${targetId}`);
      const data = stored ? JSON.parse(stored) : { id: targetId, question: queryText, exchanges: [] };
      if (!data.exchanges) {
        data.exchanges = [];
      }
      
      data.exchanges.push({
        question: queryText,
        response: apiResponse,
        timestamp: Date.now()
      });
      data.status = 'completed';
      localStorage.setItem(`frontwing_investigation_${targetId}`, JSON.stringify(data));

      if (backendUuid && backendUuid !== id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(backendUuid)) {
        navigate(`/investigation/${backendUuid}`, { replace: true });
      }

      setIsLoading(false);
      setAbortController(null);

      // Stream blocks progressively
      await streamResponseProgressively(apiResponse, targetId, Date.now());

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[InvestigationThread] Fetch aborted by client.');
        return;
      }
      console.error('[InvestigationThread] Fetch error:', error);
      setIsLoading(false);
      setAbortController(null);
      setErrorMsg(error.message || 'An error occurred while communicating with the AI Race Engineer.');
    }
  };

  const streamResponseProgressively = async (apiResponse: any, newId: string, timestamp: number) => {
    setIsStreaming(true);
    
    const newMsgs = mapResponseToMessages(newId, apiResponse, timestamp, true);
    
    setMessages([]);
    for (let i = 0; i < newMsgs.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setMessages((prev) => [...prev, newMsgs[i]]);
    }
    
    setIsStreaming(false);
  };

  const handleToggleSave = async () => {
    if (!id) return;
    try {
      const res = await toggleSaveInvestigation(id);
      setIsSaved(res.saved);
    } catch {
      // Toggle local state fallback
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
    navigate('/');
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (isLoading || isStreaming) return;
    executeQuery(suggestion);
  };

  const handleFollowUpSubmit = (query: string) => {
    if (isLoading || isStreaming || !query.trim()) return;
    
    setMessages((prev) => [
      ...prev.filter(m => m.type !== 'follow-up'),
      {
        id: `user-${Date.now()}`,
        type: 'narrative',
        content: `**Follow-up question:** *${query}*`,
        timestamp: Date.now()
      }
    ]);
    
    executeQuery(query);
  };

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-text-secondary">
        <div className="max-w-md w-full border border-drs-cyan/30 bg-panel/50 rounded-card p-8 flex flex-col gap-6 items-center text-center shadow-lg relative overflow-hidden backdrop-blur-md">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1c2025_1px,transparent_1px),linear-gradient(to_bottom,#1c2025_1px,transparent_1px)] bg-[size:24px_24px] opacity-5" />
          <div className="w-12 h-12 rounded-full border border-drs-cyan/20 flex items-center justify-center bg-drs-cyan/5 animate-pulse">
            <span className="text-drs-cyan font-bold text-lg font-mono">!</span>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-md font-mono text-text-primary uppercase tracking-widest">System Alert</h2>
            <p className="text-text-muted text-xs leading-relaxed">{errorMsg}</p>
          </div>
          <div className="flex gap-4 w-full pt-2">
            <button
              onClick={() => executeQuery(questionTitle)}
              className="flex-1 py-2.5 px-4 rounded-button bg-drs-cyan text-canvas hover:bg-drs-cyan-hover transition-colors font-mono text-xs uppercase tracking-wider font-bold"
            >
              Retry Connection
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex-1 py-2.5 px-4 rounded-button border border-fw-border text-text-primary hover:bg-panel transition-colors font-mono text-xs uppercase tracking-wider"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-text-secondary flex flex-col font-sans selection:bg-drs-cyan/20 selection:text-drs-cyan">
      {/* Navigation Header */}
      <BriefingHeader
        breadcrumbs={breadcrumbs}
        sessionState={isStreaming ? 'streaming' : isLoading ? 'loading' : 'idle'}
        onLogoClick={() => navigate('/')}
        onBreadcrumbClick={(index) => {
          if (index === 0) navigate('/');
          if (index === 1) navigate(`/race/${sessionId}`);
        }}
      />

      {/* Main Investigation Canvas */}
      <div className="flex-1 flex w-full max-w-[1440px] mx-auto overflow-hidden">
        <main
          className={cn(
            'flex-1 flex flex-col justify-between py-6 px-4 transition-all duration-300',
            expandedTelemetry ? 'max-w-[720px]' : 'max-w-thread mx-auto'
          )}
        >
          {/* Question Header & Title Section */}
          <div className="border-b border-fw-border pb-4 mb-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-mono-meta font-mono text-drs-cyan uppercase tracking-widest">
                INVESTIGATION_THREAD // {sessionId.toUpperCase()}
              </span>
              <button
                onClick={handleToggleSave}
                className={cn(
                  'px-3 py-1 rounded-button font-mono text-[10px] uppercase tracking-wider border transition-colors flex items-center gap-1.5',
                  isSaved
                    ? 'border-drs-cyan bg-drs-cyan/10 text-drs-cyan'
                    : 'border-fw-border text-text-muted hover:text-text-primary hover:bg-panel'
                )}
              >
                <span>{isSaved ? '★ SAVED' : '☆ SAVE DEBRIEF'}</span>
              </button>
            </div>
            <h1 className="text-display-sm text-text-primary">
              {questionTitle}
            </h1>
          </div>

          {/* Messages list container */}
          <div className="flex flex-col gap-6 flex-1 overflow-y-auto pr-1">
            {/* Latency & Metadata Bar */}
            {latency && providerInfo && !isLoading && (
              <div className="flex items-center gap-4 text-[10px] font-mono text-text-muted border-b border-fw-border pb-3 mb-2 animate-slide-up">
                <div>
                  <span>GENERATED_IN: </span>
                  <span className="text-drs-cyan">{latency}s</span>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-fw-border" />
                <div>
                  <span>PROVIDER: </span>
                  <span className="text-text-primary uppercase">{providerInfo.provider}</span>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-fw-border" />
                <div>
                  <span>MODEL: </span>
                  <span className="text-text-muted font-mono">{providerInfo.model}</span>
                </div>
              </div>
            )}

            {/* Loading Indicator inside thread layout */}
            {isLoading && (
              <div className="flex flex-col gap-4 my-4 animate-slide-up">
                <AIThinkingIndicator stage={loadingStage} detail={loadingDetail} />
                <button
                  onClick={handleCancel}
                  className="self-center px-4 py-1.5 border border-drs-cyan/20 hover:border-drs-cyan text-drs-cyan hover:bg-drs-cyan/5 transition-colors rounded-button font-mono text-[10px] uppercase tracking-widest"
                >
                  Cancel Investigation
                </button>
              </div>
            )}

            {/* Sequential Messages Hierarchy: AI Verdict -> Narrative -> Charts -> Evidence -> Follow-ups */}
            {messages.map((msg) => {
              if (msg.type === 'verdict') {
                return (
                  <VerdictBlock
                    key={msg.id}
                    verdict={msg.content}
                    confidence={lastResponse?.confidence || 87}
                    className="animate-slide-up"
                  />
                );
              }

              if (msg.type === 'narrative') {
                return (
                  <div key={msg.id} className="flex flex-col gap-4 animate-slide-up">
                    <NarrativeStream content={msg.content} isStreaming={isStreaming} />

                    {/* Reasoning Panel */}
                    {!isStreaming && (lastResponse?.evidence?.simulation_tool || lastResponse?.evidence?.telemetry_tool) && (
                      <ExplanationPanel
                        steps={activeReasoningSteps}
                        conclusion={lastResponse?.investigation_report?.["Final Recommendation"] || lastResponse?.final_answer?.slice(0, 120) || 'Strategic debrief completed.'}
                      />
                    )}
                  </div>
                );
              }

              if (msg.type === 'evidence-strategy' && msg.evidenceData) {
                const stratData = msg.evidenceData as {
                  actual: any[];
                  simulated: any[];
                  driverCode: string;
                  totalLaps: number;
                };

                return (
                  <EvidenceCard
                    key={msg.id}
                    title="STINT_STRATEGY_DEVIATION"
                    subtitle={`${stratData.driverCode} Stint Length Plan`}
                    variant="expanded"
                    className="animate-slide-up"
                  >
                    <StrategyTimeline
                      stints={stratData.actual}
                      simulated={stratData.simulated}
                      totalLaps={stratData.totalLaps}
                      driverCode={stratData.driverCode}
                      variant="comparison"
                    />
                  </EvidenceCard>
                );
              }

              if (msg.type === 'evidence-simulation' && msg.evidenceData) {
                const telemetryToolData = lastResponse?.evidence?.telemetry_tool;
                const driverCodeA = telemetryToolData?.driver_id?.toUpperCase() || 'PIA';
                const driverCodeB = telemetryToolData?.comparative_driver_id?.toUpperCase() || 'SAI';
                const telemetryDataA = telemetryToolData?.telemetry || TELEMETRY_PIA_LAP42;
                const telemetryDataB = telemetryToolData?.comparative_telemetry || TELEMETRY_SAI_LAP42;
                const lapNumber = telemetryToolData?.lap_number || 42;

                return (
                  <div key={msg.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up">
                    <SimulationResult
                      result={msg.evidenceData as any}
                      variant="detailed"
                      onDrillDown={() => navigate(`/strategy/${sessionId}`)}
                    />

                    {/* Telemetry card inside thread */}
                    <TelemetryCard
                      driverA={{ code: driverCodeA, color: '#FF8000', data: telemetryDataA }}
                      driverB={{ code: driverCodeB, color: '#E80020', data: telemetryDataB }}
                      metric="speed"
                      lapNumber={lapNumber}
                      trackName={trackName}
                      highlightZone={{ startM: 1000, endM: 1500 }}
                      variant="collapsed"
                      onExpand={() =>
                        setExpandedTelemetry({
                          driverA: driverCodeA,
                          driverB: driverCodeB,
                          metric: 'speed',
                          lapNumber: lapNumber,
                        })
                      }
                    />
                  </div>
                );
              }

              if (msg.type === 'production-visualizations' && msg.evidenceData) {
                const vis = msg.evidenceData as any;
                const telemetryToolData = lastResponse?.evidence?.telemetry_tool;
                const driverCodeA = vis.driverCode || 'SAI';
                const telemetryDataA = telemetryToolData?.telemetry || TELEMETRY_PIA_LAP42;
                const lapNumber = telemetryToolData?.lap_number || 22;

                return (
                  <div key={msg.id} className="flex flex-col gap-6 animate-slide-up">
                    <div className="text-mono-meta font-mono text-drs-cyan uppercase tracking-widest border-b border-fw-border pb-2">
                      PRODUCTION_TELEMETRY_VISUALIZATION // 5_CHART_MATRIX
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 1. Lap Time Graph */}
                      <LapTimeGraph
                        data={vis.lapTimes}
                        driverCode={driverCodeA}
                      />

                      {/* 2. Tyre Degradation */}
                      <TyreDegradationGraph
                        data={vis.tyreDeg}
                        driverCode={driverCodeA}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 3. Sector Comparison */}
                      <SectorComparisonGraph
                        data={vis.sectorTimes}
                        driverCode={driverCodeA}
                      />

                      {/* 4. Speed Trace */}
                      <TelemetryCard
                        driverA={{ code: driverCodeA, color: '#00E5FF', data: telemetryDataA }}
                        metric="speed"
                        lapNumber={lapNumber}
                        trackName={trackName}
                        variant="collapsed"
                        onExpand={() =>
                          setExpandedTelemetry({
                            driverA: driverCodeA,
                            metric: 'speed',
                            lapNumber: lapNumber,
                          })
                        }
                      />
                    </div>

                    {/* 5. Pit Window Timeline */}
                    <PitWindowVisualizer
                      pittingDriver={vis.pitWindow.pittingDriver}
                      rivals={vis.pitWindow.rivals}
                    />
                  </div>
                );
              }

              if (msg.type === 'follow-up' && msg.evidenceData && !isStreaming) {
                return (
                  <FollowUpSuggestions
                    key={msg.id}
                    suggestions={msg.evidenceData as string[]}
                    onSuggestionClick={handleSuggestionClick}
                  />
                );
              }

              return null;
            })}
          </div>

          {/* Bottom-docked QuestionBar */}
          <div className="border-t border-fw-border pt-4 mt-6">
            <QuestionBar
              variant="inline"
              placeholder="Ask a follow-up or enter custom what-if scenario..."
              disabled={isStreaming || isLoading}
              onSubmit={handleFollowUpSubmit}
              contextLabel="RE_ENGINEER"
            />
          </div>
        </main>

        {/* Right Pane: Split Screen Interactive Telemetry Overlay */}
        {expandedTelemetry && (() => {
          const telemetryToolData = lastResponse?.evidence?.telemetry_tool;
          const telemetryDataA = telemetryToolData?.telemetry || TELEMETRY_PIA_LAP42;
          const telemetryDataB = telemetryToolData?.comparative_telemetry || TELEMETRY_SAI_LAP42;

          return (
            <aside className="hidden lg:flex w-[600px] border-l border-fw-border bg-panel flex-col animate-slide-in-right p-4 overflow-y-auto">
              <div className="flex justify-between items-center border-b border-fw-border pb-3 mb-4">
                <span className="text-mono-meta font-mono text-drs-cyan uppercase tracking-widest">
                  SPLIT_SCREEN_ANALYSIS // OVERLAY
                </span>
                <button
                  onClick={() => setExpandedTelemetry(null)}
                  className="text-text-muted hover:text-text-primary font-mono text-mono-meta"
                >
                  [CLOSE]
                </button>
              </div>

              <div className="flex flex-col gap-6">
                <TelemetryCard
                  driverA={{ code: expandedTelemetry.driverA, color: '#00E5FF', data: telemetryDataA }}
                  driverB={{ code: expandedTelemetry.driverB || '', color: '#FFD600', data: telemetryDataB }}
                  metric={expandedTelemetry.metric}
                  lapNumber={expandedTelemetry.lapNumber}
                  trackName={trackName}
                  highlightZone={{ startM: 1000, endM: 1500 }}
                  variant="expanded"
                />

                <TelemetryCard
                  driverA={{ code: expandedTelemetry.driverA, color: '#00E5FF', data: telemetryDataA }}
                  driverB={{ code: expandedTelemetry.driverB || '', color: '#FFD600', data: telemetryDataB }}
                  metric="throttle"
                  lapNumber={expandedTelemetry.lapNumber}
                  trackName={trackName}
                  variant="expanded"
                />

                <TelemetryCard
                  driverA={{ code: expandedTelemetry.driverA, color: '#00E5FF', data: telemetryDataA }}
                  driverB={{ code: expandedTelemetry.driverB || '', color: '#FFD600', data: telemetryDataB }}
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
