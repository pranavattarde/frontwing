// ============================================
// Real 2024 Austrian Grand Prix Data
// Source: project_context.md §9
// ============================================

import type {
  Race,
  Driver,
  DriverRaceResult,
  Stint,
  PitStop,
  RacePhase,
  RaceIncident,
  Insight,
  TeamMetrics,
  ThreadMessage,
  TelemetryPoint,
  TrackCorner,
  CornerNarration,
  SimulationOutput,
} from './types';

// ============================================
// Race Metadata
// ============================================

export const AUSTRIAN_GP: Race = {
  id: 'aut-2024',
  name: '2024 Austrian Grand Prix',
  circuit: 'Red Bull Ring, Spielberg',
  country: 'Austria',
  date: '2024-06-30',
  totalLaps: 71,
  weather: 'Dry, 28°C air, 48°C track',
};

// ============================================
// Drivers
// ============================================

export const DRIVERS: Record<string, Driver> = {
  VER: { code: 'VER', fullName: 'Max Verstappen', number: 1, teamName: 'Red Bull Racing', teamColor: '#3671C6' },
  PIA: { code: 'PIA', fullName: 'Oscar Piastri', number: 81, teamName: 'McLaren', teamColor: '#FF8000' },
  SAI: { code: 'SAI', fullName: 'Carlos Sainz', number: 55, teamName: 'Scuderia Ferrari', teamColor: '#E80020' },
  NOR: { code: 'NOR', fullName: 'Lando Norris', number: 4, teamName: 'McLaren', teamColor: '#FF8000' },
  HAM: { code: 'HAM', fullName: 'Lewis Hamilton', number: 44, teamName: 'Mercedes', teamColor: '#27F4D2' },
  RUS: { code: 'RUS', fullName: 'George Russell', number: 63, teamName: 'Mercedes', teamColor: '#27F4D2' },
  LEC: { code: 'LEC', fullName: 'Charles Leclerc', number: 16, teamName: 'Scuderia Ferrari', teamColor: '#E80020' },
  PER: { code: 'PER', fullName: 'Sergio Perez', number: 11, teamName: 'Red Bull Racing', teamColor: '#3671C6' },
};

// ============================================
// Race Results — top 8
// ============================================

export const RACE_RESULTS: DriverRaceResult[] = [
  {
    driver: DRIVERS.RUS,
    scores: { composite: 85.50, strategy: 88, tire: 82, pace: 86, pit: 90, execution: 82 },
    position: 1, gridPosition: 3, status: 'Classified',
  },
  {
    driver: DRIVERS.PIA,
    scores: { composite: 88.70, strategy: 90, tire: 91, pace: 89, pit: 85, execution: 88 },
    position: 2, gridPosition: 5, status: 'Classified',
  },
  {
    driver: DRIVERS.SAI,
    scores: { composite: 82.65, strategy: 72, tire: 78, pace: 84, pit: 88, execution: 91 },
    position: 3, gridPosition: 4, status: 'Classified',
  },
  {
    driver: DRIVERS.HAM,
    scores: { composite: 80.10, strategy: 82, tire: 76, pace: 78, pit: 86, execution: 79 },
    position: 4, gridPosition: 6, status: 'Classified',
  },
  {
    driver: DRIVERS.VER,
    scores: { composite: 74.80, strategy: 68, tire: 72, pace: 92, pit: 80, execution: 62 },
    position: 5, gridPosition: 1, status: 'Classified',
  },
  {
    driver: DRIVERS.NOR,
    scores: { composite: 71.90, strategy: 78, tire: 80, pace: 90, pit: 82, execution: 30 },
    position: 6, gridPosition: 2, status: 'Classified',
  },
  {
    driver: DRIVERS.LEC,
    scores: { composite: 76.40, strategy: 74, tire: 80, pace: 82, pit: 76, execution: 70 },
    position: 7, gridPosition: 7, status: 'Classified',
  },
  {
    driver: DRIVERS.PER,
    scores: { composite: 58.20, strategy: 52, tire: 60, pace: 64, pit: 70, execution: 45 },
    position: 8, gridPosition: 9, status: 'Classified',
  },
];

// ============================================
// Tire Strategies
// ============================================

