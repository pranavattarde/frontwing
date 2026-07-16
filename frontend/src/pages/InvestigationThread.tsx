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
import { cn } from '@/lib/utils';
import {
  AUSTRIAN_GP,
  TELEMETRY_PIA_LAP42,
  TELEMETRY_SAI_LAP42,
} from '@/lib/data';
import type { ThreadMessage, BreadcrumbItem, Stint } from '@/lib/types';
import { submitEngineerQuery } from '@/lib/api';

function normalizeStints(stintsList: any[], isActual: boolean): Stint[] {
  if (!stintsList || !Array.isArray(stintsList)) return [];
  return stintsList.map((s: any) => ({
    compound: (s.compound || s.compound_id || 'medium').toLowerCase() as any,
    startLap: s.start_lap || s.start || 1,
    endLap: s.end_lap || s.end || 71,
    wearSlope: s.wear_slope || s.wearSlope || 0.05,
    isActual: isActual
  }));
}

function formatTimeSeconds(seconds: number): string {
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
    if (rep["Telemetry Findings"] && rep["Telemetry Findings"] !== "Unavailable" && rep["Telemetry Findings"] !== "No telemetry anomalies detected.") {
      parts.push(`**Telemetry Findings:** ${rep["Telemetry Findings"]}`);
    }
    if (rep["Simulation Findings"] && rep["Simulation Findings"] !== "Unavailable" && rep["Simulation Findings"] !== "No strategy simulations were run.") {
      parts.push(`**Simulation Findings:** ${rep["Simulation Findings"]}`);
    }
    if (rep["Historical Findings"] && rep["Historical Findings"] !== "Unavailable" && rep["Historical Findings"] !== "No historical standings parsed.") {
      parts.push(`**Historical Findings:** ${rep["Historical Findings"]}`);
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

  if (evidence.simulation_tool) {
    const sim = evidence.simulation_tool;
    const runParams = sim.run_parameters || {};
    if (runParams.stints || runParams.actual_stints) {
      messages.push({
        id: `strategy-${id}-${timestamp}`,
        type: 'evidence-strategy',
        content: 'Stint Strategy Plan',
        evidenceData: {
          actual: normalizeStints(runParams.actual_stints || [], true),
          simulated: normalizeStints(runParams.stints || [], false),
          driverCode: (sim.driver_id || 'SAI').toUpperCase(),
          totalLaps: sim.total_laps || 71
        },
        timestamp: timestamp + 1000,
      });
    }

    messages.push({
      id: `simulation-${id}-${timestamp}`,
      type: 'evidence-simulation',
      content: 'Simulation Result',
      evidenceData: {
        actual: {
          position: sim.actual_finishing_position || 3,
          time: formatTimeSeconds(sim.actual_total_time_seconds)
        },
        simulated: {
          position: sim.projected_finishing_position || 3,
          time: formatTimeSeconds(sim.projected_total_time_seconds)
        },
        delta: {
          positions: sim.position_change || 0,
          seconds: (sim.simulated_net_time_gain_ms || 0) / 1000
        },
        confidence: response.confidence || 87,
        simType: 'v1_single'
      },
      timestamp: timestamp + 1500,
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
  const [loadingStage, setLoadingStage] = useState<string>('Initializing AI Race Engineer...');
  const [latency, setLatency] = useState<number | null>(null);
  const [providerInfo, setProviderInfo] = useState<{ provider: string; model: string } | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Split-screen dual pane state for wide desktop (>1024px)
  const [expandedTelemetry, setExpandedTelemetry] = useState<{
    driverA: string;
    driverB?: string | null;
    metric: 'speed' | 'throttle' | 'brake' | 'gear';
    lapNumber: number;
  } | null>(null);

  // Load from local storage dynamically
  const stored = localStorage.getItem(`frontwing_investigation_${id}`);
  const investigationData = stored ? JSON.parse(stored) : null;
  const lastExchange = investigationData?.exchanges?.[investigationData.exchanges.length - 1];
  const questionText = lastExchange?.question || investigationData?.question || 'Investigation Thread';

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Investigation Thread', href: '#' },
    { label: questionText, href: '#' },
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

  // Rotating loading status messages
  useEffect(() => {
    if (!isLoading) return;
    const stages = [
      'Initializing AI Race Engineer...',
      'Planning investigation...',
      'Loading telemetry...',
      'Consulting strategy engineers...',
      'Generating report...'
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % stages.length;
      setLoadingStage(stages[idx]);
    }, 1200);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Execute query on load
  useEffect(() => {
    if (!id) return;
    const stored = localStorage.getItem(`frontwing_investigation_${id}`);
    if (stored) {
      const data = JSON.parse(stored);
      if (data.status === 'loading') {
        executeQuery(data.question);
      } else {
        // Normal restoration of previous thread
        if (!data.exchanges) {
          data.exchanges = [{
            question: data.question || 'Initial question',
            response: data.response,
            timestamp: data.timestamp || Date.now()
          }];
          localStorage.setItem(`frontwing_investigation_${id}`, JSON.stringify(data));
        }
        const lastEx = data.exchanges[data.exchanges.length - 1];
        const allMessages = lastEx
          ? mapResponseToMessages(id, lastEx.response, lastEx.timestamp, true)
          : [];
        setMessages(allMessages);
        
        // Extract metadata from the last exchange
        const lastEx = data.exchanges[data.exchanges.length - 1];
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
      const data = {
        id,
        question: fallbackQuestion,
        status: 'loading',
        exchanges: [],
        timestamp: Date.now()
      };
      localStorage.setItem(`frontwing_investigation_${id}`, JSON.stringify(data));
      executeQuery(fallbackQuestion);
    }
  }, [id]);

  const executeQuery = async (queryText: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setLoadingStage('Initializing AI Race Engineer...');
    
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

      // Update storage
      const stored = localStorage.getItem(`frontwing_investigation_${id}`);
      const data = stored ? JSON.parse(stored) : { id, question: queryText, exchanges: [] };
      if (!data.exchanges) {
        data.exchanges = [];
      }
      
      data.exchanges.push({
        question: queryText,
        response: apiResponse,
        timestamp: Date.now()
      });
      data.status = 'completed';
      localStorage.setItem(`frontwing_investigation_${id}`, JSON.stringify(data));

      setIsLoading(false);
      setAbortController(null);

      // Stream blocks progressively
      await streamResponseProgressively(apiResponse, id!, Date.now());

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
      await new Promise((resolve) => setTimeout(resolve, 600));
      setMessages((prev) => [...prev, newMsgs[i]]);
    }
    
    setIsStreaming(false);
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
    
    // Add temporary loading indicator text placeholder inside messages
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
              onClick={() => executeQuery(questionText)}
              className="flex-1 py-2.5 px-4 rounded-button bg-drs-cyan text-canvas hover:bg-drs-cyan-hover transition-colors font-mono text-xs uppercase tracking-wider"
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-text-secondary relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1c2025_1px,transparent_1px),linear-gradient(to_bottom,#1c2025_1px,transparent_1px)] bg-[size:32px_32px] opacity-10" />
        <div className="max-w-md w-full flex flex-col items-center gap-8 z-10">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-2 border-fw-border/40" />
            <div className="absolute inset-0 rounded-full border-2 border-drs-cyan border-t-transparent animate-spin" />
            <div className="absolute inset-3 rounded-full bg-drs-cyan/5 border border-drs-cyan/10 flex items-center justify-center animate-pulse">
              <span className="text-mono-meta font-mono text-drs-cyan text-[10px]">CRE_V3</span>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-2 text-center">
            <h3 className="text-text-primary font-mono uppercase tracking-widest text-xs">
              Analyzing Telemetry Arrays
            </h3>
            <p className="text-text-muted text-xs font-sans animate-pulse max-w-[280px]">
              {loadingStage}
            </p>
          </div>
          
          <button
            onClick={handleCancel}
            className="mt-2 px-5 py-2 border border-drs-cyan/20 hover:border-drs-cyan text-drs-cyan hover:bg-drs-cyan/5 transition-colors rounded-button font-mono text-[10px] uppercase tracking-widest"
          >
            Cancel Investigation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-text-secondary flex flex-col font-sans selection:bg-drs-cyan/20 selection:text-drs-cyan">
      {/* Navigation Header */}
      <BriefingHeader
        breadcrumbs={breadcrumbs}
        sessionState={isStreaming ? 'streaming' : 'idle'}
        onLogoClick={() => navigate('/')}
        onBreadcrumbClick={(index) => {
          if (index === 0) navigate('/');
          if (index === 1) navigate(`/race/${sessionId}`);
        }}
      />

      {/* Content wrapper with responsive split screen */}
      <div className="flex-1 flex w-full max-w-[1440px] mx-auto overflow-hidden">
        {/* Left Pane: Investigation Canvas */}
        <main
          className={cn(
            'flex-1 flex flex-col justify-between py-6 px-4 transition-all duration-300',
            expandedTelemetry ? 'max-w-[720px]' : 'max-w-thread mx-auto'
          )}
        >
          {/* Messages list container */}
          <div className="flex flex-col gap-6 flex-1 overflow-y-auto pr-1">
            {/* Latency display at the top of the thread */}
            {latency && providerInfo && (
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

            {/* Render thread messages sequentially */}
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

                    {/* Explanatory progressive reasoning panel below narrative (only for strategy/telemetry queries) */}
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

          {/* Inline Bottom-docked QuestionBar */}
          <div className="border-t border-fw-border pt-4 mt-6">
            <QuestionBar
              variant="inline"
              placeholder="Ask a follow-up or enter custom what-if scenario..."
              disabled={isStreaming}
              onSubmit={handleFollowUpSubmit}
              contextLabel="RE_ENGINEER"
            />
          </div>
        </main>

        {/* Right Pane: Split Screen Interactive Telemetry (Wide Desktop Overlay) */}
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
                {/* Main Speed Overlay */}
                <TelemetryCard
                  driverA={{ code: expandedTelemetry.driverA, color: '#00E5FF', data: telemetryDataA }}
                  driverB={{ code: expandedTelemetry.driverB || '', color: '#FFD600', data: telemetryDataB }}
                  metric={expandedTelemetry.metric}
                  lapNumber={expandedTelemetry.lapNumber}
                  trackName={trackName}
                  highlightZone={{ startM: 1000, endM: 1500 }}
                  variant="expanded"
                />

                {/* Throttle overlay */}
                <TelemetryCard
                  driverA={{ code: expandedTelemetry.driverA, color: '#00E5FF', data: telemetryDataA }}
                  driverB={{ code: expandedTelemetry.driverB || '', color: '#FFD600', data: telemetryDataB }}
                  metric="throttle"
                  lapNumber={expandedTelemetry.lapNumber}
                  trackName={trackName}
                  variant="expanded"
                />

                {/* Brake overlay */}
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
