import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Gauge,
  Activity,
  Sliders,
  Award,
  ChevronRight,
  Workflow
} from 'lucide-react';

// Live Telemetry Loop dataset for Spielberg Austrian GP
const TELEMETRY_STREAM = [
  { speed: 285, throttle: 100, brake: 0, gear: 7, rpm: 11800, drs: true, gForce: 2.1, corner: "Start/Finish Straight" },
  { speed: 298, throttle: 100, brake: 0, gear: 8, rpm: 12100, drs: true, gForce: 1.5, corner: "DRS Zone 1" },
  { speed: 180, throttle: 20, brake: 80, gear: 4, rpm: 9800, drs: false, gForce: 3.8, corner: "T1 (Niki Lauda) Apex" },
  { speed: 220, throttle: 80, brake: 0, gear: 5, rpm: 10500, drs: false, gForce: 2.9, corner: "T1 Exit" },
  { speed: 304, throttle: 100, brake: 0, gear: 8, rpm: 12200, drs: true, gForce: 1.2, corner: "Uphill Straight" },
  { speed: 314, throttle: 100, brake: 0, gear: 8, rpm: 12400, drs: true, gForce: 1.0, corner: "DRS Zone 2" },
  { speed: 82, throttle: 0, brake: 100, gear: 2, rpm: 8200, drs: false, gForce: 4.2, corner: "T3 (Remus) Hairpin" },
  { speed: 64, throttle: 15, brake: 20, gear: 1, rpm: 7500, drs: false, gForce: 2.5, corner: "Remus Apex" },
  { speed: 120, throttle: 90, brake: 0, gear: 3, rpm: 9200, drs: false, gForce: 3.2, corner: "T3 Exit" },
  { speed: 240, throttle: 100, brake: 0, gear: 6, rpm: 11000, drs: false, gForce: 2.4, corner: "Downhill Straight" },
  { speed: 295, throttle: 100, brake: 0, gear: 7, rpm: 11900, drs: false, gForce: 1.8, corner: "T4 Entry" },
  { speed: 172, throttle: 30, brake: 40, gear: 4, rpm: 9600, drs: false, gForce: 3.5, corner: "T4 (Rauch) Apex" },
  { speed: 215, throttle: 85, brake: 0, gear: 5, rpm: 10400, drs: false, gForce: 2.8, corner: "T4 Exit" },
  { speed: 195, throttle: 70, brake: 10, gear: 4, rpm: 9900, drs: false, gForce: 3.2, corner: "T5-T6 Infield" },
  { speed: 210, throttle: 90, brake: 0, gear: 5, rpm: 10200, drs: false, gForce: 3.0, corner: "T7 Sweep" },
  { speed: 238, throttle: 100, brake: 0, gear: 6, rpm: 11200, drs: false, gForce: 3.4, corner: "T8 Curve" },
  { speed: 255, throttle: 50, brake: 30, gear: 6, rpm: 11400, drs: false, gForce: 3.8, corner: "T9 Entry" },
  { speed: 185, throttle: 80, brake: 0, gear: 5, rpm: 9400, drs: false, gForce: 4.0, corner: "T10 (Red Bull Mobile)" },
];