export const STRATEGIES: Record<string, Stint[]> = {
  VER: [
    { compound: 'medium', startLap: 1, endLap: 23, wearSlope: 0.058, isActual: true },
    { compound: 'hard', startLap: 24, endLap: 51, wearSlope: 0.045, isActual: true },
    { compound: 'medium', startLap: 52, endLap: 71, wearSlope: 0.072, isActual: true },
  ],
  SAI: [
    { compound: 'medium', startLap: 1, endLap: 22, wearSlope: 0.078, isActual: true },
    { compound: 'hard', startLap: 23, endLap: 47, wearSlope: 0.052, isActual: true },
    { compound: 'medium', startLap: 48, endLap: 71, wearSlope: 0.068, isActual: true },
  ],
  PIA: [
    { compound: 'medium', startLap: 1, endLap: 25, wearSlope: 0.048, isActual: true },
    { compound: 'hard', startLap: 26, endLap: 50, wearSlope: 0.042, isActual: true },
    { compound: 'medium', startLap: 51, endLap: 71, wearSlope: 0.055, isActual: true },
  ],
  NOR: [
    { compound: 'medium', startLap: 1, endLap: 24, wearSlope: 0.052, isActual: true },
    { compound: 'hard', startLap: 25, endLap: 49, wearSlope: 0.044, isActual: true },
    { compound: 'medium', startLap: 50, endLap: 71, wearSlope: 0.060, isActual: true },
  ],
  RUS: [
    { compound: 'medium', startLap: 1, endLap: 22, wearSlope: 0.054, isActual: true },
    { compound: 'hard', startLap: 23, endLap: 48, wearSlope: 0.046, isActual: true },
    { compound: 'medium', startLap: 49, endLap: 71, wearSlope: 0.058, isActual: true },
  ],
  HAM: [
    { compound: 'medium', startLap: 1, endLap: 23, wearSlope: 0.060, isActual: true },
    { compound: 'hard', startLap: 24, endLap: 50, wearSlope: 0.048, isActual: true },
    { compound: 'medium', startLap: 51, endLap: 71, wearSlope: 0.062, isActual: true },
  ],
};

// ============================================
// Simulated Alternative: Sainz pit Lap 20
// ============================================

export const SAI_ALTERNATIVE_STINTS: Stint[] = [
  { compound: 'medium', startLap: 1, endLap: 20, wearSlope: 0.078, isActual: false },
  { compound: 'hard', startLap: 21, endLap: 48, wearSlope: 0.049, isActual: false },
  { compound: 'medium', startLap: 49, endLap: 71, wearSlope: 0.064, isActual: false },
];

export const SAI_SIMULATION: SimulationOutput = {
  actual: { position: 3, time: '1:26:42.880' },
  simulated: { position: 2, time: '1:26:41.480' },
  delta: { positions: 1, seconds: 1.400 },
  confidence: 87,
  simType: 'v1_single',
};

// ============================================
// Pit Stops
// ============================================

export const PIT_STOPS: Record<string, PitStop[]> = {
  VER: [
    { lap: 23, duration: 2.4, fromCompound: 'medium', toCompound: 'hard' },
    { lap: 51, duration: 2.5, fromCompound: 'hard', toCompound: 'medium' },
  ],
  SAI: [
    { lap: 22, duration: 2.3, fromCompound: 'medium', toCompound: 'hard' },
    { lap: 47, duration: 2.4, fromCompound: 'hard', toCompound: 'medium' },
  ],
  PIA: [
    { lap: 25, duration: 2.2, fromCompound: 'medium', toCompound: 'hard' },
    { lap: 50, duration: 2.3, fromCompound: 'hard', toCompound: 'medium' },
  ],
};

// ============================================
// Race Phases & Incidents
// ============================================

export const RACE_PHASES: RacePhase[] = [
  { startLap: 1, endLap: 22, description: 'Verstappen leads, field settles', type: 'normal' },
  { startLap: 22, endLap: 30, description: 'First pit window: strategy divergence', type: 'pit_window' },
  { startLap: 30, endLap: 51, description: 'Hard compound stint: Piastri charges', type: 'normal' },
  { startLap: 51, endLap: 63, description: 'Final stint: Norris closes on Verstappen', type: 'normal' },
  { startLap: 64, endLap: 64, description: 'Verstappen–Norris collision', type: 'incident' },
  { startLap: 64, endLap: 71, description: 'Russell inherits lead, Piastri P2', type: 'normal' },
];

