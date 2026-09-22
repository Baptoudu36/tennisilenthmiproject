/**
 * TenniSilent — core domain types.
 * Framework-free: these modules must stay portable (no React, no DOM).
 */

export type StrokeType = "forehand" | "backhand" | "serve";
export type Level = "beginner" | "intermediate" | "advanced";
export type Hand = "right" | "left";

export type FeatureKey =
  | "racketHeadSpeed_kmh"
  | "contactHeight_cm"
  | "contactForward_cm"
  | "elbowAngleAtContact_deg"
  | "shoulderHipSeparation_deg"
  | "stanceWidth_cm";

export type FeatureVector = Record<FeatureKey, number>;

export interface FeatureDef {
  key: FeatureKey;
  label: string;
  unit: string;
  /** Short plain-language meaning, used in the report and coach view. */
  meaning: string;
}

export interface Norm {
  mean: number;
  sd: number;
}

export interface Trial {
  id: string;
  index: number;
  strokeType: StrokeType;
  timestamp: number;
  success: boolean;
  features: FeatureVector;
}

/** Per-feature reference used for z-scoring on a given trial. */
export interface BaselineFeature {
  center: number;
  scale: number;
  /** Individual median (undefined before any successful trial). */
  individualCenter: number | null;
  individualScale: number | null;
}

export interface Baseline {
  /** Number of successful trials feeding the individual estimate. */
  n: number;
  /** Shrinkage weight on the individual estimate: n / (n + n0). */
  w: number;
  features: Record<FeatureKey, BaselineFeature>;
}

export type DecisionOutcome =
  | "DELIVERED"
  | "SUPPRESSED_CALIBRATION"
  | "SUPPRESSED_NOT_PERSISTENT"
  | "SUPPRESSED_BUDGET"
  | "SUPPRESSED_MIN_GAP"
  | "SILENT_NO_DEVIATION";

export interface FlaggedFeature {
  key: FeatureKey;
  z: number;
  sign: 1 | -1;
}

export interface Decision {
  trialIndex: number;
  outcome: DecisionOutcome;
  tau: number;
  w: number;
  n: number;
  flagged: FlaggedFeature[];
  /** The persistent (meaningful) deviation that triggered / would trigger a pulse. */
  meaningful: FlaggedFeature | null;
  reason: string;
  /** One-line content revealed only if the player taps "Why?". */
  whyLine: string | null;
  /** Feature z-scores for every feature on this trial (coach view sparklines). */
  z: Record<FeatureKey, number>;
}

export type FeedbackCondition = "budgeted" | "continuous" | "none";
export type Scenario = "stable" | "fatigue" | "outliers";

export interface EngineSettings {
  /** Prior strength for Bayesian shrinkage (trials). */
  n0: number;
  tauMax: number;
  tauMin: number;
  /** Persistence rule: k of last m trials, same sign. */
  persistenceK: number;
  persistenceWindow: number;
  /** Max pulses per session before fading. */
  budget: number;
  minGap: number;
  calibrationTrials: number;
  /** Rolling window of successful trials kept for the individual baseline. */
  baselineWindow: number;
}

export interface SessionConfig {
  strokeType: StrokeType;
  nTrials: number;
  scenario: Scenario;
  condition: FeedbackCondition;
  seed: number;
}

export interface Session {
  id: string;
  createdAt: number;
  label: string;
  config: SessionConfig;
  level: Level;
  trials: Trial[];
  decisions: Decision[];
  /** Budget actually allowed for this session (after fading). */
  budgetAllowed: number;
  sessionNumber: number;
}

export interface PlayerProfile {
  name: string;
  hand: Hand;
  level: Level;
  focus: StrokeType;
  budgetPreference: number;
  createdAt: number;
}
