import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BriefingHeader } from "@/components/BriefingHeader";
import { ComparisonSlider } from "@/components/ComparisonSlider";
import { StrategyTimeline } from "@/components/StrategyTimeline";
import { PitWindowVisualizer } from "@/components/PitWindowVisualizer";
import { SimulationResult } from "@/components/SimulationResult";
import {
  AUSTRIAN_GP,
  STRATEGIES,
  SAI_ALTERNATIVE_STINTS
} from "@/lib/data";
export function StrategyPlayground() {
  const navigate = useNavigate();
  const [pitLap, setPitLap] = useState(22);
  const [isComputing, setIsComputing] = useState(false);
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Austrian GP Briefing", href: `/race/${AUSTRIAN_GP.id}` },
    { label: "Strategy Playground", href: "#" }
  ];
  const simData = useMemo(() => {
    if (pitLap === 22) {
      return {
        stints: STRATEGIES.SAI,
        result: {
          actual: { position: 3, time: "1:26:42.880" },
          simulated: { position: 3, time: "1:26:42.880" },
          delta: { positions: 0, seconds: 0 },
          confidence: 99,
          simType: "v1_single"
        },
        rivals: [
          { code: "VER", gapAtExit: -1.2, position: 2, isDirtyAir: true },
          { code: "HAM", gapAtExit: 4.5, position: 4, isDirtyAir: false }
        ],
        commentary: "Carlos Sainz actual pit timing on Lap 22. Placed in Verstappen's dirty air sector bubble (-1.2s behind), which accelerated pace decay on the early hard compound stints."
      };
    }
    if (pitLap === 20) {
      return {
        stints: SAI_ALTERNATIVE_STINTS,
        result: {
          actual: { position: 3, time: "1:26:42.880" },
          simulated: { position: 2, time: "1:26:41.480" },
          delta: { positions: 1, seconds: 1.4 },
          confidence: 87,
          simType: "v1_single"
        },
        rivals: [
          { code: "VER", gapAtExit: -2.1, position: 1, isDirtyAir: false },
          { code: "HAM", gapAtExit: 6.2, position: 4, isDirtyAir: false }
        ],
        commentary: "Optimal pit stop window. Exits with +2.1s clean air cushion behind Verstappen. Gained +1.400s total simulation time difference, securing P2 ahead of Oscar Piastri."
      };
    }
    if (pitLap < 20) {
      const earlyStints = [
        { compound: "medium", startLap: 1, endLap: pitLap, wearSlope: 0.078, isActual: false },
        { compound: "hard", startLap: pitLap + 1, endLap: 48, wearSlope: 0.048, isActual: false },
        { compound: "medium", startLap: 49, endLap: 71, wearSlope: 0.065, isActual: false }
      ];
      return {
        stints: earlyStints,
        result: {
          actual: { position: 3, time: "1:26:42.880" },
          simulated: { position: 3, time: "1:26:42.480" },
          delta: { positions: 0, seconds: 0.4 },
          confidence: 76,
          simType: "v1_single"
        },
        rivals: [
          { code: "PIA", gapAtExit: -0.8, position: 2, isDirtyAir: true },
          { code: "HAM", gapAtExit: 3.2, position: 4, isDirtyAir: false }
        ],
        commentary: "Pit entry triggers early traffic bottleneck. Exits behind Oscar Piastri in a -0.8s dirty air zone, neutralising tire life benefits from early pit stop window."
      };
    }
    const lateStints = [
      { compound: "medium", startLap: 1, endLap: pitLap, wearSlope: 0.078, isActual: false },
      { compound: "hard", startLap: pitLap + 1, endLap: 53, wearSlope: 0.054, isActual: false },
      { compound: "medium", startLap: 54, endLap: 71, wearSlope: 0.07, isActual: false }
    ];
    return {
      stints: lateStints,
      result: {
        actual: { position: 3, time: "1:26:42.880" },
        simulated: { position: 4, time: "1:26:44.080" },
        delta: { positions: -1, seconds: -1.2 },
        confidence: 82,
        simType: "v1_single"
      },
      rivals: [
        { code: "RUS", gapAtExit: -0.4, position: 3, isDirtyAir: true },
        { code: "HAM", gapAtExit: -1.5, position: 4, isDirtyAir: true }
      ],
      commentary: "Late pit stop window. Medium degradation pace drops below hard compound crossover point. Leaks position to Lewis Hamilton and exits in heavy constructor traffic."
    };
  }, [pitLap]);
  const sliderMarkers = [
    { value: 18, label: "Early Traffic", type: "default" },
    { value: 20, label: "Optimal P2", type: "optimal" },
    { value: 22, label: "Actual P3", type: "actual" },
    { value: 24, label: "Late Loss", type: "default" }
  ];
  const handleSliderChange = (val) => {
    setIsComputing(true);
    setTimeout(() => {
      setPitLap(val);
      setIsComputing(false);
    }, 400);
  };
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text-secondary)] flex flex-col font-sans selection:bg-[var(--accent-primary)]/20 selection:text-[var(--text-primary)]">
      {/* Header */}
      <BriefingHeader
        breadcrumbs={breadcrumbs}
        sessionState={isComputing ? "loading" : "idle"}
        onLogoClick={() => navigate("/")}
        onBreadcrumbClick={(index) => {
          if (index === 0) navigate("/");
          if (index === 1) navigate(`/race/${AUSTRIAN_GP.id}`);
        }}
      />

      {/* Main Content Layout */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side (Colspan 2): Sliders & timelines */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="border-b border-[var(--border-subtle)] pb-4">
            <span className="text-[10px] font-mono text-[var(--accent-primary)] tracking-widest uppercase font-semibold">
              Strategy Playground • What-If Simulation
            </span>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[var(--text-primary)] mt-1 font-sans">
              Carlos Sainz Strategy Simulator
            </h1>
            <p className="text-[var(--text-muted)] text-sm mt-1">
              Drag the timing slider to recalculate the traffic re-entry queue, stint lengths, and projected final race time delta.
            </p>
          </div>

          {/* Slider */}
          <ComparisonSlider
            min={15}
            max={30}
            value={pitLap}
            markers={sliderMarkers}
            isComputing={isComputing}
            onChange={handleSliderChange}
          />

          {/* Strategy Timeline comparing Actual vs Simulated */}
          <section className="flex flex-col gap-3">
            <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider font-semibold">
              Stint Timeline Comparison
            </span>
            <StrategyTimeline
              stints={STRATEGIES.SAI}
              simulated={simData.stints}
              totalLaps={AUSTRIAN_GP.totalLaps}
              driverCode="SAI"
              variant="comparison"
            />
          </section>

          {/* AI Strategy Commentary */}
          <section className="bg-[var(--surface-base)] border border-[var(--border-subtle)] rounded-lg p-4 border-l-4 border-l-[var(--accent-primary)] shadow-sm">
            <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider block mb-1 font-semibold">
              Tactical Debrief
            </span>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {simData.commentary}
            </p>
          </section>
        </div>

        {/* Right Side Column: Exit Traffic Map & Simulation results */}
        <div className="flex flex-col gap-6">
          {/* Simulation Output Card */}
          <section className="flex flex-col gap-3">
            <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider font-semibold">
              Simulated Projections
            </span>
            <SimulationResult
              result={simData.result}
              variant="detailed"
              onShareResult={() => console.log("Share")}
            />
          </section>

          {/* Traffic Visualizer */}
          <section className="flex flex-col gap-3">
            <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider font-semibold">
              Traffic Re-Entry Model
            </span>
            <PitWindowVisualizer
              pittingDriver={{ code: "SAI", exitLap: pitLap, pitLossTime: 22 }}
              rivals={simData.rivals}
              cleanAirThreshold={1.5}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
