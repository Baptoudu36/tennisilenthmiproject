import { cv } from "./baseline";
import { runEngine } from "./decision";
import { FEATURE_KEYS } from "./features";
import { generateTrials } from "./simulator";
import type {
  EngineSettings,
  FeedbackCondition,
  Level,
  Scenario,
  Session,
  StrokeType,
  Trial,
} from "./types";

/**
 * Guidance hypothesis (Salmoni, Schmidt & Walter, 1984; Winstein & Schmidt, 1990):
 * frequent augmented feedback boosts performance DURING acquisition but creates
 * dependence, degrading performance on a later NO-FEEDBACK retention test.
 *
 * We model this explicitly:
 *   - acquisitionGain: how much variability shrinks while feedback is available
 *   - retained:        the fraction of that gain that survives feedback removal
 */
const LEARNING_MODEL: Record<
  FeedbackCondition,
  { acquisitionGain: number; retained: number }
> = {
  continuous: { acquisitionGain: 0.45, retained: 0.22 },
  budgeted: { acquisitionGain: 0.3, retained: 0.85 },
  none: { acquisitionGain: 0.06, retained: 1.0 },
};

export interface ProtocolConfig {
  seed: number;
  level: Level;
  acquisitionStroke: StrokeType;
  transferStroke: StrokeType;
  acquisitionScenario: Scenario;
  transferScenario: Scenario;
  nTrials: number;
  retentionTrials: number;
  settings: EngineSettings;
}

export interface PhaseResult {
  condition: FeedbackCondition;
  phase: "acquisition" | "retention" | "transfer";
  successRate: number;
  meanCV: number;
  pulses: number;
  session: Session;
}

function meanCV(trials: Trial[]): number {
  const values = FEATURE_KEYS.map((k) => cv(trials.map((t) => t.features[k])));
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function buildSession(
  label: string,
  stroke: StrokeType,
  scenario: Scenario,
  condition: FeedbackCondition,
  seed: number,
  nTrials: number,
  level: Level,
  settings: EngineSettings,
  noiseScale: number,
  priorSuccessful: Trial[],
): Session {
  const trials = generateTrials({
    seed,
    strokeType: stroke,
    level,
    nTrials,
    scenario,
    noiseScale,
  });
  const { decisions } = runEngine({
    trials,
    strokeType: stroke,
    level,
    settings,
    condition,
    budgetAllowed: condition === "budgeted" ? settings.budget : 0,
    priorSuccessful,
    isFirstSession: false,
  });
  return {
    id: `${label}-${condition}-${seed}`,
    createdAt: Date.now(),
    label,
    config: { strokeType: stroke, nTrials, scenario, condition, seed },
    level,
    trials,
    decisions,
    budgetAllowed: condition === "budgeted" ? settings.budget : 0,
    sessionNumber: 1,
  };
}

/**
 * Runs the same simulated player (identical seeds) under the three feedback
 * conditions through Acquisition → Retention (no feedback) → Transfer (no feedback).
 */
export function runProtocol(cfg: ProtocolConfig): PhaseResult[] {
  const results: PhaseResult[] = [];
  const conditions: FeedbackCondition[] = ["budgeted", "continuous", "none"];

  for (const condition of conditions) {
    const model = LEARNING_MODEL[condition];
    const acquisition = buildSession(
      "Acquisition",
      cfg.acquisitionStroke,
      cfg.acquisitionScenario,
      condition,
      cfg.seed,
      cfg.nTrials,
      cfg.level,
      cfg.settings,
      1,
      [],
    );

    // During acquisition the feedback is present: variability is reduced by the
    // full acquisition gain (this is PERFORMANCE, not learning).
    const acqNoise = 1 - model.acquisitionGain;
    const acquisitionScored = buildSession(
      "Acquisition",
      cfg.acquisitionStroke,
      cfg.acquisitionScenario,
      condition,
      cfg.seed,
      cfg.nTrials,
      cfg.level,
      cfg.settings,
      acqNoise,
      [],
    );

    // Retention / transfer: feedback is removed. Only the RETAINED share of the
    // gain persists — this is what separates learning from dependence.
    const retNoise = 1 - model.acquisitionGain * model.retained;

    const retention = buildSession(
      "Retention",
      cfg.acquisitionStroke,
      cfg.acquisitionScenario,
      "none",
      cfg.seed + 101,
      cfg.retentionTrials,
      cfg.level,
      cfg.settings,
      retNoise,
      acquisition.trials.filter((t) => t.success),
    );

    const transfer = buildSession(
      "Transfer",
      cfg.transferStroke,
      cfg.transferScenario,
      "none",
      cfg.seed + 202,
      cfg.retentionTrials,
      cfg.level,
      cfg.settings,
      // Transfer is harder: only part of the retained gain generalises.
      1 - model.acquisitionGain * model.retained * 0.7,
      [],
    );

    for (const [phase, session] of [
      ["acquisition", acquisitionScored],
      ["retention", retention],
      ["transfer", transfer],
    ] as const) {
      results.push({
        condition,
        phase,
        successRate:
          (session.trials.filter((t) => t.success).length / session.trials.length) * 100,
        meanCV: meanCV(session.trials),
        pulses: session.decisions.filter((d) => d.outcome === "DELIVERED").length,
        session,
      });
    }
  }
  return results;
}

export const CONDITION_LABELS: Record<FeedbackCondition, string> = {
  budgeted: "Budgeted (TenniSilent)",
  continuous: "Continuous",
  none: "No feedback",
};
