import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BriefingHeader } from "@/components/BriefingHeader";
import { CircuitCanvas3D } from "@/components/ghost-battle/CircuitCanvas3D";
import { GhostBattleControls } from "@/components/ghost-battle/GhostBattleControls";
import { GhostBattleStatsTable } from "@/components/ghost-battle/GhostBattleStatsTable";
import {
  fetchGhostBattleYears,
  fetchGhostBattleGPs,
  fetchGhostBattleRoster,
  fetchGhostBattleData
} from "@/lib/api";

export function GhostBattle3D() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryYear = searchParams.get("year");
  const querySession = searchParams.get("session") || searchParams.get("gp");
  const queryDrivers = searchParams.get("drivers");

  // Step 1: Available Years
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(2024);
  const [isLoadingYears, setIsLoadingYears] = useState(true);

  // Step 2: Available Completed GPs
  const [gps, setGps] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedGpName, setSelectedGpName] = useState("");
  const [isLoadingGPs, setIsLoadingGPs] = useState(false);

  // Step 3: Roster (Teams and Drivers)
  const [roster, setRoster] = useState(null);
  const [selectedDriverCodes, setSelectedDriverCodes] = useState([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);

  // Step 4: 3D Ghost Battle Simulation Data
  const [battleData, setBattleData] = useState(null);
  const [isLoadingBattle, setIsLoadingBattle] = useState(false);
  const [battleError, setBattleError] = useState("");

  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const animFrameRef = useRef(null);
  const lastTimestampRef = useRef(null);

  // Load Years on Mount
  useEffect(() => {
    async function loadYears() {
      try {
        setIsLoadingYears(true);
        const data = await fetchGhostBattleYears();
        if (data && Array.isArray(data.years) && data.years.length > 0) {
          setYears(data.years);
          const detectedYear =
            querySession && querySession.split("_")[0].length === 4
              ? parseInt(querySession.split("_")[0])
              : null;

          if (detectedYear && data.years.includes(detectedYear)) {
            setSelectedYear(detectedYear);
          } else if (queryYear && data.years.includes(parseInt(queryYear))) {
            setSelectedYear(parseInt(queryYear));
          } else if (data.years.includes(2024)) {
            setSelectedYear(2024);
          } else {
            setSelectedYear(data.years[0]);
          }
        }
      } catch (err) {
        console.warn("[GhostBattle3D] Years load warning:", err.message);
        setYears([2024, 2023, 2022]);
        setSelectedYear(2024);
      } finally {
        setIsLoadingYears(false);
      }
    }
    loadYears();
  }, [querySession, queryYear]);

  // Load Completed GPs when Year changes
  useEffect(() => {
    if (!selectedYear) return;
    async function loadGPs() {
      try {
        setIsLoadingGPs(true);
        setGps([]);
        setRoster(null);
        setSelectedDriverCodes([]);
        setBattleData(null);

        const data = await fetchGhostBattleGPs(selectedYear);
        if (data && Array.isArray(data.gps) && data.gps.length > 0) {
          setGps(data.gps);
          // Check if URL specifies a session
          let matchedGp = null;
          if (querySession) {
            matchedGp = data.gps.find(
              (g) =>
                g.session_id === querySession ||
                g.session_id.toLowerCase().includes(querySession.toLowerCase()) ||
                g.name.toLowerCase().includes(querySession.toLowerCase())
            );
          }
          if (!matchedGp) {
            matchedGp = data.gps.find((g) => g.session_id.includes("british")) || data.gps[0];
          }
          setSelectedSessionId(matchedGp.session_id);
          setSelectedGpName(matchedGp.name);
        }
      } catch (err) {
        console.warn("[GhostBattle3D] GPs load warning:", err.message);
      } finally {
        setIsLoadingGPs(false);
      }
    }
    loadGPs();
  }, [selectedYear, querySession]);

  // Load Roster when Session changes
  useEffect(() => {
    if (!selectedSessionId) return;
    async function loadRoster() {
      try {
        setIsLoadingRoster(true);
        setRoster(null);
        setSelectedDriverCodes([]);
        setBattleData(null);
        setBattleError("");

        const data = await fetchGhostBattleRoster(selectedSessionId);
        if (data && data.drivers) {
          setRoster(data);
          // If queryDrivers is specified, use that
          if (queryDrivers) {
            const requested = queryDrivers
              .split(",")
              .map((c) => c.trim().toUpperCase())
              .filter((c) => data.drivers.some((d) => d.code === c));
            if (requested.length >= 2) {
              setSelectedDriverCodes(requested.slice(0, 22));
              return;
            }
          }
          // Default to first two drivers
          if (data.drivers.length >= 2) {
            setSelectedDriverCodes([data.drivers[0].code, data.drivers[1].code]);
          }
        }
      } catch (err) {
        console.warn("[GhostBattle3D] Roster load warning:", err.message);
        setBattleError("Failed to fetch session driver roster. Please sign in or check your connection.");
      } finally {
        setIsLoadingRoster(false);
      }
    }
    loadRoster();
  }, [selectedSessionId, queryDrivers]);

  // Handle Driver Toggle
  const handleToggleDriver = (code) => {
    setSelectedDriverCodes((prev) => {
      if (prev.includes(code)) {
        return prev.filter((c) => c !== code);
      } else {
        if (prev.length >= 22) return prev;
        return [...prev, code];
      }
    });
  };

  // Handle Team Toggle (auto-selects both of that team's drivers)
  const handleToggleTeam = (team) => {
    const teamDriverCodes = team.drivers.map((d) => d.code);
    const allSelected = teamDriverCodes.every((c) => selectedDriverCodes.includes(c));

    if (allSelected) {
      // Deselect team's drivers
      setSelectedDriverCodes((prev) => prev.filter((c) => !teamDriverCodes.includes(c)));
    } else {
      // Select team's drivers
      setSelectedDriverCodes((prev) => {
        const set = new Set([...prev, ...teamDriverCodes]);
        return Array.from(set).slice(0, 22);
      });
    }
  };

  const battleSectionRef = useRef(null);

  // Step 4: Generate 3D Ghost Battle
  const handleGenerateBattle = async () => {
    if (!selectedSessionId) {
      setBattleError("Please select a completed Grand Prix session.");
      return;
    }
    if (selectedDriverCodes.length < 2) {
      setBattleError("Please select at least 2 drivers (maximum 22) for the ghost battle.");
      return;
    }

    try {
      setIsLoadingBattle(true);
      setBattleError("");
      setIsPlaying(false);
      setCurrentTime(0);

      const data = await fetchGhostBattleData(selectedSessionId, selectedDriverCodes);
      if (data && data.drivers) {
        setBattleData(data);
        setIsPlaying(true);
        setTimeout(() => {
          battleSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 150);
      }
    } catch (err) {
      console.error("[GhostBattle3D] Battle load error:", err);
      setBattleError(err.message || "Failed to generate 3D ghost battle.");
    } finally {
      setIsLoadingBattle(false);
    }
  };

  // Playback Animation Loop
  const maxLapTime = battleData
    ? Math.max(...battleData.drivers.map((d) => d.lap_time_s)) + 1.5
    : 100;

  useEffect(() => {
    if (!isPlaying) {
      lastTimestampRef.current = null;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const animate = (timestamp) => {
      if (lastTimestampRef.current !== null) {
        const deltaSec = (timestamp - lastTimestampRef.current) / 1000;
        setCurrentTime((prev) => {
          const next = prev + deltaSec * playbackSpeed;
          if (next >= maxLapTime) {
            setIsPlaying(false);
            return maxLapTime;
          }
          return next;
        });
      }
      lastTimestampRef.current = timestamp;
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, playbackSpeed, maxLapTime]);

  const handleTogglePlay = () => {
    if (currentTime >= maxLapTime) {
      setCurrentTime(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (newTime) => {
    setCurrentTime(newTime);
  };

  return (
    <div className="min-h-screen bg-canvas text-text-secondary flex flex-col font-sans selection:bg-drs-cyan/20 selection:text-drs-cyan">
      {/* Header */}
      <BriefingHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Ghost Battle 3D", href: "/ghost-battle" }
        ]}
        sessionState="GHOST_BATTLE_3D"
        onLogoClick={() => navigate("/")}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-[1500px] mx-auto px-4 py-6 flex flex-col gap-8">
        {/* Title Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-fw-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-mono-meta font-mono text-drs-cyan tracking-widest uppercase">
                GHOST_BATTLE // THREE.JS_3D_ENGINE
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-drs-cyan/10 border border-drs-cyan/30 text-drs-cyan font-bold">
                MULTI-CAR TIMING SYNC
              </span>
            </div>
            <h1 className="text-display text-text-primary mt-1">
              Interactive 3D Telemetry Ghost Battle
            </h1>
            <p className="text-text-muted text-sm max-w-2xl mt-1">
              Select any completed Grand Prix, pick up to 22 drivers or entire teams, and experience their authentic fastest flying laps synchronized by real elapsed time in full 3D space.
            </p>
          </div>
        </div>

        {/* 4-Step Selection Control Deck */}
        <div className="flex flex-col gap-6 p-5 rounded-card border border-fw-border bg-panel/40 shadow-md">
          <div className="flex items-center justify-between border-b border-fw-border/60 pb-3">
            <span className="text-mono-meta font-mono text-text-muted uppercase tracking-wider">
              CONFIGURE GHOST BATTLE // 4-STEP SETUP
            </span>
            <span className="text-mono-meta font-mono text-drs-cyan font-semibold">
              {selectedDriverCodes.length}/22 DRIVERS SELECTED
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1: Season Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono uppercase text-text-muted">
                Step 1: Select Season
              </label>
              <select
                id="year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                disabled={isLoadingYears || isLoadingBattle}
                className="w-full bg-surface border border-fw-border rounded-sm px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-drs-cyan cursor-pointer"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y} Season (FastF1 Verified)
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Completed GP Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="gp-select" className="text-[11px] font-mono uppercase text-text-muted">
                Step 2: Select Grand Prix (Completed Races)
              </label>
              <select
                id="gp-select"
                value={selectedSessionId}
                onChange={(e) => {
                  setSelectedSessionId(e.target.value);
                  const found = gps.find((g) => g.session_id === e.target.value);
                  if (found) setSelectedGpName(found.name);
                }}
                disabled={isLoadingGPs || gps.length === 0 || isLoadingBattle}
                className="w-full bg-surface border border-fw-border rounded-sm px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-drs-cyan cursor-pointer"
              >
                {gps.map((gp) => (
                  <option key={gp.session_id} value={gp.session_id}>
                    R{gp.round}: {gp.name} ({gp.location})
                  </option>
                ))}
              </select>
            </div>

            {/* Step 4: Action Generate Button */}
            <div className="flex flex-col justify-end">
              <button
                id="btn-generate-battle"
                onClick={handleGenerateBattle}
                disabled={
                  isLoadingBattle ||
                  isLoadingRoster ||
                  selectedDriverCodes.length < 2 ||
                  selectedDriverCodes.length > 22
                }
                className="w-full py-2.5 px-4 rounded-sm bg-drs-cyan text-canvas font-mono font-bold text-xs uppercase tracking-wider hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2"
              >
                {isLoadingBattle ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-canvas border-t-transparent rounded-full animate-spin" />
                    <span>EXTRACTING 3D TELEMETRY...</span>
                  </>
                ) : (
                  <span>GENERATE 3D GHOST BATTLE ({selectedDriverCodes.length} DRIVERS) →</span>
                )}
              </button>
            </div>
          </div>

          {/* Error Banner if any */}
          {battleError && (
            <div className="p-3 rounded bg-f1-red/10 border border-f1-red/40 text-f1-red text-xs font-mono">
              ⚠ {battleError}
            </div>
          )}

          {/* Step 3: F1.com Style Team & Driver Multi-Select */}
          {roster && (
            <div className="flex flex-col gap-4 pt-4 border-t border-fw-border/60">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-text-muted uppercase tracking-wider">
                  Step 3: Select Teams & Drivers ({selectedGpName || "Grand Prix"} Official Grid)
                </span>
                <div className="flex gap-2">
                  <button
                    id="btn-select-all-drivers"
                    onClick={() =>
                      setSelectedDriverCodes(roster.drivers.slice(0, 22).map((d) => d.code))
                    }
                    className="text-[10px] font-mono text-drs-cyan hover:underline"
                  >
                    SELECT ALL (20)
                  </button>
                  <span className="text-text-muted text-[10px]">•</span>
                  <button
                    id="btn-clear-drivers"
                    onClick={() => setSelectedDriverCodes([])}
                    className="text-[10px] font-mono text-text-muted hover:text-text-primary"
                  >
                    CLEAR
                  </button>
                </div>
              </div>

              {/* Team Gradient Cards (Auto-select both drivers) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {roster.teams.map((team) => {
                  const teamCodes = team.drivers.map((d) => d.code);
                  const isTeamSelected = teamCodes.every((c) => selectedDriverCodes.includes(c));
                  const isPartiallySelected =
                    !isTeamSelected && teamCodes.some((c) => selectedDriverCodes.includes(c));
                  const teamName = team.name || team.team_name || "Unknown";
                  const teamColor = team.color || team.team_color || "#00E5FF";
                  const teamSlug = teamName.toLowerCase().replace(/[^a-z0-9]/g, "-");

                  return (
                    <div
                      key={team.id}
                      id={`team-card-${teamSlug}`}
                      onClick={() => handleToggleTeam(team)}
                      className={`cursor-pointer p-3 rounded-card border transition-all duration-150 flex flex-col justify-between relative overflow-hidden select-none group ${
                        isTeamSelected
                          ? "border-drs-cyan bg-panel shadow-[0_0_12px_rgba(0,229,255,0.15)]"
                          : isPartiallySelected
                          ? "border-fw-border-active bg-panel/70"
                          : "border-fw-border/70 bg-panel/30 hover:border-fw-border hover:bg-panel/50"
                      }`}
                    >
                      <div
                        className="absolute inset-0 opacity-10 pointer-events-none transition-opacity group-hover:opacity-20"
                        style={{
                          background: `linear-gradient(135deg, ${teamColor} 0%, transparent 80%)`
                        }}
                      />
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-bold text-text-primary">
                          {teamName}
                        </span>
                        <span
                          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] border ${
                            isTeamSelected
                              ? "bg-drs-cyan text-canvas border-drs-cyan font-bold"
                              : isPartiallySelected
                              ? "border-drs-cyan text-drs-cyan"
                              : "border-fw-border"
                          }`}
                        >
                          {isTeamSelected ? "✓" : isPartiallySelected ? "•" : ""}
                        </span>
                      </div>

                      <div className="flex gap-1">
                        {team.drivers.map((drv) => (
                          <span
                            key={drv.code}
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              selectedDriverCodes.includes(drv.code)
                                ? "bg-drs-cyan/20 text-drs-cyan font-bold border border-drs-cyan/40"
                                : "bg-surface text-text-muted border border-fw-border/40"
                            }`}
                          >
                            {drv.code}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Individual Driver Multi-Select Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-2 pt-2">
                {roster.drivers.map((drv) => {
                  const isSelected = selectedDriverCodes.includes(drv.code);
                  return (
                    <div
                      key={drv.code}
                      id={`driver-card-${drv.code.toLowerCase()}`}
                      onClick={() => handleToggleDriver(drv.code)}
                      className={`cursor-pointer p-2 rounded border text-center transition-all select-none relative ${
                        isSelected
                          ? "border-drs-cyan bg-drs-cyan/10 shadow-sm"
                          : "border-fw-border/60 bg-surface/40 hover:border-fw-border"
                      }`}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full absolute top-1.5 right-1.5"
                        style={{ backgroundColor: drv.team_color || "#00E5FF" }}
                      />
                      <span className="text-[9px] font-mono text-text-muted">#{drv.number}</span>
                      <h4 className="text-xs font-mono font-bold text-text-primary">{drv.code}</h4>
                      <p className="text-[9px] font-sans text-text-muted truncate mt-0.5">
                        {drv.last_name || drv.name}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 3D Scene Viewport & Controls */}
        {battleData && (
          <div
            ref={battleSectionRef}
            id="ghost-battle-view"
            className="flex flex-col gap-6 animate-slide-up"
          >
            {/* 3D Canvas */}
            <CircuitCanvas3D
              circuit={battleData.circuit}
              drivers={battleData.drivers}
              currentTime={currentTime}
            />

            {/* Playback Controls */}
            <GhostBattleControls
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
              currentTime={currentTime}
              maxTime={maxLapTime}
              onSeek={handleSeek}
              playbackSpeed={playbackSpeed}
              onChangeSpeed={(s) => setPlaybackSpeed(s)}
              onReset={handleReset}
            />

            {/* Per-Driver Real Telemetry Scorecard */}
            <GhostBattleStatsTable
              drivers={battleData.drivers}
              currentTime={currentTime}
            />
          </div>
        )}
      </main>
    </div>
  );
}