export const RACE_INCIDENTS: RaceIncident[] = [
  {
    lap: 64,
    description: 'Verstappen and Norris make contact fighting for the lead. Both drivers sustain damage. Norris retires with puncture, Verstappen drops to P5.',
    drivers: ['VER', 'NOR'],
  },
];

// ============================================
// Key Insights
// ============================================

export const KEY_INSIGHTS: Insight[] = [
  {
    headline: 'Sainz tire wear was 23% above grid median in stint 1',
    metric: { value: 0.078, unit: 's/lap', context: 'Degradation slope vs. 0.052 median' },
    confidence: 'high',
    source: 'FastF1 telemetry, Laps 1-22',
  },
  {
    headline: 'Piastri ran the lowest degradation of any driver',
    metric: { value: 0.042, unit: 's/lap', context: 'Hard compound stint 2' },
    confidence: 'high',
    source: 'FastF1 telemetry, Laps 26-50',
  },
  {
    headline: 'Verstappen lost 3 positions due to collision damage',
    metric: { value: 3, unit: 'positions', context: 'From P2 to P5 after Lap 64 contact' },
    confidence: 'high',
    source: 'Race classification, FIA stewards report',
  },
  {
    headline: 'Russell benefited from +12.4s gap to incident',
    metric: { value: 12.4, unit: 's', context: 'Gap to VER at time of collision' },
    confidence: 'high',
    source: 'Timing data, Lap 64',
  },
  {
    headline: 'Earlier pit for Sainz could have gained P2',
    metric: { value: 1.400, unit: 's', context: 'Simulated gain from pit on Lap 20 vs actual Lap 22' },
    confidence: 'medium',
    source: 'V1 Strategy Simulation Engine',
  },
];

// ============================================
// Team Metrics
// ============================================

export const TEAM_METRICS: TeamMetrics[] = [
  {
    team: { name: 'McLaren', color: '#FF8000', drivers: [DRIVERS.NOR, DRIVERS.PIA] },
    constructorScore: 80.3, pitCrewRank: 2, strategyGrade: 'A-', avgWearSlope: 0.051,
  },
  {
    team: { name: 'Red Bull Racing', color: '#3671C6', drivers: [DRIVERS.VER, DRIVERS.PER] },
    constructorScore: 66.5, pitCrewRank: 4, strategyGrade: 'B', avgWearSlope: 0.058,
  },
  {
    team: { name: 'Mercedes', color: '#27F4D2', drivers: [DRIVERS.HAM, DRIVERS.RUS] },
    constructorScore: 82.8, pitCrewRank: 3, strategyGrade: 'A', avgWearSlope: 0.052,
  },
  {
    team: { name: 'Scuderia Ferrari', color: '#E80020', drivers: [DRIVERS.SAI, DRIVERS.LEC] },
    constructorScore: 79.5, pitCrewRank: 1, strategyGrade: 'B+', avgWearSlope: 0.065,
  },
];

// ============================================
// Demo Investigation Thread: "Could Sainz have finished P2?"
// ============================================

export const DEMO_INVESTIGATION: ThreadMessage[] = [
  {
    id: 'msg-1',
    type: 'verdict',
    content: 'Yes. If Sainz had pitted on Lap 20 instead of Lap 22, he would have likely finished P2, gaining approximately 1.4 seconds over the actual strategy.',
    timestamp: Date.now() - 60000,
  },
  {
    id: 'msg-2',
    type: 'narrative',
    content: 'Sainz\'s first stint on mediums showed a degradation slope of 0.078 s/lap — significantly higher than the grid median of 0.052 s/lap. By Lap 20, his pace had dropped below the hard compound crossover point. Ferrari chose to extend the stint by two additional laps, losing time in the traffic window and entering dirty air behind Verstappen\'s pit exit.\n\nThe key issue wasn\'t the compound choice — medium-hard-medium was correct. It was the timing. Two laps of extended medium running at high degradation cost Sainz approximately 0.7s per lap, compounded by an additional 0.7s lost in the pit exit traffic gap.',
    callouts: [
      { text: 'Lap 20: 0.078 s/lap wear', type: 'loss' },
      { text: 'Grid median: 0.052 s/lap', type: 'neutral' },
      { text: '+1.400s total loss', type: 'loss' },
    ],
    timestamp: Date.now() - 55000,
  },
  {
    id: 'msg-3',
    type: 'evidence-strategy',
    content: 'Strategy comparison: Actual vs. simulated pit on Lap 20',
    evidenceData: {
      actual: STRATEGIES.SAI,
      simulated: SAI_ALTERNATIVE_STINTS,
      driverCode: 'SAI',
      totalLaps: 71,
    },
    timestamp: Date.now() - 50000,
  },
  {
    id: 'msg-4',
    type: 'evidence-simulation',
    content: 'Simulation result: Pit Lap 20 vs actual Lap 22',
    evidenceData: SAI_SIMULATION,
    timestamp: Date.now() - 45000,
  },
  {
    id: 'msg-5',
    type: 'follow-up',
    content: '',
    evidenceData: [
      'How did Piastri manage lower tire degradation?',
      'Show me the pit exit traffic window for Sainz',
      'Compare Sainz and Verstappen Lap 22 telemetry',
      'What would a soft-medium-hard strategy have looked like?',
    ],
    timestamp: Date.now() - 40000,
  },
];

