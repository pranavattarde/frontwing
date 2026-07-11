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
import { AIThinkingIndicator } from '@/components/AIThinkingIndicator';
import { FollowUpSuggestions } from '@/components/FollowUpSuggestions';
import { ExplanationPanel } from '@/components/ExplanationPanel';
import { cn } from '@/lib/utils';
import {
  AUSTRIAN_GP,
  TELEMETRY_PIA_LAP42,
  TELEMETRY_SAI_LAP42,
} from '@/lib/data';
import type { ThreadMessage, AIStage, BreadcrumbItem, Stint } from '@/lib/types';
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

  const messages: ThreadMessage[] = [
    {
      id: `verdict-${id}-${timestamp}`,
      type: 'verdict',
      content: response.investigation_report?.["Executive Summary"] || response.final_answer || 'No verdict generated.',
      timestamp: timestamp,
    },
    {
      id: `narrative-${id}-${timestamp}`,
      type: 'narrative',
      content: response.final_answer || 'No narrative details provided.',
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
      evidenceData: response.fallback_plan || suggestedFollowups,
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
  const [aiThinking, setAiThinking] = useState<{ stage: AIStage; detail: string } | null>(null);

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
  const questionText = lastExchange?.question || 'Investigation Thread';

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

  useEffect(() => {
    if (!id) return;
    const stored = localStorage.getItem(`frontwing_investigation_${id}`);
    if (stored) {
      const data = JSON.parse(stored);
      // If data is old structure or doesn't have exchanges list, migrate it
      if (!data.exchanges) {
        data.exchanges = [{
          question: data.question || 'Initial question',
          response: data.response,
          timestamp: data.timestamp || Date.now()
        }];
        localStorage.setItem(`frontwing_investigation_${id}`, JSON.stringify(data));
      }
      const allMessages = data.exchanges.flatMap((ex: any, idx: number) =>
        mapResponseToMessages(id, ex.response, ex.timestamp, idx === data.exchanges.length - 1)
      );
      setMessages(allMessages);
      setAiThinking(null);
      setIsStreaming(false);
    } else {
      console.warn(`[InvestigationThread] Stored investigation not found for ID: ${id}`);
      navigate('/');
    }
  }, [id, navigate]);

  const handleSuggestionClick = (suggestion: string) => {
    handleQuestionSubmit(suggestion);
  };

  return (
    <div className="min-h-screen bg-canvas text-text-secondary flex flex-col font-sans selection:bg-drs-cyan/20 selection:text-drs-cyan">
      {/* Navigation Header */}
      <BriefingHeader
        breadcrumbs={breadcrumbs}
        sessionState={aiThinking ? 'loading' : isStreaming ? 'streaming' : 'idle'}
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
            {/* Thinking Indicator */}
            {aiThinking && (
              <AIThinkingIndicator
                stage={aiThinking.stage}
                detail={aiThinking.detail}
                className="my-4 animate-slide-up"
              />
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

                    {/* Explanatory progressive reasoning panel below narrative */}
                    {!isStreaming && (
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
              onSubmit={handleQuestionSubmit}
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

  async function handleQuestionSubmit(query: string) {
    if (!id) return;
    setAiThinking({ stage: 'parsing', detail: 'Parsing follow-up question...' });
    try {
      const aiResponse = await submitEngineerQuery(query, id);
      
      const stored = localStorage.getItem(`frontwing_investigation_${id}`);
      if (stored) {
        const data = JSON.parse(stored);
        data.exchanges.push({
          question: query,
          response: aiResponse,
          timestamp: Date.now()
        });
        localStorage.setItem(`frontwing_investigation_${id}`, JSON.stringify(data));
        
        // Re-map all messages including the new exchange
        const allMessages = data.exchanges.flatMap((ex: any, idx: number) =>
          mapResponseToMessages(id, ex.response, ex.timestamp, idx === data.exchanges.length - 1)
        );
        setMessages(allMessages);
      }
      setAiThinking(null);
    } catch (error: any) {
      console.error('[InvestigationThread] Follow-up query failed:', error);
      setAiThinking(null);
      if (typeof (window as any).__fw_notify === 'function') {
        (window as any).__fw_notify({
          id: String(Date.now()),
          message: `Query failed: ${error.message}`,
          type: 'error',
          duration: 5000,
        });
      }
    }
  }
}