const LandingPage: React.FC = () => {
  // State for live telemetry ticker
  const [teleIdx, setTeleIdx] = useState(0);
  const activeTelemetry = TELEMETRY_STREAM[teleIdx];

  // State for Interactive Simulator Case Study
  const [pitLap, setPitLap] = useState(20);
  
  // State for Scorecard metrics tab
  const [activeScoreTab, setActiveScoreTab] = useState<'strat' | 'tire' | 'pace' | 'pit' | 'exec'>('strat');

  // Trigger telemetry interval
  useEffect(() => {
    const interval = setInterval(() => {
      setTeleIdx((prev) => (prev + 1) % TELEMETRY_STREAM.length);
    }, 450);
    return () => clearInterval(interval);
  }, []);

  // Compute mock simulator values based on selected slider lap
  const getSimResults = (lap: number) => {
    if (lap <= 19) {
      const timeGain = 0.95 + (lap - 15) * 0.12;
      return {
        gain: `+${timeGain.toFixed(3)}s`,
        gainColor: 'text-[#1BC944]',
        position: 'P3 (Maintained)',
        window: 'Slight traffic (0.8s to ALBO)',
        desc: `Sainz pits early on Lap ${lap}. While it clears the immediate threat from Hamilton, he encounters a brief slipstream bottleneck behind Albon's Williams, marginally capping out-lap momentum.`,
        gapToHam: '+2.4s',
        status: 'Undercut Attempted',
        statusBg: 'bg-[#FFD600]/10 text-[#FFD600] border-[#FFD600]/30',
        relativeExit: 45 // percent distance slider
      };
    } else if (lap >= 20 && lap <= 21) {
      const timeGain = 1.400 - (lap - 20) * 0.20;
      return {
        gain: `+${timeGain.toFixed(3)}s`,
        gainColor: 'text-[#1BC944]',
        position: 'P3 (Maintained)',
        window: 'Clean Air (+2.1s clear)',
        desc: `Optimal Strategy Window. Pitting Carlos Sainz on Lap ${lap} completely clears Lewis Hamilton's dirty-air window, maximizing out-lap thermal grip and securing the podium.`,
        gapToHam: '+2.8s',
        status: 'Optimal Undercut',
        statusBg: 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/30',
        relativeExit: 65
      };
    } else if (lap === 22) {
      return {
        gain: '0.000s (Baseline)',
        gainColor: 'text-[#8B95A5]',
        position: 'P3 (Baseline)',
        window: 'Dirty Air (0.2s behind HAM)',
        desc: `Historical Strategy. Sainz pitted on Lap 22. He re-entered the track directly behind Hamilton, stuck in dirty air which capped aerodynamic downforce for 4 subsequent laps.`,
        gapToHam: '+0.2s',
        status: 'Historical Baseline',
        statusBg: 'bg-[#16191E] text-[#8B95A5] border-[#1C2025]',
        relativeExit: 32
      };
    } else if (lap >= 23 && lap <= 24) {
      const timeLoss = 0.55 + (lap - 23) * 0.65;
      return {
        gain: `-${timeLoss.toFixed(3)}s`,
        gainColor: 'text-[#FF1801]',
        position: 'P4 (Dropped 1 position)',
        window: 'Heavy Traffic (HAM Undercut)',
        desc: `Overcut Failure. Extending to Lap ${lap} allows Hamilton to execute a crushing undercut. Sainz drops behind Hamilton upon exiting the pit lane, suffering severe thermal degradation.`,
        gapToHam: '-1.4s',
        status: 'Undercut Conceded',
        statusBg: 'bg-[#FF1801]/10 text-[#FF1801] border-[#FF1801]/30',
        relativeExit: 18
      };
    } else {
      const timeLoss = 1.85 + (lap - 25) * 0.40;
      return {
        gain: `-${timeLoss.toFixed(3)}s`,
        gainColor: 'text-[#FF1801]',
        position: 'P5 (Dropped 2 positions)',
        window: 'Blocked / Worn Compounds',
        desc: `Severe Pace Decay. Pitting on Lap ${lap} causes the Medium compound tire degradation slope to steepen rapidly. Sainz loses over 0.8s per lap before his pit stop, falling behind Russell.`,
        gapToHam: '-3.2s',
        status: 'Pace Failure',
        statusBg: 'bg-[#FF1801]/20 text-[#FF1801] border-[#FF1801]/40',
        relativeExit: 5
      };
    }
  };

  const sim = getSimResults(pitLap);

  // Scorecards details data
  const scoreCardDetails = {
    strat: {
      formula: 'S_{strat} = 0.4 \\cdot CAR + 0.4 \\cdot SPG + 0.2 \\cdot TSE',
      title: 'Strategy Score',
      desc: 'Evaluates pit stop timing efficiency, clean-air ratio duration (gaps > 1.5s), and tire stint compound duration matching optimal degradation limits.',
      drivers: [
        { name: 'Max Verstappen', team: 'Red Bull Racing', score: 74.1, color: '#00E5FF' },
        { name: 'Carlos Sainz', team: 'Ferrari', score: 67.3, color: '#FF1801' },
        { name: 'Oscar Piastri', team: 'McLaren', score: 58.2, color: '#FFD600' }
      ]
    },
    tire: {
      formula: 'L_{corr}(t) = \\alpha + \\beta_{driver} \\cdot t \\implies StintScore = 100 \\times (1 - ReLU(\\frac{\\beta_{driver} - \\beta_{grid}}{\\beta_{grid}}))',
      title: 'Tire Management',
      desc: 'Fits fuel-corrected clean lap paces via linear regression against tire age, tracking degradation slope coefficients directly against the grid median.',
      drivers: [
        { name: 'Carlos Sainz', team: 'Ferrari', score: 98.7, color: '#FF1801' },
        { name: 'Oscar Piastri', team: 'McLaren', score: 97.9, color: '#FFD600' },
        { name: 'Max Verstappen', team: 'Red Bull Racing', score: 95.0, color: '#00E5FF' }
      ]
    },
    pace: {
      formula: 'S_{pace} = 50 \\cdot Consistency + 50 \\cdot SpeedMargin',
      title: 'Pace Consistency & Delta',
      desc: 'Evaluates absolute lap time standard deviation alongside gaps to the local theoretical performance limit (optimal lap benchmark of teammate or direct rival).',
      drivers: [
        { name: 'Max Verstappen', team: 'Red Bull Racing', score: 67.1, color: '#00E5FF' },
        { name: 'Carlos Sainz', team: 'Ferrari', score: 61.6, color: '#FF1801' },
        { name: 'Oscar Piastri', team: 'McLaren', score: 55.8, color: '#FFD600' }
      ]
    },
    pit: {
      formula: 'S_{pit} = 100 \\times \\frac{1}{|P_{stops}|} \\sum (0.5 \\cdot SF(p) + 0.5 \\cdot LF(p))',
      title: 'Pit Stop Efficiency',
      desc: 'Separates driver pit entry and exit speeds (Lane Factor) from the mechanical tire change duration (Stationary Factor) to reward optimal pit transit control.',
      drivers: [
        { name: 'Oscar Piastri', team: 'McLaren', score: 90.4, color: '#FFD600' },
        { name: 'Carlos Sainz', team: 'Ferrari', score: 87.7, color: '#FF1801' },
        { name: 'Max Verstappen', team: 'Red Bull Racing', score: 66.7, color: '#00E5FF' }
      ]
    },
    exec: {
      formula: 'S_{exec} = 80 - 15 \\cdot Penalties - 5 \\cdot Warnings - 5 \\cdot Lockups + PPF',
      title: 'Race Execution & Errors',
      desc: 'Penalizes on-track driver errors, warnings, lockups, and steward decisions, while rewarding progression indices and pole retention factors.',
      drivers: [
        { name: 'Oscar Piastri', team: 'McLaren', score: 100.0, color: '#FFD600' },
        { name: 'Carlos Sainz', team: 'Ferrari', score: 98.0, color: '#FF1801' },
        { name: 'Max Verstappen', team: 'Red Bull Racing', score: 55.0, color: '#00E5FF' }
      ]
    }
  };

  return (
    <div className="w-full bg-[#090A0C] text-[#8B95A5] flex flex-col gap-32 pb-24 selection:bg-[#00E5FF]/20 selection:text-[#00E5FF] overflow-hidden max-w-[1440px] mx-auto px-4 md:px-8">
      
      {/* 1. HERO SECTION (12-COLUMNS, COMPACT SCREEN FITTING VIEWPORT) */}
      <section className="relative w-full min-h-[calc(100vh-136px)] flex items-center py-8 border-b border-[#1C2025]/60">
        
        {/* Subtle Tech Grids Backdrop (Linear/Stripe style) */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#16191e_1.5px,transparent_1.5px),linear-gradient(to_bottom,#16191e_1.5px,transparent_1.5px)] bg-[size:5rem_5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_60%,transparent_100%)] opacity-[0.14] pointer-events-none"></div>
        <div className="absolute top-0 right-1/12 w-[600px] h-[600px] rounded-full bg-[#FF1801]/[0.025] filter blur-[130px] pointer-events-none"></div>
        <div className="absolute bottom-10 left-1/12 w-[600px] h-[500px] rounded-full bg-[#00E5FF]/[0.02] filter blur-[150px] pointer-events-none"></div>

        {/* 12-Column Asymmetric Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full relative z-10">
          
          {/* Left Column (7-Columns) - Porsche-style scale with F1 Red Accent */}
          <div className="lg:col-span-7 flex flex-col gap-6 text-left">
            
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#FF1801]/30 bg-[#FF1801]/5 rounded text-[10px] font-mono font-bold tracking-widest text-[#FF1801] uppercase w-fit">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF1801] animate-pulse"></span>
              Formula 1 Tactical Operations Center
            </div>
            
            {/* Bold Asymmetric Heading Scale */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-mono text-[#4E5E70] uppercase tracking-[0.2em] font-semibold">Real-Time Intelligence Node</span>
              <h1 className="text-4xl sm:text-7xl font-bold tracking-tight text-[#F3F5F7] leading-[0.98] font-sans">
                THE MARGIN OF <br />
                VICTORY IS <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F3F5F7] via-[#FF1801] to-[#00E5FF]">
                  DETERMINISTIC.
                </span>
              </h1>
            </div>
            
            {/* Constraint Text Width to Avoid Full-Width Stretching */}
            <p className="text-sm md:text-base text-[#8B95A5] leading-relaxed max-w-[540px]">
              Aggregating sub-second telemetry parameters, dynamic tire degradation models, and reactive grid traffic algorithms to reconstruct strategy simulations and driver pace scorecards in clean air.
            </p>
            
            {/* Porsche-style minimal buttons with Linear-style subtle glow */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Link
                to="/simulate"
                className="inline-flex items-center gap-2.5 px-7 py-4 border border-[#FF1801] bg-[#FF1801] hover:bg-[#FF1801]/90 rounded text-xs font-bold text-white shadow-lg shadow-[#FF1801]/10 hover:scale-[1.02] active:scale-95 transition-all duration-150 tracking-wider uppercase"
              >
                Run Simulation Sandbox
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/battle"
                className="inline-flex items-center gap-2.5 px-7 py-4 border border-[#1C2025] bg-[#16191E] hover:bg-[#16191E]/80 hover:border-[#8B95A5]/30 rounded text-xs font-semibold text-[#8B95A5] hover:text-[#F3F5F7] transition-all duration-150 tracking-wider uppercase"
              >
                Explore Ghost Battle
              </Link>
            </div>
          </div>
          
          {/* Right Column (5-Columns) - Dense Telemetry Wall Dashboard (60% F1.com flavor) */}
          <div className="lg:col-span-5 flex flex-col gap-4 w-full">
            
            {/* The Integrated Telemetry Board Console Frame */}
            <div className="precision-card bg-[#0E1013] border border-[#1C2025] rounded-lg p-5 shadow-2xl relative overflow-hidden flex flex-col gap-4">
              
              {/* Header telemetry items */}
              <div className="flex justify-between items-center border-b border-[#1C2025] pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#FF1801] animate-pulse" />
                  <span className="font-mono text-[10px] font-bold text-[#F3F5F7] uppercase tracking-wider">Telemetry Console // LIVE</span>
                </div>
                <div className="px-2 py-0.5 bg-[#1BC944]/10 border border-[#1BC944]/35 text-[#1BC944] font-mono text-[8px] rounded uppercase tracking-widest">
                  Active Sync
                </div>
              </div>

              {/* Racetrack SVG visual loop inline inside dashboard */}
              <div className="w-full h-[150px] bg-[#090A0C] border border-[#1C2025] rounded relative flex items-center justify-center p-2">
                <svg className="w-full h-full" viewBox="0 0 400 240" fill="none">
                  {/* Track line shadow */}
                  <path
                    d="M 90 190 L 290 190 C 310 190 330 180 320 160 L 300 115 C 290 95 270 90 220 100 L 140 120 C 120 125 100 110 120 90 L 170 45 C 180 35 165 25 140 25 C 110 25 90 45 100 80 L 120 125 C 130 140 110 150 90 150 C 70 150 50 165 70 185 Z"
                    stroke="#16191E"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Live track path */}
                  <path
                    d="M 90 190 L 290 190 C 310 190 330 180 320 160 L 300 115 C 290 95 270 90 220 100 L 140 120 C 120 125 100 110 120 90 L 170 45 C 180 35 165 25 140 25 C 110 25 90 45 100 80 L 120 125 C 130 140 110 150 90 150 C 70 150 50 165 70 185 Z"
                    stroke="#2C3440"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Looping Car Dot 1 (Red Bull Cyan) */}
                  <circle r="3.5" fill="#00E5FF">
                    <animateMotion
                      dur="9.8s"
                      repeatCount="indefinite"
                      path="M 90 190 L 290 190 C 310 190 330 180 320 160 L 300 115 C 290 95 270 90 220 100 L 140 120 C 120 125 100 110 120 90 L 170 45 C 180 35 165 25 140 25 C 110 25 90 45 100 80 L 120 125 C 130 140 110 150 90 150 C 70 150 50 165 70 185 Z"
                    />
                  </circle>
                  {/* Looping Car Dot 2 (Ferrari Red) */}
                  <circle r="3.5" fill="#FF1801">
                    <animateMotion
                      dur="10.2s"
                      repeatCount="indefinite"
                      path="M 90 190 L 290 190 C 310 190 330 180 320 160 L 300 115 C 290 95 270 90 220 100 L 140 120 C 120 125 100 110 120 90 L 170 45 C 180 35 165 25 140 25 C 110 25 90 45 100 80 L 120 125 C 130 140 110 150 90 150 C 70 150 50 165 70 185 Z"
                    />
                  </circle>
                </svg>
                {/* Floating telemetry label */}
                <div className="absolute top-2 left-2 bg-[#0E1013]/90 border border-[#1C2025] px-2 py-1 rounded font-mono text-[8px] text-[#8B95A5]">
                  SPIELBERG RING (AUT)
                </div>
              </div>

              {/* Monospace telemetry table rows (60% F1.com density) */}
              <div className="flex flex-col gap-2 font-mono text-[10px]">
                <div className="flex justify-between items-center p-2 bg-[#16191E]/40 border border-[#1C2025] rounded">
                  <span className="text-[#8B95A5]">SECTOR ACTIVE:</span>
                  <span className="text-[#FF1801] font-bold">{activeTelemetry.corner}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex justify-between items-center p-2 bg-[#16191E]/20 border border-[#1C2025]/60 rounded">
                    <span className="text-[#4E5E70]">SPEED:</span>
                    <span className="text-[#00E5FF] font-bold font-timing text-[11px]">{activeTelemetry.speed} KM/H</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-[#16191E]/20 border border-[#1C2025]/60 rounded">
                    <span className="text-[#4E5E70]">RPM:</span>
                    <span className="text-[#F3F5F7] font-semibold font-timing">{activeTelemetry.rpm}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex justify-between items-center p-2 bg-[#16191E]/20 border border-[#1C2025]/60 rounded">
                    <span className="text-[#4E5E70]">THROTTLE:</span>
                    <span className="text-[#1BC944] font-semibold">{activeTelemetry.throttle}%</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-[#16191E]/20 border border-[#1C2025]/60 rounded">
                    <span className="text-[#4E5E70]">BRAKE:</span>
                    <span className="text-[#FF1801] font-semibold">{activeTelemetry.brake}%</span>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* 2. TACTICAL MATRIX: ASYMMETRIC GRID SYSTEM (Linear and Stripe inspired) */}
      <section className="flex flex-col gap-10 w-full pt-8">
        
        {/* 12-Column Split: Editorial Section Header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
          <div className="lg:col-span-4 flex flex-col gap-2 text-left">
            <span className="text-[10px] font-mono text-[#FF1801] font-bold uppercase tracking-[0.2em]">Platform Capabilities</span>
            <h2 className="text-3xl font-bold tracking-tight text-[#F3F5F7] font-sans">
              Tactical Workspace Suite
            </h2>
          </div>
          <div className="lg:col-span-8 text-left">
            <p className="text-sm text-[#8B95A5] leading-relaxed max-w-[640px]">
              Discarding generic dashboard containers. FrontWing deploys specialized analytics workspaces matching telemetry traces, tire management regression modules, and multi-agent projection layers.
            </p>
          </div>
        </div>

        {/* 12-Column Card Grid: Asymmetric card composition (4-4-8 layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
          
          {/* Card A (Strategy Sandbox) - 4 Columns */}
          <div className="lg:col-span-4 precision-card bg-[#0E1013] border border-[#1C2025] hover:border-[#FF1801]/30 rounded-lg overflow-hidden flex flex-col group transition-all duration-200 shadow-xl">
            {/* Visual Header */}
            <div className="h-[140px] bg-[#090A0C] border-b border-[#1C2025] relative p-4 flex flex-col gap-2 justify-center select-none overflow-hidden font-mono text-[9px]">
              <span className="text-[#4E5E70] uppercase">Simulated Stint Allocation</span>
              <div className="w-full h-2 bg-[#16191E] rounded-full overflow-hidden flex mt-2">
                <div className="h-full bg-[#FFD600] w-[35%]"></div>
                <div className="h-full bg-[#E5E7EB] w-[65%]"></div>
              </div>
              <div className="flex justify-between items-center text-[10px] mt-1 font-timing">
                <span className="text-wet-inter font-bold">Pit Lap: 24</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-wet-inter to-cyan-drs font-bold">+1.840s gained</span>
              </div>
            </div>
            {/* Text description */}
            <div className="p-5 flex flex-col gap-2 text-left">
              <div className="p-2 w-8 h-8 rounded bg-[#FF1801]/10 text-[#FF1801] flex items-center justify-center border border-[#FF1801]/25">
                <Sliders className="h-4 w-4" />
              </div>
              <h3 className="text-base font-bold text-[#F3F5F7] mt-1">Strategy Simulator</h3>
              <p className="text-xs text-[#8B95A5] leading-relaxed">
                Reschedule pit stops on a drag-and-drop timeline to calculate re-entry points and clean air windows.
              </p>
            </div>
          </div>

          {/* Card B (Ghost Battle) - 4 Columns */}
          <div className="lg:col-span-4 precision-card bg-[#0E1013] border border-[#1C2025] hover:border-[#00E5FF]/30 rounded-lg overflow-hidden flex flex-col group transition-all duration-200 shadow-xl">
            {/* Visual Header */}
            <div className="h-[140px] bg-[#090A0C] border-b border-[#1C2025] relative p-4 flex flex-col justify-center select-none overflow-hidden font-mono text-[9px]">
              <span className="text-[#4E5E70] uppercase block mb-1">Corner Delta (Turn 3 Remus)</span>
              <svg className="w-full h-[60px]" viewBox="0 0 200 60">
                <path d="M 10 50 Q 70 10 130 40 T 190 15" stroke="#00E5FF" strokeWidth="1.5" fill="none" />
                <path d="M 10 50 Q 80 20 120 35 T 190 20" stroke="#FF1801" strokeWidth="1.5" fill="none" />
                <line x1="120" y1="5" x2="120" y2="55" stroke="#16191E" strokeWidth="1" strokeDasharray="2 2" />
              </svg>
            </div>
            {/* Text description */}
            <div className="p-5 flex flex-col gap-2 text-left">
              <div className="p-2 w-8 h-8 rounded bg-[#00E5FF]/10 text-[#00E5FF] flex items-center justify-center border border-[#00E5FF]/25">
                <Gauge className="h-4 w-4" />
              </div>
              <h3 className="text-base font-bold text-[#F3F5F7] mt-1">Ghost Battle Console</h3>
              <p className="text-xs text-[#8B95A5] leading-relaxed">
                Compare distance-aligned telemetry profiles for throttle, gear offsets, and brake lockups with turn-by-turn commentary.
              </p>
            </div>
          </div>

          {/* Card C (Race Intelligence) - 8 Columns (Double width for asymmetric emphasis) */}
          <div className="lg:col-span-8 precision-card bg-[#0E1013] border border-[#1C2025] hover:border-[#FFD600]/30 rounded-lg overflow-hidden flex flex-col lg:flex-row group transition-all duration-200 shadow-xl">
            {/* Visual side inside landscape layout */}
            <div className="lg:w-[45%] h-[180px] lg:h-auto bg-[#090A0C] border-b lg:border-b-0 lg:border-r border-[#1C2025] p-5 flex flex-col justify-center select-none font-mono text-[9px] gap-2">
              <span className="text-[#4E5E70] uppercase">Fuel-Corrected Stint regression</span>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[#8B95A5]">
                  <span>Ferrari SF-24 (Beta Coefficient)</span>
                  <span className="text-[#FF1801] font-bold">0.052s / Lap</span>
                </div>
                <div className="w-full bg-[#16191E] h-1.5 rounded overflow-hidden">
                  <div className="bg-[#FF1801] h-full" style={{ width: '52%' }}></div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[#8B95A5]">
                  <span>McLaren MCL38 (Beta Coefficient)</span>
                  <span className="text-[#FFD600] font-bold">0.048s / Lap</span>
                </div>
                <div className="w-full bg-[#16191E] h-1.5 rounded overflow-hidden">
                  <div className="bg-[#FFD600] h-full" style={{ width: '48%' }}></div>
                </div>
              </div>
            </div>
            {/* Text description side */}
            <div className="p-6 flex-1 flex flex-col justify-between text-left">
              <div className="flex flex-col gap-2">
                <div className="p-2 w-8 h-8 rounded bg-[#FFD600]/10 text-[#FFD600] flex items-center justify-center border border-[#FFD600]/25">
                  <Award className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-[#F3F5F7] mt-1">Race Intelligence</h3>
                <p className="text-xs text-[#8B95A5] leading-relaxed">
                  Evaluate driver performance scorecards derived directly from linear tire regressions, clean air ratios, and pitlane stationary factors rather than subjective scores.
                </p>
              </div>
              <div className="flex items-center gap-3 font-mono text-[10px] text-[#4E5E70] mt-4 uppercase">
                <span>Variables: 18</span>
                <span>•</span>
                <span>Deterministic calculations only</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. SIMULATION PLAYGROUND: INTERACTIVE WHAT-IF SCENARIO (12-COLUMNS) */}
      <section className="flex flex-col gap-10 w-full border-t border-[#1C2025]/60 pt-20">
        
        {/* Asymmetric Section Header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
          <div className="lg:col-span-4 flex flex-col gap-2 text-left">
            <span className="text-[10px] font-mono text-[#FF1801] font-bold uppercase tracking-[0.2em]">Strategy Sandbox</span>
            <h2 className="text-3xl font-bold tracking-tight text-[#F3F5F7] font-sans">
              Spielberg Case Study
            </h2>
          </div>
          <div className="lg:col-span-8 text-left">
            <p className="text-sm text-[#8B95A5] leading-relaxed max-w-[640px]">
              What if Carlos Sainz had stopped on Lap 20 instead of Lap 22? Test the undercut mechanism on worn medium compound tires and calculate the resulting clean air gap profile.
            </p>
          </div>
        </div>

        {/* 12-Column Split: Controls vs Projections (5-7 Layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
          
          {/* Controls Dock (Left: 5 Columns) - Stripe and Porsche inspired refinement */}
          <div className="lg:col-span-5 precision-card bg-[#0E1013] border border-[#1C2025] rounded-xl p-6 flex flex-col gap-6 text-left shadow-xl">
            
            <div className="border-b border-[#1C2025] pb-4">
              <span className="text-[10px] font-mono text-[#8B95A5] uppercase tracking-wider block mb-1">Scenario Parameters</span>
              <h3 className="text-base font-bold text-[#F3F5F7]">Carlos Sainz Strategy Window</h3>
            </div>

            {/* Pit Lap Slider Control */}
            <div className="flex flex-col gap-3 font-mono">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#8B95A5] font-bold uppercase">Simulate Pit Stop:</span>
                <span className="text-[#00E5FF] font-bold text-xs bg-[#16191E] border border-[#1C2025] px-2.5 py-1 rounded">
                  LAP {pitLap}
                </span>
              </div>
              <input
                type="range"
                min="15"
                max="30"
                value={pitLap}
                onChange={(e) => setPitLap(parseInt(e.target.value))}
                className="w-full h-1 bg-[#16191E] border border-[#1C2025] rounded-lg appearance-none cursor-pointer accent-[#FF1801]"
              />
              <div className="flex justify-between text-[8px] text-[#4E5E70] uppercase">
                <span>Lap 15 (Early stop)</span>
                <span>Lap 22 (Actual stop)</span>
                <span>Lap 30 (Overcut extreme)</span>
              </div>
            </div>

            {/* Tire compound metadata */}
            <div className="flex flex-col gap-2 font-mono text-[10px]">
              <span className="text-[#4E5E70] uppercase font-bold tracking-wider">Compound Allocation:</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2 bg-[#16191E]/30 border border-[#1C2025] rounded">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FFD600]"></span>
                  <span className="text-[#F3F5F7]">Medium (Stint 1)</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-[#16191E]/30 border border-[#1C2025] rounded">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#E5E7EB]"></span>
                  <span className="text-[#F3F5F7]">Hard (Stint 2)</span>
                </div>
              </div>
            </div>

            {/* Live AI Analysis audit box */}
            <div className="bg-[#090A0C] border border-[#1C2025] rounded p-4">
              <span className="text-[9px] font-mono text-[#FF1801] font-bold uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <Workflow className="h-3.5 w-3.5" />
                Strategy Optimization Audit
              </span>
              <p className="text-xs text-[#8B95A5] leading-relaxed">
                {sim.desc}
              </p>
            </div>

          </div>

          {/* Outcome Visualizer (Right: 7 Columns) - 60% F1.com visual density */}
          <div className="lg:col-span-7 flex flex-col gap-6 w-full text-left">
            
            {/* Key timings metrics card */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 font-mono">
              <div className="p-4 border border-[#1C2025] bg-[#0E1013] rounded flex flex-col gap-1 shadow-lg">
                <span className="text-[9px] text-[#4E5E70] uppercase">Time Margin vs Actual</span>
                <span className={`text-sm font-bold font-timing ${sim.gainColor}`}>{sim.gain}</span>
              </div>
              <div className="p-4 border border-[#1C2025] bg-[#0E1013] rounded flex flex-col gap-1 shadow-lg">
                <span className="text-[9px] text-[#4E5E70] uppercase">Projected Finish</span>
                <span className="text-sm font-bold text-[#F3F5F7] font-timing">{sim.position}</span>
              </div>
              <div className="p-4 border border-[#1C2025] bg-[#0E1013] rounded flex flex-col gap-1 shadow-lg col-span-2 sm:col-span-1">
                <span className="text-[9px] text-[#4E5E70] uppercase">Pit Lane Exit Window</span>
                <span className="text-xs font-semibold text-[#00E5FF] font-timing truncate">{sim.window}</span>
              </div>
            </div>

            {/* Dynamic visual Gantt stint bar chart */}
            <div className="precision-card bg-[#0E1013] border border-[#1C2025] rounded-xl p-5 flex flex-col gap-3 font-mono text-[9px] shadow-lg">
              <span className="text-[#4E5E70] uppercase font-bold tracking-wider">Simulated Stint Segments vs Historical:</span>
              
              {/* Simulated */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[#8B95A5]">Simulated Stint Allocation Profile (Lap {pitLap} pit)</span>
                <div className="w-full h-8 rounded bg-[#16191E] border border-[#1C2025] overflow-hidden flex font-bold text-[10px] text-[#090A0C]">
                  <div
                    className="h-full bg-[#FFD600] flex items-center justify-center border-r border-[#1C2025] transition-all duration-200 ease-out overflow-hidden"
                    style={{ width: `${(pitLap / 71) * 100}%` }}
                  >
                    {pitLap >= 18 && `Medium (L1-${pitLap})`}
                  </div>
                  <div
                    className="h-full bg-[#E5E7EB] flex items-center justify-center transition-all duration-200 ease-out overflow-hidden"
                    style={{ width: `${((71 - pitLap) / 71) * 100}%` }}
                  >
                    {71 - pitLap >= 18 && `Hard (L${pitLap + 1}-71)`}
                  </div>
                </div>
              </div>

              {/* Historical */}
              <div className="flex flex-col gap-1.5 mt-2 opacity-40">
                <span className="text-[#8B95A5]">Historical Stint Allocation Profile (Lap 22 pit)</span>
                <div className="w-full h-8 rounded bg-[#16191E] border border-[#1C2025] overflow-hidden flex font-bold text-[10px] text-[#090A0C]">
                  <div className="h-full bg-[#FFD600] flex items-center justify-center border-r border-[#1C2025] w-[31%]">
                    Medium (L1-22)
                  </div>
                  <div className="h-full bg-[#E5E7EB] flex items-center justify-center w-[69%]">
                    Hard (L23-71)
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic re-entry track timeline */}
            <div className="p-4 border border-[#1C2025] bg-[#0E1013] rounded-xl flex flex-col gap-3 font-mono text-[9px] shadow-lg">
              <span className="text-[#4E5E70] uppercase font-bold tracking-wider">Projected Pit exit Track Position Gaps:</span>
              
              <div className="relative w-full h-10 border border-[#1C2025] bg-[#090A0C] rounded overflow-hidden flex items-center">
                {/* Undercover ahead car */}
                <div className="absolute left-4 flex flex-col text-[8px] font-bold text-[#FFD600] leading-tight">
                  <span>PIA (P7)</span>
                  <span>+2.8s</span>
                </div>
                
                {/* Pitted Sainz card */}
                <motion.div
                  className="absolute h-6 px-3 border border-[#FF1801]/60 bg-[#FF1801]/10 rounded text-[#F3F5F7] font-bold flex items-center justify-center text-[9px] shadow-lg shadow-[#FF1801]/10"
                  animate={{ left: `${sim.relativeExit}%` }}
                  transition={{ type: 'spring', stiffness: 90, damping: 14 }}
                >
                  SAI (Exit)
                </motion.div>

                {/* Behind rival car */}
                <div className="absolute right-4 flex flex-col items-end text-[8px] font-bold text-[#00E5FF] leading-tight">
                  <span>HAM (P8)</span>
                  <span>{sim.gapToHam}</span>
                </div>
              </div>
              
              <div className="flex justify-between text-[8px] text-[#4E5E70] uppercase px-1">
                <span>Clean Air Window</span>
                <span>Traffic Envelope</span>
                <span>Bottleneck Zone</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 4. PERFORMANCE INDEX: DETERMINISTIC FORMULA scorecards (12-COLUMNS) */}
      <section className="flex flex-col gap-10 w-full border-t border-[#1C2025]/60 pt-20">
        
        {/* Asymmetric Header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
          <div className="lg:col-span-4 flex flex-col gap-2 text-left">
            <span className="text-[10px] font-mono text-[#FF1801] font-bold uppercase tracking-[0.2em]">Deterministic Scoring</span>
            <h2 className="text-3xl font-bold tracking-tight text-[#F3F5F7] font-sans">
              Motorsport Scorecard
            </h2>
          </div>
          <div className="lg:col-span-8 text-left">
            <p className="text-sm text-[#8B95A5] leading-relaxed max-w-[640px]">
              Each driver score represents a reproducible calculation based strictly on raw physics variables (braking indicators, standard pace consistency deviations, and tire degradation linear coefficients).
            </p>
          </div>
        </div>

        {/* 12-Column Tabular Split (4-8 Layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
          
          {/* Vertical selectors (Left: 4 Columns) */}
          <div className="lg:col-span-4 flex flex-col gap-3 font-mono">
            {[
              { id: 'strat', title: 'Strategy Efficiency' },
              { id: 'tire', title: 'Tire Conservation' },
              { id: 'pace', title: 'Pace & Consistency' },
              { id: 'pit', title: 'Pit Stop Transit' },
              { id: 'exec', title: 'Race Execution' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveScoreTab(tab.id as any)}
                className={`w-full p-4 border rounded text-xs font-bold uppercase tracking-wider text-left transition-all duration-150 flex items-center justify-between ${
                  activeScoreTab === tab.id
                    ? 'border-[#FF1801] bg-[#FF1801]/5 text-[#F3F5F7]'
                    : 'border-[#1C2025] bg-[#0E1013] text-[#8B95A5] hover:text-[#F3F5F7] hover:border-[#8B95A5]/30'
                }`}
              >
                <span>{tab.title}</span>
                <ChevronRight className={`h-4 w-4 transition-transform ${activeScoreTab === tab.id ? 'translate-x-1 text-[#FF1801]' : 'text-[#4E5E70]'}`} />
              </button>
            ))}
          </div>

          {/* Details Card (Right: 8 Columns) - F1.com scoreboards style */}
          <div className="lg:col-span-8 precision-card bg-[#0E1013] border border-[#1C2025] rounded-xl p-6 md:p-8 flex flex-col gap-6 text-left shadow-2xl relative">
            
            {/* Metric title */}
            <div className="border-b border-[#1C2025] pb-4">
              <h3 className="text-lg font-bold text-[#F3F5F7] flex items-center gap-2">
                <span className="w-1.5 h-6 bg-[#FF1801] inline-block"></span>
                {scoreCardDetails[activeScoreTab].title}
              </h3>
              <p className="text-xs text-[#8B95A5] leading-relaxed mt-2">
                {scoreCardDetails[activeScoreTab].desc}
              </p>
            </div>

            {/* Monospace Code Formula block */}
            <div className="p-4 border border-[#1C2025] bg-[#090A0C] rounded font-mono text-[11px] text-[#00E5FF] flex items-center justify-center text-center">
              <code className="select-all tracking-wider font-bold">
                {scoreCardDetails[activeScoreTab].formula}
              </code>
            </div>

            {/* Drivers Rankings board (F1.com style timing sheet) */}
            <div className="flex flex-col gap-4 font-mono text-xs">
              <span className="text-[#4E5E70] uppercase font-bold tracking-widest text-[9px]">Spielberg Timing Sheet:</span>
              
              <div className="flex flex-col gap-3">
                {scoreCardDetails[activeScoreTab].drivers.map((drv, idx) => (
                  <div key={idx} className="flex flex-col gap-2 p-2.5 border border-[#1C2025]/60 bg-[#16191E]/20 rounded">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-[#4E5E70] font-bold">P{idx + 1}</span>
                        <span className="font-bold text-[#F3F5F7]">{drv.name}</span>
                        <span className="text-[9px] text-[#8B95A5] font-sans">({drv.team})</span>
                      </div>
                      <span className="font-bold font-timing" style={{ color: drv.color }}>
                        {drv.score.toFixed(1)} / 100
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-[#090A0C] h-1 rounded overflow-hidden">
                      <motion.div
                        className="h-full rounded"
                        style={{ backgroundColor: drv.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${drv.score}%` }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      ></motion.div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 5. PIT WALL CONSOLE TERMINAL FOOTER (12-COLUMNS) */}
      <section className="relative w-full overflow-hidden border border-[#FF1801]/30 bg-gradient-to-r from-[#0E1013] via-[#0E1013] to-[#FF1801]/[0.01] p-8 md:p-10 rounded-xl shadow-2xl">
        
        {/* Glow indicators */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#FF1801]/10 to-transparent pointer-events-none rounded-tr-xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#00E5FF]/10 to-transparent pointer-events-none rounded-bl-xl"></div>

        {/* Header telemetry text labels */}
        <div className="absolute top-2 left-3 font-mono text-[8px] text-[#4E5E70] uppercase">
          Node Status: Established // Secure Connection
        </div>
        <div className="absolute bottom-2 right-3 font-mono text-[8px] text-[#4E5E70] uppercase">
          Telemetry Broker: Connected
        </div>

        {/* 12-Column Split: scrolling logs vs button (8-4 Layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full relative z-10 text-left">
          
          {/* Status scrolls (Left: 8 Columns) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <h3 className="text-xl md:text-2xl font-bold tracking-tight text-[#F3F5F7] font-sans">
              Stop guessing. Decide deterministically.
            </h3>
            <p className="text-xs text-[#8B95A5] leading-relaxed max-w-[560px]">
              Execute real-time strategy sandbox offsets and compare telemetry profiles under clean or dirty air curves immediately.
            </p>
            
            {/* Live rolling system feed logs */}
            <div className="flex flex-col gap-1.5 font-mono text-[9px] text-[#8B95A5] bg-[#090A0C] border border-[#1C2025] p-3.5 rounded max-w-[560px] opacity-90">
              <div className="flex justify-between w-full">
                <span className="text-[#FF1801] font-bold">[SYS_STATUS]</span>
                <span className="text-[#F3F5F7] animate-pulse">INGESTING FASTF1 SOURCE TIMINGS</span>
              </div>
              <div className="flex justify-between w-full">
                <span className="text-[#00E5FF] font-bold">[CACHE_SYNC]</span>
                <span className="text-[#F3F5F7]">REDIS CHANNEL SUBSCRIBED AT 10HZ</span>
              </div>
              <div className="flex justify-between w-full">
                <span className="text-[#1BC944] font-bold">[SIM_ENGINE]</span>
                <span className="text-[#F3F5F7]">DETERMINISTIC FORMULA AGENTS FITTED</span>
              </div>
            </div>
          </div>
          
          {/* Action launch (Right: 4 Columns) */}
          <div className="lg:col-span-4 flex justify-start lg:justify-end">
            <Link
              to="/simulate"
              className="inline-flex items-center gap-2.5 px-7 py-4 border border-[#FF1801] bg-[#FF1801] text-white rounded font-bold hover:bg-[#FF1801]/90 shadow-xl shadow-[#FF1801]/10 hover:scale-[1.03] active:scale-95 transition-all duration-150 text-xs tracking-wider uppercase"
            >
              Launch Console
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

        </div>
      </section>

    </div>
  );
};

export default LandingPage;
