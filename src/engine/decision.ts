import { buildBaseline } from "./baseline";
import { FEATURE_KEYS, featureDef } from "./features";
import type {
  Baseline,
  Decision,
  EngineSettings,
  FeatureKey,
  FeedbackCondition,
  FlaggedFeature,
  Level,
  StrokeType,
  Trial,
} from "./types";

export const DEFAULT_SETTINGS: EngineSettings = {
  n0: 15,
  tauMax: 3.0,
  tauMin: 2.0,
  persistenceK: 3,
  persistenceWindow: 5,
  budget: 3,
  minGap: 8,
  calibrationTrials: 10,
  baselineWindow: 30,
};

/**
 * Adaptive threshold: τ(n) = τ_min + (τ_max − τ_min)·exp(−n/10).
 * The system is deliberately MORE TOLERANT when its own estimate is uncertain,
 * which protects the player from false alarms during cold start.
 */
export function tauOf(n: number, s: EngineSettings): number {
  return s.tauMin + (s.tauMax - s.tauMin) * Math.exp(-n / 10);
}

/** Faded feedback (guidance hypothesis): budget drops by 1 every 2 sessions, floor 1. */
export function fadedBudget(baseBudget: number, sessionNumber: number): number {
  if (baseBudget <= 0) return 0;
  const reduction = Math.floor(Math.max(0, sessionNumber - 1) / 2);
  return Math.max(1, baseBudget - reduction);
}

export type TrialPhase = "READY" | "SWING" | "BREAK";

export interface EngineInput {
  trials: Trial[];
  strokeType: StrokeType;
  level: Level;
  settings: EngineSettings;
  condition: FeedbackCondition;
  budgetAllowed: number;
  /** Successful trials carried over from previous sessions (persisted baseline). */
  priorSuccessful: Trial[];
  /** True only for the very first session of a player (calibration phase). */
  isFirstSession: boolean;
}

export interface EngineResult {
  decisions: Decision[];
  finalBaseline: Baseline;
}

function whyLineFor(f: FlaggedFeature, k: number, window: number): string {
  const def = featureDef(f.key);
  const dir = f.sign > 0 ? "higher than" : "lower than";
  const hint: Record<FeatureKey, [string, string]> = {
    racketHeadSpeed_kmh: ["Swinging faster than your pattern", "Swing speed dropping"],
    contactHeight_cm: ["Contact point rising", "Contact point dropping"],
    contactForward_cm: ["Contact too far in front", "Contact drifting behind"],
    elbowAngleAtContact_deg: ["Arm over-extending", "Arm staying bent"],
    shoulderHipSeparation_deg: ["Over-rotating the trunk", "Losing trunk coil"],
    stanceWidth_cm: ["Stance widening", "Stance narrowing"],
  };
  const phrase = hint[f.key][f.sign > 0 ? 0 : 1];
  return `${phrase} (${def.label.toLowerCase()} ${dir} usual) — ${k} of last ${window} strokes.`;
}

/**
 * Runs the full decision engine over a session's trials, trial by trial.
 * Deterministic: same trials + same settings ⇒ same decisions.
 */
