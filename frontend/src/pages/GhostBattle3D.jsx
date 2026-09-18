import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BriefingHeader } from "@/components/BriefingHeader";
import { CircuitCanvas3D } from "@/components/ghost-battle/CircuitCanvas3D";
import { GhostBattleControls } from "@/components/ghost-battle/GhostBattleControls";
import { GhostBattleStatsTable } from "@/components/ghost-battle/GhostBattleStatsTable";
import F1Dropdown from "@/components/ghost-battle/F1Dropdown";
import TeamBadge from "@/components/ghost-battle/TeamBadge";
import TeamCar3D from "@/components/ghost-battle/TeamCar3D";
import DriverAvatar from "@/components/ghost-battle/DriverAvatar";
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
  const [hoveredTeamId, setHoveredTeamId] = useState(null);

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
        setSearchParams({
          session: selectedSessionId,
          drivers: selectedDriverCodes.join(",")
        });
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
    <div className="min-h-screen bg-canvas text-text-secondary flex flex-col font-sans selection:bg-accent-primary/20 selection:text-accent-primary">
      {/* Header */}
      <BriefingHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Ghost Battle 3D", href: "/ghost-battle" }
        ]}
        sessionState="idle"
        onLogoClick={() => navigate("/")}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-[1500px] mx-auto px-4 py-6 flex flex-col gap-8">
        {/* Title Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border-subtle pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-mono-meta font-mono text-accent-primary tracking-widest uppercase">
                Ghost Battle • 3D Telemetry
              </span>
              <span className="text-badge font-mono px-2 py-0.5 rounded-badge bg-accent-primary/10 border border-accent-primary/30 text-accent-primary font-bold">
                Multi-Car Timing Sync
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
        <div className="flex flex-col gap-6 p-5 rounded-card border border-border-subtle bg-surface-base/80 backdrop-blur-md shadow-card">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <span className="text-mono-meta font-mono text-text-muted uppercase tracking-wider">
              Configure Ghost Battle • Setup
            </span>
            <span className="text-mono-meta font-mono text-accent-primary font-semibold type-tabular">
              {selectedDriverCodes.length}/22 Drivers Selected
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1: Season Dropdown */}
            <div className="flex flex-col gap-1.5 relative z-30">
              <label htmlFor="year-select" className="text-badge font-mono uppercase text-text-muted flex items-center justify-between">
                <span>Step 1: Select Season</span>
                {selectedYear === 2026 && (
                  <span className="text-[9px] font-mono text-accent-primary px-1.5 py-0.5 rounded-badge bg-accent-primary/10 border border-accent-primary/30 font-bold">
                    2026 Grid Active
                  </span>
                )}
              </label>
              <F1Dropdown
                id="year-select"
                value={selectedYear}
                onChange={(val) => setSelectedYear(parseInt(val))}
                disabled={isLoadingYears || isLoadingBattle}
                placeholder="Select Season..."
                accentColor="red"
                options={years.map((y) => ({
                  value: y,
                  label: `${y} Season`,
                  sublabel: y === 2026 ? "Authentic 2026 Regulations Grid & Lineups" : "Official Session Telemetry"
                }))}
              />
            </div>

            {/* Step 2: Completed GP Dropdown */}
            <div className="flex flex-col gap-1.5 relative z-20">
              <label htmlFor="gp-select" className="text-badge font-mono uppercase text-text-muted flex items-center justify-between">
                <span>Step 2: Select Grand Prix ({gps.length} Completed)</span>
                {selectedGpName && (
                  <span className="text-[9px] text-text-muted truncate max-w-[140px]">
                    {selectedGpName}
                  </span>
                )}
              </label>
              <F1Dropdown
                id="gp-select"
                value={selectedSessionId}
                onChange={(val) => {
                  setSelectedSessionId(val);
                  const found = gps.find((g) => g.session_id === val);
                  if (found) setSelectedGpName(found.name);
                }}
                disabled={isLoadingGPs || gps.length === 0 || isLoadingBattle}
                placeholder={isLoadingGPs ? "Loading Grand Prix..." : "Select Grand Prix..."}
                accentColor="red"
                options={gps.map((gp) => ({
                  value: gp.session_id,
                  label: `Round ${gp.round}: ${gp.name}`,
                  sublabel: `${gp.location}, ${gp.country} • ${gp.event_date}`
                }))}
              />
            </div>

            {/* Step 4: Action Generate Button */}
            <div className="flex flex-col justify-end relative z-10">
              <button
                id="btn-generate-battle"
                onClick={handleGenerateBattle}
                disabled={
                  isLoadingBattle ||
                  isLoadingRoster ||
                  selectedDriverCodes.length < 2 ||
                  selectedDriverCodes.length > 22
                }
                className="w-full btn-f1-primary text-xs uppercase tracking-wider py-2.5 px-4 flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {isLoadingBattle ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Extracting 3D telemetry...</span>
                  </>
                ) : (
                  <span>Generate 3D Ghost Battle ({selectedDriverCodes.length} Drivers) →</span>
                )}
              </button>
            </div>
          </div>

          {/* Error Banner if any */}
          {battleError && (
            <div className="p-3 rounded-card bg-accent-danger/10 border border-accent-danger/40 text-accent-danger text-xs font-mono">
              ⚠ {battleError}
            </div>
          )}

          {/* Step 3: F1 Broadcast Style Team & Driver Multi-Select */}
          {roster && (
            <div className="flex flex-col gap-4 pt-4 border-t border-border-subtle">
              <div className="flex items-center justify-between">
                <span className="text-badge font-mono text-text-muted uppercase tracking-wider">
                  Step 3: Select Teams & Drivers ({selectedGpName || "Grand Prix"} Official Grid)
                </span>
                <div className="flex gap-2">
                  <button
                    id="btn-select-all-drivers"
                    onClick={() =>
                      setSelectedDriverCodes(roster.drivers.slice(0, 22).map((d) => d.code))
                    }
                    className="text-badge font-mono text-accent-primary hover:underline cursor-pointer"
                  >
                    Select All ({roster.drivers.length})
                  </button>
                  <span className="text-text-muted text-[10px]">•</span>
                  <button
                    id="btn-clear-drivers"
                    onClick={() => setSelectedDriverCodes([])}
                    className="text-badge font-mono text-text-muted hover:text-text-primary cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Team 3D & Geometric Badged Cards (Auto-select both drivers) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
                {roster.teams.map((team) => {
                  const teamCodes = team.drivers.map((d) => d.code);
                  const isTeamSelected = teamCodes.length > 0 && teamCodes.every((c) => selectedDriverCodes.includes(c));
                  const isPartiallySelected =
                    !isTeamSelected && teamCodes.some((c) => selectedDriverCodes.includes(c));
                  const teamName = team.name || team.team_name || "Unknown";
                  const teamColor = team.color || team.team_color || "#E10600";
                  const teamSlug = teamName.toLowerCase().replace(/[^a-z0-9]/g, "-");

                  return (
                    <div
                      key={team.id}
                      id={`team-card-${teamSlug}`}
                      onClick={() => handleToggleTeam(team)}
                      onMouseEnter={() => setHoveredTeamId(team.id)}
                      onMouseLeave={() => setHoveredTeamId(null)}
                      className={`cursor-pointer p-3.5 rounded-card border transition-all duration-200 flex flex-col justify-between relative overflow-hidden select-none group ${
                        isTeamSelected
                          ? "border-accent-primary bg-surface-raised shadow-[0_0_16px_rgba(225,6,0,0.2)] ring-1 ring-accent-primary/40"
                          : isPartiallySelected
                          ? "border-border-strong bg-surface-raised/90 shadow-card"
                          : "border-border-subtle bg-surface-base/80 hover:border-border-strong hover:bg-surface-raised shadow-card"
                      }`}
                    >
                      {/* Ambient Accent Tint */}
                      <div
                        className="absolute inset-0 opacity-10 pointer-events-none transition-opacity group-hover:opacity-20"
                        style={{
                          background: `radial-gradient(circle at top right, ${teamColor} 0%, transparent 70%)`
                        }}
                      />

                      {/* Header: Geometric Badge, Team Name, and Selection Status */}
                      <div className="flex items-center justify-between gap-2 mb-2 relative z-10">
                        <div className="flex items-center gap-2 min-w-0">
                          <TeamBadge teamName={teamName} teamColor={teamColor} size={28} />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-mono font-bold text-text-primary truncate group-hover:text-accent-primary transition-colors">
                              {teamName}
                            </span>
                            <span className="text-[10px] font-mono text-text-muted truncate">
                              {team.drivers.map((d) => d.code).join(" / ")}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[10px] border transition-colors ${
                            isTeamSelected
                              ? "bg-accent-primary text-white border-accent-primary font-bold"
                              : isPartiallySelected
                              ? "border-accent-primary text-accent-primary"
                              : "border-border-subtle text-transparent"
                          }`}
                        >
                          {isTeamSelected ? "✓" : isPartiallySelected ? "•" : ""}
                        </span>
                      </div>

                      {/* Middle: 3D Low-Poly Car Silhouette */}
                      <div className="py-1 my-0.5 border-y border-border-subtle/50 bg-black/20 rounded relative z-10">
                        <TeamCar3D
                          teamName={teamName}
                          primaryColor={teamColor}
                          isHovered={hoveredTeamId === team.id}
                        />
                      </div>

                      {/* Bottom: Driver Pills */}
                      <div className="flex items-center gap-1.5 pt-2 relative z-10">
                        {team.drivers.map((drv) => {
                          const isDriverSelected = selectedDriverCodes.includes(drv.code);
                          return (
                            <div
                              key={drv.code}
                              className={`flex-1 flex items-center justify-between px-2 py-1 rounded text-[10px] font-mono border transition-all ${
                                isDriverSelected
                                  ? "bg-accent-primary/15 text-accent-primary font-bold border-accent-primary/40 shadow-sm"
                                  : "bg-surface-base text-text-muted border-border-subtle hover:border-border-strong"
                              }`}
                            >
                              <span>{drv.code}</span>
                              <span className="text-[9px] font-sans text-text-muted truncate max-w-[48px]">
                                {drv.last_name || drv.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Individual Driver Multi-Select Cards with Stylized Vector Avatars */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-11 gap-2.5 pt-2">
                {roster.drivers.map((drv) => {
                  const isSelected = selectedDriverCodes.includes(drv.code);
                  return (
                    <div
                      key={drv.code}
                      id={`driver-card-${drv.code.toLowerCase()}`}
                      onClick={() => handleToggleDriver(drv.code)}
                      className={`cursor-pointer p-2.5 rounded-card border transition-all select-none flex flex-col items-center justify-between text-center relative group ${
                        isSelected
                          ? "border-accent-primary bg-accent-primary/10 shadow-[0_0_12px_rgba(225,6,0,0.25)] ring-1 ring-accent-primary/30"
                          : "border-border-subtle bg-surface-base/80 hover:border-border-strong hover:bg-surface-raised"
                      }`}
                    >
                      {/* Top Header: Number and Status indicator */}
                      <div className="w-full flex items-center justify-between text-[10px] font-mono text-text-muted mb-1">
                        <span className="font-bold type-tabular">#{drv.number}</span>
                        <span
                          className={`w-3 h-3 rounded-full flex items-center justify-center text-[8px] border ${
                            isSelected
                              ? "bg-accent-primary text-white border-accent-primary font-bold"
                              : "border-border-subtle text-transparent"
                          }`}
                        >
                          {isSelected ? "✓" : ""}
                        </span>
                      </div>

                      {/* Driver Avatar Silhouette */}
                      <div className="py-1">
                        <DriverAvatar
                          teamColor={drv.team_color}
                          size={38}
                          isSelected={isSelected}
                          className="group-hover:scale-105 transition-transform"
                        />
                      </div>

                      {/* Driver Info */}
                      <div className="w-full mt-1.5 pt-1 border-t border-border-subtle">
                        <h4 className={`text-xs font-mono font-bold leading-tight ${
                          isSelected ? "text-accent-primary" : "text-text-primary"
                        }`}>
                          {drv.code}
                        </h4>
                        <p className="text-[10px] font-sans text-text-muted truncate mt-0.5">
                          {drv.last_name || drv.name}
                        </p>
                        <p className="text-[9px] font-mono text-text-muted/80 truncate">
                          {drv.team_name}
                        </p>
                      </div>
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

export default GhostBattle3D;