// ============================================
// Suggested Questions for Briefing Room
// ============================================

export const SUGGESTED_QUESTIONS: string[] = [
  'Could Sainz have finished P2 with an earlier pit stop?',
  'Why did Verstappen and Norris collide on Lap 64?',
  'How did Piastri achieve the lowest tire degradation?',
  'Was Russell\'s win a result of skill or circumstance?',
  'Compare Verstappen and Norris corner-by-corner on Lap 42',
];

// ============================================
// Featured Race Stories for Briefing Room
// ============================================

export const FEATURED_STORIES = [
  {
    id: 'story-1',
    title: 'The Collision That Changed Everything',
    summary: 'On Lap 64, the fight for victory between Verstappen and Norris ended in contact. What was a battle of contrasting strategies became a battle of survival — and George Russell inherited an unlikely win from P3.',
    keyMoments: [
      { lap: 22, description: 'Sainz pits early — Ferrari commits to aggressive strategy', type: 'strategy' as const },
      { lap: 51, description: 'Norris closes to within DRS range of Verstappen', type: 'overtake' as const },
      { lap: 64, description: 'Contact between VER and NOR — both sustain damage', type: 'incident' as const },
    ],
    raceId: 'aut-2024',
  },
];

// ============================================
// Spielberg Track Corners
// ============================================

export const SPIELBERG_CORNERS: TrackCorner[] = [
  { name: 'Turn 1 (Niki Lauda)', number: 1, distanceM: 300 },
  { name: 'Turn 2', number: 2, distanceM: 500 },
  { name: 'Turn 3 (Schlossgold)', number: 3, distanceM: 1050 },
  { name: 'Turn 4 (Remus)', number: 4, distanceM: 1400 },
  { name: 'Turn 5', number: 5, distanceM: 1800 },
  { name: 'Turn 6 (Castrol Edge)', number: 6, distanceM: 2100 },
  { name: 'Turn 7 (Wurth)', number: 7, distanceM: 2600 },
  { name: 'Turn 8 (Rindt)', number: 8, distanceM: 3200 },
  { name: 'Turn 9 (A1)', number: 9, distanceM: 3700 },
  { name: 'Turn 10 (Jochen Rindt)', number: 10, distanceM: 4100 },
];

// ============================================
// Telemetry Data — PIA vs SAI Lap 42 (generated)
// Speed in km/h plotted against track distance
// ============================================

