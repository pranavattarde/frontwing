import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BriefingHeader } from "@/components/BriefingHeader";
import { QuestionBar } from "@/components/QuestionBar";
import { RaceStoryCard } from "@/components/RaceStoryCard";
import { InsightCard } from "@/components/InsightCard";
import { getCircuitByTrackName } from "@/lib/circuitTracks";
import { generateId } from "@/lib/utils";
import { fetchHistory, deleteHistory, fetchHeroCurrent, fetchEditorialCurrent } from "@/lib/api";

const DEFAULT_SUGGESTED = [
  "Could Ferrari or McLaren win the Spanish Grand Prix with an undercut strategy?",
  "Analyze Turn 1 telemetry delta and top speeds at Circuit de Barcelona-Catalunya",
  "Compare tire degradation wear slopes between medium and hard compounds",
  "Simulate a safety car pit window on lap 28"
];

export function BriefingRoom() {
  const navigate = useNavigate();
  const [sessionState, setSessionState] = useState("idle");
  const [recentInvestigations, setRecentInvestigations] = useState([]);
  const [savedInvestigations, setSavedInvestigations] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("frontwing_token"));

  // Live Hero State (Fix T)
  const [heroData, setHeroData] = useState(null);
  const [isLoadingHero, setIsLoadingHero] = useState(true);

  // Live Editorial Pipeline State (Fix V)
  const [editorialData, setEditorialData] = useState(null);
  const [isLoadingEditorial, setIsLoadingEditorial] = useState(true);

  // Load Real User History (Fix U)
  const loadHistory = async () => {
    const token = localStorage.getItem("frontwing_token");
    setIsAuthenticated(!!token);
    if (!token) {
      setRecentInvestigations([]);
      setSavedInvestigations([]);
      setIsLoadingHistory(false);
      return;
    }
    setIsLoadingHistory(true);
    try {
      const data = await fetchHistory({ limit: 10 });
      if (data && Array.isArray(data.investigations)) {
        setRecentInvestigations(data.investigations);
        setSavedInvestigations(data.investigations.filter((i) => i.is_saved));
      } else {
        setRecentInvestigations([]);
        setSavedInvestigations([]);
      }
    } catch (err) {
      console.warn("[BriefingRoom] History fetch error:", err);
      setRecentInvestigations([]);
      setSavedInvestigations([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Fetch Hero & Editorial Data
  const loadContentFeeds = async () => {
    try {
      setIsLoadingHero(true);
      const hero = await fetchHeroCurrent();
      if (hero) setHeroData(hero);
    } catch (err) {
      console.warn("[BriefingRoom] Hero load failed:", err);
    } finally {
      setIsLoadingHero(false);
    }

    try {
      setIsLoadingEditorial(true);
      const editorial = await fetchEditorialCurrent();
      if (editorial) setEditorialData(editorial);
    } catch (err) {
      console.warn("[BriefingRoom] Editorial load failed:", err);
    } finally {
      setIsLoadingEditorial(false);
    }
  };

  useEffect(() => {
    loadHistory();
    loadContentFeeds();

    const handleAuthChange = () => {
      loadHistory();
    };

    window.addEventListener("frontwing-auth-changed", handleAuthChange);
    window.addEventListener("frontwing-auth-unauthorized", handleAuthChange);

    return () => {
      window.removeEventListener("frontwing-auth-changed", handleAuthChange);
      window.removeEventListener("frontwing-auth-unauthorized", handleAuthChange);
    };
  }, []);

  const handleQuestionSubmit = async (query) => {
    if (sessionState === "loading" || !query.trim()) return;
    setSessionState("loading");
    const generatedId = generateId();
    const newInvestigation = {
      id: generatedId,
      question: query,
      status: "loading",
      exchanges: [],
      timestamp: Date.now()
    };
    localStorage.setItem(`frontwing_investigation_${generatedId}`, JSON.stringify(newInvestigation));
    setSessionState("idle");
    navigate(`/investigate/${generatedId}`);
  };

  const handleDeleteItem = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteHistory(id);
    } catch (err) {
      console.warn("[BriefingRoom] Delete history error:", err);
    }
    localStorage.removeItem(`frontwing_investigation_${id}`);
    loadHistory();
  };

  const handleSearchTrigger = () => {
    window.dispatchEvent(new CustomEvent("toggle-search-overlay"));
  };

  const openAuth = () => {
    window.dispatchEvent(new CustomEvent("frontwing-open-auth-modal"));
  };

  // Resolve authentic circuit vector geometry from circuitTracks.js
  const circuitKey = heroData?.circuit_key || "barcelona";
  const circuit = getCircuitByTrackName(circuitKey);

  const suggestedQuestions = heroData?.suggested_questions && heroData.suggested_questions.length > 0
    ? heroData.suggested_questions
    : DEFAULT_SUGGESTED;

  const cleanSnippet = (text) => {
    if (!text) return "";
    return text.replace(/<[^>]*>?/gm, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
  };

  const featuredStories = (editorialData?.featured_stories || []).map((s) => ({
    ...s,
    summary: cleanSnippet(s.summary) || "Official Formula 1 Grand Prix strategic debrief and technical simulation analysis."
  }));

  const trendingInsights = (editorialData?.trending_insights || []).map((ins) => ({
    ...ins,
    headline: ins.headline || ins.title,
    confidence: ins.confidence || "high",
    source: ins.source_outlet || ins.source || "F1 Media",
    metric: ins.metric || (ins.metrics ? {
      value: ins.metrics.metric_value,
      unit: ins.metrics.metric_unit,
      context: ins.metrics.metric_context
    } : { value: "+0.28s", unit: "/ LAP", context: "Tyre degradation delta" })
  }));

  return (
    <div className="min-h-screen bg-canvas text-text-secondary flex flex-col font-sans selection:bg-accent-primary/20 selection:text-accent-primary">
      {/* Header */}
      <BriefingHeader
        breadcrumbs={[]}
        sessionState={sessionState}
        onSearchTrigger={handleSearchTrigger}
        onLogoClick={() => navigate("/")}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 py-8 flex flex-col justify-between gap-12">
        {/* Real Hero Section */}
        <section className="flex flex-col lg:flex-row items-center justify-between gap-12 my-auto">
          {/* Left Hero: Dynamic Event & Query Box */}
          <div className="flex-1 flex flex-col gap-6 max-w-2xl w-full">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-accent-primary font-bold tracking-widest uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
                  ENGINEER_ROOM // {heroData?.event_name ? heroData.event_name.toUpperCase() : "ACTIVE_CALENDAR_EVENT"}
                </span>
                {heroData?.last_updated && (
                  <span className="text-[10px] font-mono text-text-muted/70 px-2 py-0.5 rounded border border-border-subtle bg-surface-raised/40">
                    UPDATED {new Date(heroData.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <h1 className="font-heading font-black text-3xl sm:text-4xl lg:text-5xl uppercase tracking-tight text-text-primary leading-[1.05]">
                {heroData?.hero_headline || "Can McLaren hold off Ferrari at the Spanish Grand Prix?"}
              </h1>
              <p className="text-text-muted text-sm max-w-lg leading-relaxed font-sans">
                {heroData?.hero_subheadline || "The AI Race Engineer parses FastF1 timing arrays, models aerodynamic telemetry across high-speed complexes, and projects stint degradation."}
              </p>
            </div>

            {/* Query Console Input */}
            <div className="w-full">
              <QuestionBar
                variant="hero"
                placeholder="Ask about any driver, lap, tyre stint, or telemetry delta..."
                suggestedQuestions={suggestedQuestions}
                disabled={sessionState === "loading"}
                onSubmit={handleQuestionSubmit}
                contextLabel={heroData?.circuit_key ? heroData.circuit_key.toUpperCase() : "F1_LIVE"}
              />
            </div>

            {/* Official Sessions Timetable with IST & Track Local Times */}
            {heroData?.sessions && heroData.sessions.length > 0 && (
              <div className="flex flex-col gap-2 p-3.5 rounded border border-border-subtle bg-surface-base/80 backdrop-blur-sm">
                <div className="flex items-center justify-between font-mono text-xs text-text-muted">
                  <span className="text-accent-primary font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
                    FASTF1 EVENT SESSIONS // IST (UTC+5:30) & LOCAL TIME
                  </span>
                  <span className="type-tabular">ROUND {heroData.round_number || 14} • {heroData.season || 2026}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1">
                  {heroData.sessions.map((sess, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col p-2 rounded border text-left transition-colors ${
                        sess.name.toLowerCase().includes("race")
                          ? "bg-accent-primary/10 border-accent-primary/40"
                          : "bg-surface-raised border-border-subtle hover:border-border-strong"
                      }`}
                    >
                      <span className="text-[11px] font-sans font-semibold text-text-primary truncate">
                        {sess.name}
                      </span>
                      <span className="text-[11px] font-mono text-accent-primary font-bold mt-0.5 type-tabular">
                        {sess.ist}
                      </span>
                      <span className="text-[9px] font-mono text-text-muted mt-0.5 truncate type-tabular">
                        {sess.local}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Hero: Real Track Outline from circuitTracks.js */}
          <div className="w-full lg:w-[440px] flex items-center justify-center shrink-0 border border-border-subtle rounded p-6 bg-surface-base/80 relative overflow-hidden group">
            {/* Grid background effect */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] opacity-10" />

            <div className="relative flex flex-col items-center w-full">
              <span className="absolute top-0 left-0 text-[10px] font-mono text-text-muted uppercase tracking-wider">
                CIRCUIT // {heroData?.circuit_name?.toUpperCase() || circuit.name.toUpperCase()}
              </span>
              <span className="absolute top-0 right-0 text-[10px] font-mono text-text-muted type-tabular">
                LEN: {heroData?.track_length_km ? `${heroData.track_length_km} KM` : `${(circuit.lengthMeters / 1000).toFixed(3)} KM`}
              </span>

              {/* Dynamic 1px Track SVG */}
              <div className="w-full h-[240px] flex items-center justify-center pt-5">
                <svg
                  viewBox={circuit.viewBox || "0 0 500 300"}
                  className="w-full h-full text-text-muted/50 group-hover:text-accent-primary/80 transition-colors duration-normal"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={circuit.trackPath} />
                  {/* Start/Finish tick */}
                  {circuit.startFinish && (
                    <circle
                      cx={circuit.startFinish.x}
                      cy={circuit.startFinish.y}
                      r="4"
                      className="fill-accent-primary text-accent-primary"
                    />
                  )}
                </svg>
              </div>

              {/* Dynamic Track Specs */}
              <div className="flex justify-between w-full mt-4 border-t border-border-subtle pt-4 font-mono text-xs">
                <div>
                  <span className="text-text-muted">TURNS: </span>
                  <span className="text-text-primary font-bold type-tabular">{heroData?.turns || 14}</span>
                </div>
                <div>
                  <span className="text-text-muted">DRS_ZONES: </span>
                  <span className="text-text-primary font-bold type-tabular">{heroData?.drs_zones || 2}</span>
                </div>
                <div>
                  <span className="text-text-muted">RECORD: </span>
                  <span className="text-text-primary font-bold type-tabular">{heroData?.lap_record || "1:16.330"}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Real User Investigation History */}
        <section className="flex flex-col gap-6 border-t border-border-subtle pt-8">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-accent-primary font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
              INVESTIGATION_HISTORY // ARCHIVE
            </span>
            <span className="text-text-muted type-tabular">
              {isLoadingHistory
                ? "LOADING..."
                : isAuthenticated
                ? `${recentInvestigations.length} TOTAL DEBRIEFS`
                : "GUEST MODE"}
            </span>
          </div>

          {isLoadingHistory ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded border border-border-subtle bg-surface-base/40 animate-pulse p-4 flex flex-col justify-between"
                >
                  <div className="h-3 w-1/3 bg-surface-raised rounded" />
                  <div className="h-4 w-3/4 bg-surface-raised rounded" />
                  <div className="h-3 w-1/2 bg-surface-raised rounded" />
                </div>
              ))}
            </div>
          ) : !isAuthenticated ? (
            /* Honest Unauthenticated Guest State */
            <div className="border border-border-subtle rounded p-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-base/60 backdrop-blur-sm">
              <div className="flex flex-col gap-1 text-left">
                <span className="text-xs font-mono text-accent-primary font-bold uppercase tracking-wider">
                  AUTHENTICATION // GUEST SESSION
                </span>
                <p className="text-xs text-text-muted max-w-lg">
                  Sign in or register to automatically save your telemetry investigations, access multi-turn telemetry timelines, and sync your query history across sessions.
                </p>
              </div>
              <button
                onClick={openAuth}
                className="btn-f1-primary px-4 py-2 text-xs tracking-wider shrink-0"
              >
                SIGN IN / REGISTER
              </button>
            </div>
          ) : recentInvestigations.length === 0 ? (
            /* Honest Empty State for Authenticated User with 0 Investigations */
            <div className="border border-dashed border-border-subtle rounded p-8 flex flex-col items-center justify-center text-center gap-2 bg-surface-base/20">
              <span className="text-xs font-mono text-text-muted uppercase tracking-wider">
                ARCHIVE_EMPTY // NO_SAVED_DEBRIEFS
              </span>
              <p className="text-sm text-text-secondary max-w-md">
                You have not run any telemetry investigations yet. Ask a question in the console above or pick a suggested scenario to generate your first technical debrief.
              </p>
            </div>
          ) : (
            /* Real User Investigations */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentInvestigations.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/investigate/${item.id}`)}
                  className="group cursor-pointer border border-border-subtle hover:border-accent-primary/50 bg-surface-base hover:bg-surface-raised p-4 rounded card-interactive flex flex-col justify-between gap-4 transition-all duration-fast"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                      <span className="text-accent-primary font-bold uppercase">
                        {item.session || item.grand_prix || "ACTIVE_SESSION"}
                      </span>
                      <span className="type-tabular">
                        {new Date(item.timestamp || item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-text-primary group-hover:text-accent-primary transition-colors line-clamp-2">
                      {item.question}
                    </h4>
                  </div>
                  <div className="flex items-center justify-between border-t border-border-subtle pt-3 text-[10px] font-mono">
                    <span className="text-text-muted">
                      PROVIDER:{" "}
                      <span className="text-text-primary uppercase font-bold">
                        {item.provider_used || "GEMINI"}
                      </span>
                    </span>
                    <button
                      onClick={(e) => handleDeleteItem(e, item.id)}
                      className="text-text-muted hover:text-accent-danger font-bold transition-colors"
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

        {/* Real Live Editorial Pipeline */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-8 border-t border-border-subtle pt-8">
          {/* Featured Race Debriefs */}
          <div className="xl:col-span-2 flex flex-col gap-4">
            <div className="flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="text-text-muted uppercase tracking-wider">
                  FEATURED_DEBRIEF // LIVE_TACTICAL_FEED
                </span>
                {editorialData?.last_updated && (
                  <span className="text-[10px] text-text-muted/70 px-1.5 py-0.5 rounded border border-border-subtle">
                    UPDATED {new Date(editorialData.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <span className="text-accent-primary font-bold uppercase tracking-wider">
                REAL-TIME F1 ANALYSIS
              </span>
            </div>

            {featuredStories.length > 0 ? (
              featuredStories.map((story, idx) => (
                <RaceStoryCard
                  key={story.id || idx}
                  title={story.title}
                  summary={story.summary}
                  sourceUrl={story.source_url}
                  sourceOutlet={story.source_outlet}
                  keyMoments={story.keyMoments || []}
                  variant="featured"
                  onFullDebrief={() => handleQuestionSubmit(`Analyze strategic implications of ${story.title}`)}
                  onMomentClick={(momentIdx) => {
                    const moment = story.keyMoments?.[momentIdx];
                    if (moment) {
                      handleQuestionSubmit(`Explain strategic aspect: ${moment.description}`);
                    }
                  }}
                />
              ))
            ) : (
              <div className="p-8 border border-border-subtle rounded bg-surface-base/40 text-center">
                <span className="text-xs font-mono text-text-muted uppercase">
                  {isLoadingEditorial ? "CONNECTING TO FORMULA 1 EDITORIAL PIPELINE..." : "NO EDITORIAL FEEDS FOUND"}
                </span>
              </div>
            )}
          </div>

          {/* Trending Tactical Insights */}
          <div className="flex flex-col gap-4">
            <span className="font-mono text-xs text-text-muted uppercase tracking-wider">
              TRENDING_TACTICAL_INSIGHTS
            </span>
            <div className="flex flex-col sm:flex-row xl:flex-col gap-3">
              {trendingInsights.length > 0 ? (
                trendingInsights.map((insight, idx) => (
                  <InsightCard
                    key={idx}
                    insight={insight}
                    variant="featured"
                    onClick={() =>
                      handleQuestionSubmit(
                        `Analyze strategic insight: ${insight.headline} (${insight.metric?.value || ""} ${insight.metric?.unit || ""} - ${insight.metric?.context || ""})`
                      )
                    }
                  />
                ))
              ) : (
                <div className="p-6 border border-border-subtle rounded bg-surface-base/40 text-center">
                  <span className="text-xs font-mono text-text-muted">
                    {isLoadingEditorial ? "CALCULATING DELTAS..." : "NO ACTIVE TACTICAL DELTAS"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer Info */}
      <footer className="border-t border-border-subtle py-4 bg-surface-base/90 mt-auto">
        <div className="max-w-[1440px] mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2 font-mono text-xs text-text-muted">
          <div>
            SYSTEM_STATUS: <span className="text-accent-primary font-bold">ACTIVE</span> // FASTF1_INTEGRATION:{" "}
            <span className="text-text-primary uppercase font-semibold">{heroData?.event_name || "ONLINE"}</span>
          </div>
          <div>
            © 2026 FRONTWING // WORLD'S BEST AI RACE ENGINEER
          </div>
        </div>
      </footer>
    </div>
  );
}
