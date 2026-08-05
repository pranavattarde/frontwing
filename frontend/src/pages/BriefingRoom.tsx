import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BriefingHeader } from '@/components/BriefingHeader';
import { QuestionBar } from '@/components/QuestionBar';
import { RaceStoryCard } from '@/components/RaceStoryCard';
import { InsightCard } from '@/components/InsightCard';
import {
  AUSTRIAN_GP,
  KEY_INSIGHTS,
  SUGGESTED_QUESTIONS,
  FEATURED_STORIES,
} from '@/lib/data';
import { generateId } from '@/lib/utils';
import { fetchHistory, deleteHistory, InvestigationHistoryItem } from '@/lib/api';

export function BriefingRoom() {
  const navigate = useNavigate();
  const [sessionState, setSessionState] = useState<'idle' | 'loading' | 'streaming' | 'error'>('idle');
  const [recentInvestigations, setRecentInvestigations] = useState<InvestigationHistoryItem[]>([]);
  const [savedInvestigations, setSavedInvestigations] = useState<InvestigationHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);

  // Load history from Backend API & localStorage fallback
  const loadHistory = async () => {
    setIsLoadingHistory(true);
    let items: InvestigationHistoryItem[] = [];

    try {
      const data = await fetchHistory({ limit: 10 });
      if (data && data.investigations) {
        items = data.investigations;
      }
    } catch (err) {
      console.log('[BriefingRoom] Backend history unavailable, falling back to local storage:', err);
    }

    // Combine with local storage items
    const localKeys = Object.keys(localStorage).filter((k) => k.startsWith('frontwing_investigation_'));
    const localItems: InvestigationHistoryItem[] = localKeys.map((k) => {
      try {
        const parsed = JSON.parse(localStorage.getItem(k) || '{}');
        return {
          id: parsed.id || k.replace('frontwing_investigation_', ''),
          question: parsed.question || 'Saved Investigation',
          ai_response: parsed.response || {},
          timestamp: parsed.timestamp || Date.now(),
          created_at: parsed.timestamp || Date.now(),
          provider_used: parsed.response?.provider || 'gemini-2.0-flash',
          is_saved: parsed.is_saved || false,
        };
      } catch {
        return null;
      }
    }).filter(Boolean) as InvestigationHistoryItem[];

    // Merge and deduplicate by id
    const itemMap = new Map<string, InvestigationHistoryItem>();
    items.forEach((item) => itemMap.set(item.id, item));
    localItems.forEach((item) => {
      if (!itemMap.has(item.id)) {
        itemMap.set(item.id, item);
      }
    });

    const allCombined = Array.from(itemMap.values()).sort(
      (a, b) => new Date(b.timestamp || b.created_at).getTime() - new Date(a.timestamp || a.created_at).getTime()
    );

    setRecentInvestigations(allCombined.slice(0, 6));
    setSavedInvestigations(allCombined.filter((i) => i.is_saved));
    setIsLoadingHistory(false);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleQuestionSubmit = async (query: string) => {
    if (sessionState === 'loading' || !query.trim()) return;
    setSessionState('loading');
    
    const generatedId = generateId();
    const newInvestigation = {
      id: generatedId,
      question: query,
      status: 'loading',
      exchanges: [],
      timestamp: Date.now()
    };
    
    localStorage.setItem(`frontwing_investigation_${generatedId}`, JSON.stringify(newInvestigation));
    setSessionState('idle');
    navigate(`/investigate/${generatedId}`);
  };

  const handleDeleteItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteHistory(id);
    } catch (err) {
      console.warn('[BriefingRoom] Delete history error:', err);
    }
    localStorage.removeItem(`frontwing_investigation_${id}`);
    loadHistory();
  };

  const handleSearchTrigger = () => {
    window.dispatchEvent(new CustomEvent('toggle-search-overlay'));
  };

  return (
    <div className="min-h-screen bg-canvas text-text-secondary flex flex-col font-sans selection:bg-drs-cyan/20 selection:text-drs-cyan">
      {/* Header */}
      <BriefingHeader
        breadcrumbs={[]}
        sessionState={sessionState}
        onSearchTrigger={handleSearchTrigger}
        onLogoClick={() => navigate('/')}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 py-8 flex flex-col justify-between gap-12">
        {/* Hero Section */}
        <section className="flex flex-col lg:flex-row items-center justify-between gap-12 my-auto">
          {/* Left Hero: Spielberg Track & Query Box */}
          <div className="flex-1 flex flex-col gap-6 max-w-2xl w-full">
            <div className="flex flex-col gap-2">
              <span className="text-mono-meta font-mono text-drs-cyan tracking-widest uppercase">
                ENGINEER_ROOM // ACTIVE_SESSION
              </span>
              <h1 className="text-display text-text-primary">
                Could Ferrari have won the Austrian Grand Prix?
              </h1>
              <p className="text-text-muted text-sm max-w-lg">
                Enter a question below or choose a suggested analysis thread. The AI Race Engineer will parse FastF1 timing arrays, run stint regressions, and build an investigative timeline.
              </p>
            </div>

            {/* Query Console Input */}
            <div className="w-full">
              <QuestionBar
                variant="hero"
                placeholder="Ask about any driver, lap, or strategy error..."
                suggestedQuestions={SUGGESTED_QUESTIONS}
                disabled={sessionState === 'loading'}
                onSubmit={handleQuestionSubmit}
                contextLabel="SPIELBERG_GP"
              />
            </div>
          </div>

          {/* Right Hero: 1px Spielberg Track SVG Outline */}
          <div className="w-full lg:w-[420px] flex items-center justify-center shrink-0 border border-fw-border rounded-card p-6 bg-panel/30 relative overflow-hidden group">
            {/* Grid background effect */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1c2025_1px,transparent_1px),linear-gradient(to_bottom,#1c2025_1px,transparent_1px)] bg-[size:24px_24px] opacity-10" />

            <div className="relative flex flex-col items-center w-full">
              <span className="absolute top-0 left-0 text-[10px] font-mono text-text-muted">
                CIRCUIT // RED_BULL_RING
              </span>
              <span className="absolute top-0 right-0 text-[10px] font-mono text-text-muted">
                LEN: 4.318 KM
              </span>

              {/* Red Bull Ring 1px SVG Track Path */}
              <svg
                viewBox="0 0 500 400"
                className="w-full h-[240px] text-text-muted/40 group-hover:text-drs-cyan/40 transition-colors duration-300"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* Clean SVG track layout */}
                <path d="M 120 340 L 80 340 L 70 330 L 70 300 L 100 240 L 180 180 L 220 140 L 250 110 L 270 100 L 290 105 L 300 120 L 300 140 L 280 170 L 260 210 L 320 230 L 360 220 L 400 190 L 420 195 L 430 210 L 430 230 L 390 280 L 340 310 L 280 320 L 200 330 Z" />

                {/* DRS Detection & Active Zones */}
                <path
                  d="M 100 240 L 180 180 L 220 140"
                  className="text-drs-cyan group-hover:text-drs-cyan transition-colors"
                  strokeWidth="2.5"
                  strokeDasharray="4,4"
                />
                <path
                  d="M 340 310 L 280 320 L 200 330"
                  className="text-drs-cyan group-hover:text-drs-cyan transition-colors"
                  strokeWidth="2.5"
                  strokeDasharray="4,4"
                />
              </svg>

              <div className="flex justify-between w-full mt-4 border-t border-fw-border pt-4 text-mono-meta font-mono">
                <div>
                  <span className="text-text-muted">TURNS: </span>
                  <span className="text-text-primary">10</span>
                </div>
                <div>
                  <span className="text-text-muted">DRS_ZONES: </span>
                  <span className="text-text-primary">3</span>
                </div>
                <div>
                  <span className="text-text-muted">RECORD: </span>
                  <span className="text-text-primary">1:05.619</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Recent & Saved Investigations Section */}
        {(isLoadingHistory || recentInvestigations.length > 0 || savedInvestigations.length > 0) && (
          <section className="flex flex-col gap-6 border-t border-fw-border pt-8">
            <div className="flex items-center justify-between">
              <span className="text-mono-meta font-mono text-drs-cyan uppercase tracking-wider">
                INVESTIGATION_HISTORY // ARCHIVE
              </span>
              <span className="text-mono-meta font-mono text-text-muted">
                {isLoadingHistory ? 'LOADING...' : `${recentInvestigations.length} TOTAL DEBRIEFS`}
              </span>
            </div>

            {isLoadingHistory ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 rounded-card border border-fw-border/60 bg-panel/20 animate-pulse p-4 flex flex-col justify-between">
                    <div className="h-3 w-1/3 bg-fw-border/40 rounded" />
                    <div className="h-4 w-3/4 bg-fw-border/60 rounded" />
                    <div className="h-3 w-1/2 bg-fw-border/30 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentInvestigations.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/investigate/${item.id}`)}
                  className="group cursor-pointer border border-fw-border hover:border-drs-cyan/40 bg-panel/40 hover:bg-panel p-4 rounded-card flex flex-col justify-between gap-4 transition-all duration-200"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                      <span className="text-drs-cyan/80 uppercase">
                        {item.session || 'SPIELBERG_GP'}
                      </span>
                      <span>
                        {new Date(item.timestamp || item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="text-sm font-sans font-medium text-text-primary group-hover:text-drs-cyan transition-colors line-clamp-2">
                      {item.question}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between border-t border-fw-border/60 pt-3 text-[10px] font-mono">
                    <span className="text-text-muted">
                      PROVIDER: <span className="text-text-primary uppercase">{item.provider_used || 'GEMINI'}</span>
                    </span>
                    <button
                      onClick={(e) => handleDeleteItem(e, item.id)}
                      className="text-text-muted hover:text-fw-red transition-colors"
                      title="Delete Investigation"
                    >
                      [DELETE]
                    </button>
                  </div>
                </div>
              ))}
            </div>
            )}
          </section>
        )}

        {/* Dynamic Content Section */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-8 border-t border-fw-border pt-8">
          {/* Featured Race Story */}
          <div className="xl:col-span-2 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-mono-meta font-mono text-text-muted uppercase tracking-wider">
                FEATURED_DEBRIEF
              </span>
              <button
                onClick={() => navigate(`/race/${AUSTRIAN_GP.id}`)}
                className="text-mono-meta font-mono text-drs-cyan hover:underline"
              >
                BROWSE ALL GP DEBRIEFS →
              </button>
            </div>
            {FEATURED_STORIES.map((story) => (
              <RaceStoryCard
                key={story.id}
                title={story.title}
                summary={story.summary}
                keyMoments={story.keyMoments}
                raceId={story.raceId}
                variant="featured"
                onFullDebrief={() => navigate(`/race/${story.raceId}`)}
                onMomentClick={(momentIdx) => {
                  const moment = story.keyMoments[momentIdx];
                  if (moment) {
                    handleQuestionSubmit(`Explain Austrian GP lap ${moment.lap} incident: ${moment.description}`);
                  }
                }}
              />
            ))}
          </div>

          {/* Trending Tactical Insights */}
          <div className="flex flex-col gap-4">
            <span className="text-mono-meta font-mono text-text-muted uppercase tracking-wider">
              TRENDING_TACTICAL_INSIGHTS
            </span>
            <div className="flex flex-col sm:flex-row xl:flex-col gap-3">
              {KEY_INSIGHTS.slice(0, 3).map((insight, idx) => (
                <InsightCard
                  key={idx}
                  insight={insight}
                  variant="featured"
                  onClick={() => handleQuestionSubmit(`Analyze strategic insight: ${insight.headline} (${insight.metric.value} ${insight.metric.unit} - ${insight.metric.context})`)}
                />
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer Info */}
      <footer className="border-t border-fw-border py-4 bg-panel/30 mt-auto">
        <div className="max-w-[1440px] mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2 text-mono-meta font-mono text-text-muted">
          <div>
            SYSTEM_STATUS: <span className="text-drs-cyan">ACTIVE</span> // FASTF1_SAMPLING: <span className="text-text-primary">10M_BINS</span>
          </div>
          <div>
            © 2026 FRONTWING // WORLD'S BEST AI RACE ENGINEER
          </div>
        </div>
      </footer>
    </div>
  );
}
