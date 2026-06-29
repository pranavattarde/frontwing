// FrontWing shared TypeScript types
// Derived from component_library.md and project_context.md

// ============================================
// Driver & Team
// ============================================

export interface Driver {
  code: string;
  fullName: string;
  number: number;
  teamName: string;
  teamColor: string;
}

export interface DriverScores {
  composite: number;
  strategy: number;
  tire: number;
  pace: number;
  pit: number;
  execution: number;
}

export interface DriverRaceResult {
  driver: Driver;
  scores: DriverScores;
  position: number;
  gridPosition: number;
  status: 'Classified' | 'DNF' | 'DSQ' | 'DNS';
  fastestLap?: boolean;
}

export interface Team {
  name: string;
  color: string;
  drivers: [Driver, Driver];
}

export interface TeamMetrics {
  team: Team;
  constructorScore: number;
  pitCrewRank: number;
  strategyGrade: string;
  avgWearSlope: number;
}

// ============================================
// Strategy & Stints
// ============================================

export type TireCompound = 'soft' | 'medium' | 'hard' | 'inter' | 'wet';

export interface Stint {
  compound: TireCompound;
  startLap: number;
  endLap: number;
  wearSlope: number;
  isActual: boolean;
}

export interface PitStop {
  lap: number;
  duration: number; // seconds
  fromCompound: TireCompound;
  toCompound: TireCompound;
}

// ============================================
// Telemetry
// ============================================

export interface TelemetryPoint {
  distanceM: number;
  speed: number;
  throttle: number;
  brake: number;
  gear: number;
}

export interface TrackCorner {
  name: string;
  distanceM: number;
  number: number;
}

// ============================================
// Investigation Thread
// ============================================

export type MessageBlockType =
  | 'verdict'
  | 'narrative'
  | 'evidence-strategy'
  | 'evidence-telemetry'
  | 'evidence-simulation'
  | 'evidence-driver'
  | 'follow-up';

export interface InlineCalloutData {
  text: string;
  type: 'gain' | 'loss' | 'neutral';
}

export interface ThreadMessage {
  id: string;
  type: MessageBlockType;
  content: string;
  callouts?: InlineCalloutData[];
  evidenceData?: unknown;
  timestamp: number;
}

export interface Investigation {
  id: string;
  question: string;
  messages: ThreadMessage[];
  raceId: string;
  isStreaming: boolean;
  createdAt: number;
}

// ============================================
// Race & Session
// ============================================

export interface Race {
  id: string;
  name: string;
  circuit: string;
  country: string;
  date: string;
  totalLaps: number;
  weather: string;
}

export interface RacePhase {
  startLap: number;
  endLap: number;
  description: string;
  type: 'normal' | 'safety_car' | 'incident' | 'pit_window';
}

export interface RaceIncident {
  lap: number;
  description: string;
  drivers: string[];
}

// ============================================
// Simulation
// ============================================

export interface SimulationInput {
  driverCode: string;
  pitLap: number;
  compound: TireCompound;
}

export interface SimulationOutput {
  actual: { position: number; time: string };
  simulated: { position: number; time: string };
  delta: { positions: number; seconds: number };
  confidence: number;
  simType: 'v1_single' | 'v2_grid' | 'monteCarlo';
}

// ============================================
// AI Thinking
// ============================================

export type AIStage = 'parsing' | 'loading_data' | 'computing' | 'generating' | 'done';

export interface AIThinkingState {
  stage: AIStage;
  detail: string;
}

// ============================================
// Session State
// ============================================

export type SessionState = 'idle' | 'loading' | 'streaming' | 'error';

export interface BreadcrumbItem {
  label: string;
  href: string;
}

// ============================================
// Notification
// ============================================

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationData {
  id: string;
  message: string;
  type: NotificationType;
  duration: number;
  action?: { label: string; onClick: () => void };
}

// ============================================
// Insight
// ============================================

export interface Insight {
  headline: string;
  metric: { value: number; unit: string; context: string };
  confidence: 'high' | 'medium' | 'low';
  source: string;
}

// ============================================
// Ghost Battle
// ============================================

export interface CornerNarration {
  cornerIndex: number;
  cornerName: string;
  narrative: string;
  deltaMs: number;
  advantage: string; // driver code
}
