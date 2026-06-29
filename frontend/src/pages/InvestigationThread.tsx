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
  DEMO_INVESTIGATION,
  AUSTRIAN_GP,
  TELEMETRY_PIA_LAP42,
  TELEMETRY_SAI_LAP42,
} from '@/lib/data';
import type { ThreadMessage, AIStage, BreadcrumbItem } from '@/lib/types';

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

  // Mock Reasoning Steps for the progressive disclosure panel
  const reasoningSteps = [
    {
      title: 'Initialize fast timing arrays',
      description: 'Loaded sector timelines and compound lists for Carlos Sainz during the first stint of Spielberg GP.',
      dataReference: 'FastF1 database (laps_data.csv)',
      confidence: 99,
    },
    {
      title: 'Analyze degradation slope',
      description: 'Calculated tire pace decay slope: 0.078 s/lap. Grid median degradation was 0.052 s/lap. Sainz crossed the hard compound crossover point on Lap 20.',
      dataReference: 'Strategy computation model V1',
      confidence: 92,
    },
    {
      title: 'Simulate pit stop timing',
      description: 'Simulated re-entry gap to rivals (Verstappen, Piastri) if Sainz had pitted on Lap 20. Calculated traffic bottleneck exit gap of +2.1 seconds (clean air).',
      dataReference: 'Monte Carlo traffic distribution model',
      confidence: 87,
    },
  ];

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Austrian GP', href: `/race/${AUSTRIAN_GP.id}` },
    { label: 'Sainz Strategy Thread', href: '#' },
  ];

  useEffect(() => {
    if (id === 'new') {
      // Simulate typing query
      setMessages([]);
      setIsStreaming(false);
      setAiThinking({ stage: 'parsing', detail: 'Reading question semantics...' });

      // Run AI pipeline animation
      const pipeline = [
        { stage: 'loading_data' as const, detail: 'Accessing telemetry database...', delay: 800 },
        { stage: 'computing' as const, detail: 'Calculating tire degradation regressions...', delay: 1800 },
        { stage: 'generating' as const, detail: 'Synthesizing engineer debrief...', delay: 2800 },
      ];

      pipeline.forEach((step) => {
        setTimeout(() => {
          setAiThinking({ stage: step.stage, detail: step.detail });
        }, step.delay);
      });

      setTimeout(() => {
        setAiThinking(null);
        setMessages(DEMO_INVESTIGATION);
        setIsStreaming(true);
        // Turn off streaming mode after rendering animation completes
        setTimeout(() => setIsStreaming(false), 2000);
      }, 3800);
    } else {
      // Load pre-built demo messages directly
      setMessages(DEMO_INVESTIGATION);
      setAiThinking(null);
      setIsStreaming(false);
    }
  }, [id]);

  const handleSuggestionClick = () => {
    // Navigate or trigger re-simulate
    navigate('/investigate/new');
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
          if (index === 1) navigate(`/race/${AUSTRIAN_GP.id}`);
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
                    confidence={87}
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
                        steps={reasoningSteps}
                        conclusion="Ferrari chosen timing for Sainz pit lap 22 cost 1.4s total compared to earlier Lap 20 stop."
                      />
                    )}
                  </div>
                );
              }

              if (msg.type === 'evidence-strategy' && msg.evidenceData) {
                const stratData = msg.evidenceData as {
                  actual: typeof DEMO_INVESTIGATION[number]['evidenceData'];
                  simulated: typeof DEMO_INVESTIGATION[number]['evidenceData'];
                  driverCode: string;
                  totalLaps: number;
                };

                return (
                  <EvidenceCard
                    key={msg.id}
                    title="STINT_STRATEGY_DEVIATION"
                    subtitle="Carlos Sainz Stint Length Plan"
                    variant="expanded"
                    className="animate-slide-up"
                  >
                    <StrategyTimeline
                      stints={stratData.actual as any}
                      simulated={stratData.simulated as any}
                      totalLaps={stratData.totalLaps}
                      driverCode={stratData.driverCode}
                      variant="comparison"
                    />
                  </EvidenceCard>
                );
              }

              if (msg.type === 'evidence-simulation' && msg.evidenceData) {
                return (
                  <div key={msg.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up">
                    <SimulationResult
                      result={msg.evidenceData as any}
                      variant="detailed"
                      onDrillDown={() => navigate(`/strategy/${AUSTRIAN_GP.id}`)}
                    />

                    {/* Telemetry card inside thread */}
                    <TelemetryCard
                      driverA={{ code: 'PIA', color: '#FF8000', data: TELEMETRY_PIA_LAP42 }}
                      driverB={{ code: 'SAI', color: '#E80020', data: TELEMETRY_SAI_LAP42 }}
                      metric="speed"
                      lapNumber={42}
                      trackName={AUSTRIAN_GP.circuit}
                      highlightZone={{ startM: 1000, endM: 1500 }}
                      variant="collapsed"
                      onExpand={() =>
                        setExpandedTelemetry({
                          driverA: 'PIA',
                          driverB: 'SAI',
                          metric: 'speed',
                          lapNumber: 42,
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
        {expandedTelemetry && (
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
                driverA={{ code: expandedTelemetry.driverA, color: '#00E5FF', data: TELEMETRY_PIA_LAP42 }}
                driverB={{ code: expandedTelemetry.driverB || '', color: '#FFD600', data: TELEMETRY_SAI_LAP42 }}
                metric={expandedTelemetry.metric}
                lapNumber={expandedTelemetry.lapNumber}
                trackName={AUSTRIAN_GP.circuit}
                highlightZone={{ startM: 1000, endM: 1500 }}
                variant="expanded"
              />

              {/* Throttle overlay */}
              <TelemetryCard
                driverA={{ code: expandedTelemetry.driverA, color: '#00E5FF', data: TELEMETRY_PIA_LAP42 }}
                driverB={{ code: expandedTelemetry.driverB || '', color: '#FFD600', data: TELEMETRY_SAI_LAP42 }}
                metric="throttle"
                lapNumber={expandedTelemetry.lapNumber}
                trackName={AUSTRIAN_GP.circuit}
                variant="expanded"
              />

              {/* Brake overlay */}
              <TelemetryCard
                driverA={{ code: expandedTelemetry.driverA, color: '#00E5FF', data: TELEMETRY_PIA_LAP42 }}
                driverB={{ code: expandedTelemetry.driverB || '', color: '#FFD600', data: TELEMETRY_SAI_LAP42 }}
                metric="brake"
                lapNumber={expandedTelemetry.lapNumber}
                trackName={AUSTRIAN_GP.circuit}
                variant="expanded"
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );

  function handleQuestionSubmit(query: string) {
    setAiThinking({ stage: 'parsing', detail: 'Parsing follow-up question...' });
    setTimeout(() => {
      setAiThinking(null);
      // Append a mock answer thread
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          type: 'verdict',
          content: `Analyzing follow-up: "${query}". Verstappen carried significant aero compromise after Lap 64, losing 0.85s in straight line stability.`,
          timestamp: Date.now(),
        },
      ]);
    }, 1500);
  }
}