function generateTelemetry(driverProfile: 'aggressive' | 'conservative', seed: number): TelemetryPoint[] {
  const points: TelemetryPoint[] = [];
  const trackLength = 4318; // Red Bull Ring length in meters

  for (let d = 0; d <= trackLength; d += 10) {
    // Base speed profile for Spielberg
    let speed = 280;
    let throttle = 100;
    let brake = 0;
    let gear = 8;

    // Turn 1 braking zone (250-350m)
    if (d >= 250 && d < 350) {
      speed = 280 - (d - 250) * 1.8;
      brake = Math.min(100, (d - 250) * 1.0);
      throttle = 0;
      gear = Math.max(2, 8 - Math.floor((d - 250) / 20));
    }
    // Turn 1 apex (350-450m)
    else if (d >= 350 && d < 450) {
      speed = 100 + (d - 350) * 0.5;
      throttle = 30 + (d - 350) * 0.7;
      brake = 0;
      gear = 3;
    }
    // Straight to Turn 3 (450-1000m)
    else if (d >= 450 && d < 1000) {
      speed = 150 + (d - 450) * 0.24;
      throttle = 100;
      gear = Math.min(8, 3 + Math.floor((d - 450) / 100));
    }
    // Turn 3 braking (1000-1100m)
    else if (d >= 1000 && d < 1100) {
      speed = 282 - (d - 1000) * 1.5;
      brake = Math.min(100, (d - 1000) * 0.9);
      throttle = 0;
      gear = Math.max(3, 8 - Math.floor((d - 1000) / 18));
    }
    // Turn 3-4 complex (1100-1500m)
    else if (d >= 1100 && d < 1500) {
      speed = 132 + (d - 1100) * 0.15;
      throttle = 40 + (d - 1100) * 0.15;
      gear = 4;
    }
    // Straight to Turn 6 (1500-2050m)
    else if (d >= 1500 && d < 2050) {
      speed = 192 + (d - 1500) * 0.16;
      throttle = 100;
      gear = Math.min(8, 5 + Math.floor((d - 1500) / 150));
    }
    // Turn 6-7 (2050-2700m)
    else if (d >= 2050 && d < 2200) {
      speed = 280 - (d - 2050) * 0.6;
      brake = (d - 2050) * 0.4;
      throttle = 0;
      gear = 5;
    }
    else if (d >= 2200 && d < 2700) {
      speed = 190 + (d - 2200) * 0.12;
      throttle = 70 + (d - 2200) * 0.06;
      gear = 5;
    }
    // Rindt corner (3100-3300m)
    else if (d >= 3100 && d < 3300) {
      speed = 250 - (d - 3100) * 0.5;
      brake = (d - 3100) * 0.3;
      throttle = 20;
      gear = 4;
    }
    // Final sector (3300-4318m)
    else if (d >= 3300) {
      speed = 150 + (d - 3300) * 0.13;
      throttle = 100;
      gear = Math.min(8, 4 + Math.floor((d - 3300) / 200));
    }

    // Driver variation
    const variation = driverProfile === 'aggressive' ? 
      Math.sin(d * 0.01 + seed) * 3 : 
      Math.sin(d * 0.01 + seed + 1) * 2.5;

    points.push({
      distanceM: d,
      speed: Math.max(80, Math.min(330, speed + variation)),
      throttle: Math.max(0, Math.min(100, throttle)),
      brake: Math.max(0, Math.min(100, brake)),
      gear: Math.max(1, Math.min(8, gear)),
    });
  }

  return points;
}

export const TELEMETRY_PIA_LAP42 = generateTelemetry('aggressive', 42);
export const TELEMETRY_SAI_LAP42 = generateTelemetry('conservative', 55);

// ============================================
// Ghost Battle Corner Narrations
// ============================================

export const GHOST_BATTLE_NARRATIONS: CornerNarration[] = [
  {
    cornerIndex: 0,
    cornerName: 'Turn 1 (Niki Lauda)',
    narrative: 'Piastri brakes 4 meters later than Sainz into Turn 1, carrying 3 km/h more speed through the apex. The McLaren\'s mechanical grip advantage is visible in the mid-corner minimum speed.',
    deltaMs: -45,
    advantage: 'PIA',
  },
  {
    cornerIndex: 2,
    cornerName: 'Turn 3 (Schlossgold)',
    narrative: 'Sainz has marginally better traction out of Turn 3, gaining 0.012s through superior throttle application. Ferrari\'s rear stability shows here.',
    deltaMs: 12,
    advantage: 'SAI',
  },
  {
    cornerIndex: 3,
    cornerName: 'Turn 4 (Remus)',
    narrative: 'Piastri\'s line through Remus is tighter, sacrificing entry speed for a stronger exit onto the long straight. This is where the McLaren gains the most time — 0.067s in this corner alone.',
    deltaMs: -67,
    advantage: 'PIA',
  },
  {
    cornerIndex: 7,
    cornerName: 'Turn 8 (Rindt)',
    narrative: 'Both drivers are nearly identical through Rindt. Sainz carries 0.8 km/h more but uses more tire energy doing so. Over a race distance, this compounds into degradation cost.',
    deltaMs: -3,
    advantage: 'PIA',
  },
];
