import type { FeatureDef, FeatureKey, Level, Norm, StrokeType } from "./types";

/**
 * Six kinematic features that a pose-estimation + racket-IMU pipeline can
 * plausibly extract per stroke. They are the observable space of the engine.
 */
export const FEATURES: FeatureDef[] = [
  {
    key: "racketHeadSpeed_kmh",
    label: "Racket head speed",
    unit: "km/h",
    meaning: "How fast the racket head travels through contact.",
  },
  {
    key: "contactHeight_cm",
    label: "Contact height",
    unit: "cm",
    meaning: "Height of the ball–racket contact above the ground.",
  },
  {
    key: "contactForward_cm",
    label: "Contact point (forward)",
    unit: "cm",
    meaning: "How far ahead of the front foot the ball is struck.",
  },
  {
    key: "elbowAngleAtContact_deg",
    label: "Elbow angle at contact",
    unit: "°",
    meaning: "Arm extension at the moment of impact.",
  },
  {
    key: "shoulderHipSeparation_deg",
    label: "Shoulder–hip separation",
    unit: "°",
    meaning: "Trunk coiling (the X-factor) that stores elastic energy.",
  },
  {
    key: "stanceWidth_cm",
    label: "Stance width",
    unit: "cm",
    meaning: "Base of support at the moment of the stroke.",
  },
];

export const FEATURE_KEYS: FeatureKey[] = FEATURES.map((f) => f.key);

export const featureDef = (key: FeatureKey): FeatureDef =>
  FEATURES.find((f) => f.key === key)!;

/**
 * Population reference norms (mean, sd) per stroke × level.
 * Values are plausible literature-style figures for a Phase 1 prototype; they
 * act as the PRIOR used during cold start, before an individual baseline exists.
 */
type NormTable = Record<StrokeType, Record<Level, Record<FeatureKey, Norm>>>;

const n = (mean: number, sd: number): Norm => ({ mean, sd });

export const POPULATION_NORMS: NormTable = {
  forehand: {
    beginner: {
      racketHeadSpeed_kmh: n(62, 9),
      contactHeight_cm: n(88, 12),
      contactForward_cm: n(22, 12),
      elbowAngleAtContact_deg: n(139, 13),
      shoulderHipSeparation_deg: n(22, 8),
      stanceWidth_cm: n(62, 11),
    },
    intermediate: {
      racketHeadSpeed_kmh: n(79, 8),
      contactHeight_cm: n(95, 10),
      contactForward_cm: n(34, 10),
      elbowAngleAtContact_deg: n(146, 10),
      shoulderHipSeparation_deg: n(32, 7),
      stanceWidth_cm: n(74, 9),
    },
    advanced: {
      racketHeadSpeed_kmh: n(97, 7),
      contactHeight_cm: n(99, 8),
      contactForward_cm: n(45, 8),
      elbowAngleAtContact_deg: n(152, 8),
      shoulderHipSeparation_deg: n(41, 6),
      stanceWidth_cm: n(84, 8),
    },
  },
  backhand: {
    beginner: {
      racketHeadSpeed_kmh: n(56, 9),
      contactHeight_cm: n(84, 11),
      contactForward_cm: n(26, 11),
      elbowAngleAtContact_deg: n(146, 12),
      shoulderHipSeparation_deg: n(18, 7),
      stanceWidth_cm: n(64, 10),
    },
    intermediate: {
      racketHeadSpeed_kmh: n(71, 8),
      contactHeight_cm: n(91, 9),
      contactForward_cm: n(38, 9),
      elbowAngleAtContact_deg: n(154, 9),
      shoulderHipSeparation_deg: n(27, 6),
      stanceWidth_cm: n(76, 9),
    },
    advanced: {
      racketHeadSpeed_kmh: n(88, 7),
      contactHeight_cm: n(96, 8),
      contactForward_cm: n(48, 8),
      elbowAngleAtContact_deg: n(160, 7),
      shoulderHipSeparation_deg: n(35, 6),
      stanceWidth_cm: n(86, 8),
    },
  },
  serve: {
    beginner: {
      racketHeadSpeed_kmh: n(98, 14),
      contactHeight_cm: n(218, 12),
      contactForward_cm: n(18, 10),
      elbowAngleAtContact_deg: n(158, 12),
      shoulderHipSeparation_deg: n(26, 9),
      stanceWidth_cm: n(52, 10),
    },
    intermediate: {
      racketHeadSpeed_kmh: n(132, 12),
      contactHeight_cm: n(232, 10),
      contactForward_cm: n(28, 9),
      elbowAngleAtContact_deg: n(166, 9),
      shoulderHipSeparation_deg: n(36, 7),
      stanceWidth_cm: n(58, 9),
    },
    advanced: {
      racketHeadSpeed_kmh: n(168, 11),
      contactHeight_cm: n(246, 9),
      contactForward_cm: n(38, 8),
      elbowAngleAtContact_deg: n(172, 6),
      shoulderHipSeparation_deg: n(46, 6),
      stanceWidth_cm: n(62, 8),
    },
  },
};

export const popNorms = (stroke: StrokeType, level: Level) =>
  POPULATION_NORMS[stroke][level];
