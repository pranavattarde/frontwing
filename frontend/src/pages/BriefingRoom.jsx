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
  "Analyze top speed delta along the Neftchilar main straight at Baku City Circuit",
  "Could Ferrari or McLaren win the Azerbaijan Grand Prix with an undercut strategy?",
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
  const [prefillQuery, setPrefillQuery] = useState("");

  // Live Hero State (Fix X & Fix Y)
  const [heroData, setHeroData] = useState(null);
  const [isLoadingHero, setIsLoadingHero] = useState(true);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Live Editorial Pipeline State (Fix V & Fix AA)
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

    // Check for query param ?q=... to prefill console
    const searchParams = new URLSearchParams(window.location.search);
    const qParam = searchParams.get("q");
    if (qParam) {
      setPrefillQuery(qParam);
    }

    const handleAuthChange = () => {
      loadHistory();
    };

    const handlePrefill = (e) => {
      if (e.detail?.query) {
        setPrefillQuery(e.detail.query);
      }
    };

    window.addEventListener("frontwing-auth-changed", handleAuthChange);
    window.addEventListener("frontwing-auth-unauthorized", handleAuthChange);
    window.addEventListener("frontwing-prefill-query", handlePrefill);

    return () => {
      window.removeEventListener("frontwing-auth-changed", handleAuthChange);
      window.removeEventListener("frontwing-auth-unauthorized", handleAuthChange);
      window.removeEventListener("frontwing-prefill-query", handlePrefill);
    };
  }, []);

  // Real Countdown Timer (Fix X)
  useEffect(() => {
    if (!heroData) return;
    const targetStr = heroData.countdown_target || (heroData.sessions && heroData.sessions[0]?.utc);
    if (!targetStr) return;

    const targetTime = new Date(targetStr).getTime();

    const updateCountdown = () => {
      const now = Date.now();
      const diff = Math.max(0, targetTime - now);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setCountdown({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [heroData]);

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

  // Resolve authentic circuit vector geometry from circuitTracks.js (Fix Y)
  const circuitKey = heroData?.circuit_key || "baku";
  const circuitLocation = heroData?.location || "";
  const circuit = getCircuitByTrackName(circuitKey, circuitLocation);
  const hasTelemetry = heroData?.has_telemetry || circuit.hasTelemetry;
  const trackPath = heroData?.track_geometry?.trackPath || circuit.trackPath;
  const viewBox = heroData?.track_geometry?.viewBox || circuit.viewBox || "0 0 480 260";
  const startFinish = heroData?.track_geometry?.startFinish || circuit.startFinish;

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
        {/* Real Hero Section: NEXT UPCOMING RACE WEEKEND (Fix X) */}
        <section className="flex flex-col lg:flex-row items-center justify-between gap-12 my-auto">
          {/* Left Hero: Dynamic Event & Query Box */}
          <div className="flex-1 flex flex-col gap-6 max-w-2xl w-full">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-xs text-accent-primary font-bold tracking-widest uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
                  ENGINEER_ROOM // {heroData?.event_name ? heroData.event_name.toUpperCase() : "ACTIVE_CALENDAR_EVENT"}
                </span>

                {countdown && (countdown.days > 0 || countdown.hours > 0 || countdown.minutes > 0) && (
                  <span className="text-[10px] font-mono text-accent-primary px-2 py-0.5 rounded border border-accent-primary/30 bg-accent-primary/10 font-bold type-tabular">
                    STARTS IN: {countdown.days}D {countdown.hours}H {countdown.minutes}M
                  </span>
                )}

                {heroData?.last_updated && (
                  <span className="text-[10px] font-mono text-text-muted/70 px-2 py-0.5 rounded border border-border-subtle bg-surface-raised/40">
                    UPDATED {new Date(heroData.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <h1 className="font-heading font-black text-3xl sm:text-4xl lg:text-5xl uppercase tracking-tight text-text-primary leading-[1.05]">
                {heroData?.hero_headline || "Can Ferrari conquer Neftchilar Avenue at the Azerbaijan Grand Prix?"}
              </h1>
              <p className="text-text-muted text-sm max-w-lg leading-relaxed font-sans">
                {heroData?.hero_subheadline || "The AI Race Engineer models aerodynamic telemetry, high-speed braking stability across 20 turns, and projected stint degradation."}
              </p>
            </div>

            {/* Query Console Input (Dedicated input surface - Fix AA) */}
            <div className="w-full">
              <QuestionBar
                variant="hero"
                placeholder="Ask about any driver, lap, tyre stint, or telemetry delta..."
                suggestedQuestions={suggestedQuestions}
                disabled={sessionState === "loading"}
                onSubmit={handleQuestionSubmit}
                prefillValue={prefillQuery}
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
                  <span className="type-tabular">ROUND {heroData.round_number || 15} • {heroData.season || 2026}</span>
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

          {/* Right Hero: Real Track Geometry or Honest Placeholder (Fix Y) */}
          <div className="w-full lg:w-[440px] flex items-center justify-center shrink-0 border border-border-subtle rounded p-6 bg-surface-base/80 relative overflow-hidden group">
            {/* Grid background effect */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] opacity-10" />

            <div className="relative flex flex-col items-center w-full">
              <span className="absolute top-0 left-0 text-[10px] font-mono text-text-muted uppercase tracking-wider">
                CIRCUIT // {heroData?.circuit_name?.toUpperCase() || circuit.name.toUpperCase()}
              </span>
              <span className="absolute top-0 right-0 text-[10px] font-mono text-text-muted type-tabular">
                LEN: {heroData?.track_length_km ? `${heroData.track_length_km} KM` : `${((circuit.lengthMeters || 6003) / 1000).toFixed(3)} KM`}
              </span>

              {/* Dynamic Track SVG or Honest Placeholder */}
              {hasTelemetry && trackPath ? (
                <div className="w-full h-[240px] flex items-center justify-center pt-5">
                  <svg
                    viewBox={viewBox}
                    className="w-full h-full text-text-muted/50 group-hover:text-accent-primary/80 transition-colors duration-normal"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={trackPath} />
                    {startFinish && (
                      <circle
                        cx={startFinish.x}
                        cy={startFinish.y}
                        r="4"
                        className="fill-accent-primary text-accent-primary"
                      />
                    )}
                  </svg>
                </div>
              ) : (
                <div className="w-full h-[240px] flex flex-col items-center justify-center border border-dashed border-border-subtle rounded bg-surface-raised/40 p-6 text-center my-3">
                  <div className="w-9 h-9 rounded-full border border-accent-primary/30 flex items-center justify-center text-accent-primary mb-2.5 font-mono text-xs font-bold">
                    ⌖
                  </div>
                  <span className="font-mono text-xs font-bold text-text-primary tracking-wider uppercase">
                    TRACK_LAYOUT // PENDING TELEMETRY INGESTION
                  </span>
                  <p className="font-mono text-[11px] text-text-muted mt-1 max-w-xs leading-relaxed">
                    Authentic geometry will be extracted post-session from FastF1 decimeter telemetry. Synthetic or approximated layouts are disabled.
                  </p>
                </div>
              )}

              {/* Dynamic Track Specs */}
              <div className="flex justify-between w-full mt-4 border-t border-border-subtle pt-4 font-mono text-xs">
                <div>
                  <span className="text-text-muted">TURNS: </span>
                  <span className="text-text-primary font-bold type-tabular">{heroData?.turns || circuit.turns || 20}</span>
                </div>
                <div>
                  <span className="text-text-muted">DRS_ZONES: </span>
                  <span className="text-text-primary font-bold type-tabular">{heroData?.drs_zones || circuit.drsZones || 2}</span>
                </div>
                <div>
                  <span className="text-text-muted">RECORD: </span>
                  <span className="text-text-primary font-bold type-tabular">{heroData?.lap_record || "1:43.009"}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dedicated Section: LAST RACE RESULTS // PODIUM & CLASSIFICATION (Fix X & Fix Y) */}
        {heroData?.last_race_results && (
          <section className="border border-border-subtle rounded-card bg-surface-base/90 p-6 shadow-sm flex flex-col gap-6 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle pb-4">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-xs text-accent-primary font-bold tracking-widest uppercase flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent-primary" />
                  LAST RACE RESULTS // PODIUM & CLASSIFICATION
                </span>
                <h2 className="font-heading font-black text-2xl text-text-primary tracking-tight uppercase">
                  Round {heroData.last_race_results.round_number} — {heroData.last_race_results.event_name} • {heroData.last_race_results.location}
                </h2>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-text-muted">
                <span className="px-2.5 py-1 rounded bg-surface-raised border border-border-subtle type-tabular">
                  {heroData.last_race_results.date}
                </span>
                <span className="px-2.5 py-1 rounded bg-timing-green/10 border border-timing-green/30 text-timing-green font-bold uppercase">
                  SESSION COMPLETED
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              {/* Left Column: Podium Finishers & Fastest Lap */}
              <div className="flex flex-col gap-3">
                <span className="font-mono text-[11px] text-text-muted uppercase tracking-wider">
                  PODIUM FINISHERS
                </span>
                <div className="flex flex-col gap-2">
                  {heroData.last_race_results.podium?.map((pod) => (
                    <div
                      key={pod.position}
                      className={`p-3 rounded border flex items-center justify-between ${
                        pod.position === 1
                          ? "bg-timing-yellow/10 border-timing-yellow/40 text-text-primary"
                          : "bg-surface-raised border-border-subtle text-text-secondary"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                          pod.position === 1 ? "bg-timing-yellow text-canvas" : "bg-surface-base text-text-muted border border-border-subtle"
                        }`}>
                          P{pod.position}
                        </span>
                        <div>
                          <div className="font-sans font-bold text-sm text-text-primary">
                            {pod.driver}
                          </div>
                          <div className="font-mono text-[10px] text-text-muted">
                            {pod.team}
                          </div>
                        </div>
                      </div>
                      <div className="text-right font-mono text-xs type-tabular">
                        <div className="text-accent-primary font-bold">{pod.time}</div>
                        <div className="text-text-muted text-[10px]">+{pod.points} PTS</div>
                      </div>
                    </div>
                  ))}
                </div>

                {heroData.last_race_results.fastest_lap && (
                  <div className="p-3 rounded border border-border-subtle bg-surface-raised flex items-center justify-between font-mono text-xs mt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-timing-purple font-bold">⚡ FASTEST LAP</span>
                      <span className="text-text-primary font-bold">
                        {heroData.last_race_results.fastest_lap.driver} ({heroData.last_race_results.fastest_lap.team})
                      </span>
                    </div>
                    <span className="text-accent-primary font-bold type-tabular">
                      {heroData.last_race_results.fastest_lap.lap_time}
                    </span>
                  </div>
                )}
              </div>

              {/* Middle Column: Top 5 Classification Table */}
              <div className="flex flex-col gap-3">
                <span className="font-mono text-[11px] text-text-muted uppercase tracking-wider">
                  TOP 5 CLASSIFICATION
                </span>
                <div className="rounded border border-border-subtle overflow-hidden bg-surface-raised">
                  <table className="w-full font-mono text-xs text-left">
                    <thead className="bg-surface-base text-[10px] text-text-muted border-b border-border-subtle uppercase">
                      <tr>
                        <th className="py-2 px-3">POS</th>
                        <th className="py-2 px-3">DRIVER</th>
                        <th className="py-2 px-3">TEAM</th>
                        <th className="py-2 px-3 text-right">GAP / TIME</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {heroData.last_race_results.top_finishers?.map((row) => (
                        <tr key={row.position} className="hover:bg-surface-elevated/40 transition-colors">
                          <td className="py-2 px-3 font-bold text-accent-primary type-tabular">
                            {row.position}
                          </td>
                          <td className="py-2 px-3 font-semibold text-text-primary font-sans">
                            {row.driver}
                          </td>
                          <td className="py-2 px-3 text-text-muted text-[11px] truncate max-w-[120px]">
                            {row.team}
                          </td>
                          <td className="py-2 px-3 text-right text-text-primary type-tabular">
                            {row.time}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column: Real Madring (Madrid) Track Telemetry Geometry */}
              <div className="flex flex-col gap-2 border border-border-subtle rounded p-4 bg-surface-raised relative overflow-hidden group">
                <div className="flex justify-between items-center text-[10px] font-mono text-text-muted uppercase">
                  <span>CIRCUIT // {heroData.last_race_results.circuit_name}</span>
                  <span className="type-tabular">{heroData.last_race_results.track_length_km} KM</span>
                </div>

                <div className="w-full h-[180px] flex items-center justify-center">
                  {heroData.last_race_results.track_geometry?.trackPath ? (
                    <svg
                      viewBox={heroData.last_race_results.track_geometry.viewBox || "0 0 480 260"}
                      className="w-full h-full text-text-muted/60 group-hover:text-accent-primary transition-colors duration-normal"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={heroData.last_race_results.track_geometry.trackPath} />
                      {heroData.last_race_results.track_geometry.startFinish && (
                        <circle
                          cx={heroData.last_race_results.track_geometry.startFinish.x}
                          cy={heroData.last_race_results.track_geometry.startFinish.y}
                          r="4"
                          className="fill-accent-primary text-accent-primary"
                        />
                      )}
                    </svg>
                  ) : (
                    <span className="font-mono text-xs text-text-muted">REAL TRACK GEOMETRY CACHED</span>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-border-subtle font-mono text-[10px] text-text-muted">
                  <span>TURNS: <strong className="text-text-primary">{heroData.last_race_results.turns}</strong></span>
                  <span className="text-timing-green font-semibold">AUTHENTIC FASTF1 TELEMETRY</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Real User Investigation History */}
        <section className="flex flex-col gap-6 border-t border-border-subtle pt-8">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-accent-primary font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
              INVESTIGATION_HISTORY // ARCHIVE
            </span>
            <span className="text-text-muted type-tabular">
              {isAuthenticated
                ? `${recentInvestigations.length} STORED // ${savedInvestigations.length} SAVED`
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

        {/* Real Live Editorial Pipeline (Read-Only Links, No Click-Triggered Invocations - Fix AA) */}
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