export function runEngine(input: EngineInput): EngineResult {
  const {
    trials,
    strokeType,
    level,
    settings,
    condition,
    budgetAllowed,
    priorSuccessful,
    isFirstSession,
  } = input;

  const successful = [...priorSuccessful];
  const decisions: Decision[] = [];
  /** Rolling history of flags per feature: +1 / -1 / 0 per trial. */
  const flagHistory = {} as Record<FeatureKey, number[]>;
  for (const k of FEATURE_KEYS) flagHistory[k] = [];

  let pulsesUsed = 0;
  let lastPulseIndex = -Infinity;
  let baseline = buildBaseline(successful, strokeType, level, settings);

  for (const trial of trials) {
    baseline = buildBaseline(successful, strokeType, level, settings);
    const n = baseline.n;
    const tau = tauOf(n, settings);

    const z = {} as Record<FeatureKey, number>;
    const flagged: FlaggedFeature[] = [];
    for (const k of FEATURE_KEYS) {
      const b = baseline.features[k];
      const zj = (trial.features[k] - b.center) / (b.scale || 1);
      z[k] = zj;
      const isFlagged = Math.abs(zj) > tau;
      flagHistory[k].push(isFlagged ? (zj > 0 ? 1 : -1) : 0);
      if (isFlagged) flagged.push({ key: k, z: zj, sign: zj > 0 ? 1 : -1 });
    }

    /**
     * Meaningfulness rule: a deviation counts only if the SAME feature is
     * flagged with the SAME SIGN in ≥ k of the last m trials. Isolated spikes
     * are motor noise; feedback on noise degrades learning.
     */
    let meaningful: FlaggedFeature | null = null;
    let persistCount = 0;
    for (const f of flagged) {
      const recent = flagHistory[f.key].slice(-settings.persistenceWindow);
      const count = recent.filter((v) => v === f.sign).length;
      if (count >= settings.persistenceK && Math.abs(f.z) > Math.abs(meaningful?.z ?? 0)) {
        meaningful = f;
        persistCount = count;
      }
    }

    let outcome: Decision["outcome"];
    let reason: string;
    let whyLine: string | null = null;

    const inCalibration =
      isFirstSession && trial.index < settings.calibrationTrials;

    if (condition === "none") {
      outcome = flagged.length ? "SUPPRESSED_BUDGET" : "SILENT_NO_DEVIATION";
      reason =
        condition === "none"
          ? "Control condition: no feedback is ever delivered."
          : reason!;
    } else if (inCalibration) {
      outcome = "SUPPRESSED_CALIBRATION";
      reason = `Calibration phase (trial ${trial.index + 1}/${settings.calibrationTrials}): observing only, no reference is trustworthy yet.`;
    } else if (condition === "continuous") {
      // Comparison condition for the evaluation lab: pulse on EVERY flagged trial.
      if (flagged.length) {
        outcome = "DELIVERED";
        pulsesUsed++;
        lastPulseIndex = trial.index;
        const top = flagged.reduce((a, b) => (Math.abs(b.z) > Math.abs(a.z) ? b : a));
        whyLine = whyLineFor(top, 1, 1);
        reason = `Continuous condition: ${flagged.length} feature(s) beyond τ=${tau.toFixed(2)} → pulse.`;
      } else {
        outcome = "SILENT_NO_DEVIATION";
        reason = `All features within ±${tau.toFixed(2)} of the reference.`;
      }
    } else if (!flagged.length) {
      outcome = "SILENT_NO_DEVIATION";
      reason = `All features within ±${tau.toFixed(2)} of the individual reference. Silence is the correct action.`;
    } else if (!meaningful) {
      outcome = "SUPPRESSED_NOT_PERSISTENT";
      reason = `${flagged.length} deviation(s) detected but not repeated ${settings.persistenceK}/${settings.persistenceWindow} with the same sign → treated as motor noise.`;
    } else if (pulsesUsed >= budgetAllowed) {
      outcome = "SUPPRESSED_BUDGET";
      reason = `Persistent deviation on ${featureDef(meaningful.key).label}, but the session feedback budget (${budgetAllowed}) is exhausted.`;
    } else if (trial.index - lastPulseIndex < settings.minGap) {
      outcome = "SUPPRESSED_MIN_GAP";
      reason = `Persistent deviation, but only ${trial.index - lastPulseIndex} trials since the last pulse (minimum gap ${settings.minGap}) — the player needs time to self-correct.`;
    } else {
      outcome = "DELIVERED";
      pulsesUsed++;
      lastPulseIndex = trial.index;
      whyLine = whyLineFor(meaningful, persistCount, settings.persistenceWindow);
      reason = `Persistent deviation on ${featureDef(meaningful.key).label} (z=${meaningful.z.toFixed(2)}, ${persistCount}/${settings.persistenceWindow}) → pulse queued for the next BREAK.`;
    }

    decisions.push({
      trialIndex: trial.index,
      outcome,
      tau,
      w: baseline.w,
      n,
      flagged,
      meaningful,
      reason,
      whyLine,
      z,
    });

    if (trial.success) successful.push(trial);
  }

  return {
    decisions,
    finalBaseline: buildBaseline(successful, strokeType, level, settings),
  };
}

export const OUTCOME_LABELS: Record<Decision["outcome"], string> = {
  DELIVERED: "Pulse delivered",
  SUPPRESSED_CALIBRATION: "Silent — calibration phase",
  SUPPRESSED_NOT_PERSISTENT: "Silent — deviation not persistent",
  SUPPRESSED_BUDGET: "Silent — budget exhausted",
  SUPPRESSED_MIN_GAP: "Silent — minimum gap not elapsed",
  SILENT_NO_DEVIATION: "Silent — no deviation",
};
