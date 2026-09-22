import { buildBaseline, cv, sd } from "./baseline";
import { FEATURE_KEYS, featureDef } from "./features";
import type {
  Decision,
  DecisionOutcome,
  EngineSettings,
  FeatureKey,
  Session,
} from "./types";

export interface Observation {
  key: FeatureKey;
  label: string;
  direction: "above" | "below";
  trialsFlagged: number;
  meanZ: number;
  /** ONE learning objective. */
  objective: string;
  /** ONE concrete drill. */
  drill: string;
}

export interface SessionReport {
  trials: number;
  successRate: number;
  delivered: number;
  suppressed: number;
  breakdown: Record<DecisionOutcome, number>;
  observations: Observation[];
  variability: { key: FeatureKey; label: string; sd: number; cv: number; unit: string }[];
  silenceRate: number;
}

/**
 * Rule-based templates: each feature × direction maps to one learning objective
 * and one drill. Deliberately limited to ONE recommendation per observation —
 * more than three take-aways after practice exceeds working-memory capacity.
 */
const TEMPLATES: Record<FeatureKey, Record<"above" | "below", [string, string]>> = {
  racketHeadSpeed_kmh: {
    above: [
      "Regulate swing intensity to keep control at contact.",
      "10 cross-court rallies at 70% intensity, counting consecutive balls in.",
    ],
    below: [
      "Restore racket head acceleration through the contact zone.",
      "3 × 10 shadow swings with a resistance band, focusing on a loose grip and fast finish.",
    ],
  },
  contactHeight_cm: {
    above: [
      "Adjust to the bounce instead of reaching up for the ball.",
      "Drop-feed drill: take 20 balls at hip height after an explicit split-step.",
    ],
    below: [
      "Meet the ball at the top of the bounce.",
      "Feeder plays higher balls; player calls 'now' at the peak for 20 repetitions.",
    ],
  },
  contactForward_cm: {
    above: [
      "Stabilise the contact window in front of the front foot.",
      "Target drill: cone 40 cm ahead of the front foot, strike beside the cone for 20 balls.",
    ],
    below: [
      "Recover an early contact point ahead of the body.",
      "Two-bounce approach drill: move forward and strike before the ball drops, 3 × 10 balls.",
    ],
  },
  elbowAngleAtContact_deg: {
    above: [
      "Keep a slight elbow flexion to preserve the kinetic chain.",
      "Close-body feeds: 20 balls struck within one arm's length of the hip.",
    ],
    below: [
      "Extend the arm through the hitting zone.",
      "Extension drill: finish each of 20 strokes with the racket pointed at the target.",
    ],
  },
  shoulderHipSeparation_deg: {
    above: [
      "Control trunk rotation so the coil stays repeatable.",
      "Medicine-ball throws (2 kg) with a controlled unit turn, 3 × 8.",
    ],
    below: [
      "Rebuild the shoulder–hip separation that stores elastic energy.",
      "Unit-turn drill with a racket across the shoulders, 3 × 10 turns then 10 live balls.",
    ],
  },
  stanceWidth_cm: {
    above: [
      "Narrow the base so the legs can drive upward.",
      "Ladder footwork into 10 open-stance forehands with a marked base width.",
    ],
    below: [
      "Widen the base of support for a stable platform.",
      "Split-step + wide-base shadow drill, 3 × 30 s, then 10 live balls.",
    ],
  },
};

export function generateReport(
  session: Session,
  settings: EngineSettings,
): SessionReport {
  const { trials, decisions } = session;
  const breakdown = {
    DELIVERED: 0,
    SUPPRESSED_CALIBRATION: 0,
    SUPPRESSED_NOT_PERSISTENT: 0,
    SUPPRESSED_BUDGET: 0,
    SUPPRESSED_MIN_GAP: 0,
    SILENT_NO_DEVIATION: 0,
  } as Record<DecisionOutcome, number>;
  for (const d of decisions) breakdown[d.outcome]++;

  // Rank persistent deviations by how often they were flagged.
  const tally = new Map<string, { key: FeatureKey; sign: 1 | -1; count: number; zs: number[] }>();
  for (const d of decisions) {
    for (const f of d.flagged) {
      const id = `${f.key}:${f.sign}`;
      const prev = tally.get(id) ?? { key: f.key, sign: f.sign, count: 0, zs: [] };
      prev.count++;
      prev.zs.push(f.z);
      tally.set(id, prev);
    }
  }
  const observations: Observation[] = [...tally.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((t) => {
      const direction = t.sign > 0 ? "above" : "below";
      const [objective, drill] = TEMPLATES[t.key][direction];
      return {
        key: t.key,
        label: featureDef(t.key).label,
        direction: direction as "above" | "below",
        trialsFlagged: t.count,
        meanZ: t.zs.reduce((a, b) => a + b, 0) / t.zs.length,
        objective,
        drill,
      };
    });

  const variability = FEATURE_KEYS.map((k) => {
    const values = trials.map((t) => t.features[k]);
    const def = featureDef(k);
    return { key: k, label: def.label, unit: def.unit, sd: sd(values), cv: cv(values) };
  });

  const successes = trials.filter((t) => t.success).length;

  return {
    trials: trials.length,
    successRate: trials.length ? (successes / trials.length) * 100 : 0,
    delivered: breakdown.DELIVERED,
    suppressed: decisions.length - breakdown.DELIVERED,
    breakdown,
    observations,
    variability,
    silenceRate: decisions.length
      ? ((decisions.length - breakdown.DELIVERED) / decisions.length) * 100
      : 100,
  };
}

/** Per-feature series with the baseline band used by the report charts. */
export function featureSeries(
  session: Session,
  key: FeatureKey,
  settings: EngineSettings,
) {
  const successBefore = session.trials.filter((t) => t.success);
  const baseline = buildBaseline(successBefore, session.config.strokeType, session.level, settings);
  const b = baseline.features[key];
  const tau = session.decisions.length
    ? session.decisions[session.decisions.length - 1]!.tau
    : settings.tauMax;
  return {
    band: { center: b.center, low: b.center - tau * b.scale, high: b.center + tau * b.scale },
    data: session.trials.map((t, i) => ({
      trial: i + 1,
      value: t.features[key],
      center: b.center,
      low: b.center - tau * b.scale,
      high: b.center + tau * b.scale,
      pulse: session.decisions[i]?.outcome === "DELIVERED" ? t.features[key] : null,
    })),
  };
}

export function decisionsToCsv(sessions: Session[]): string {
  const head = [
    "session_id",
    "session_label",
    "condition",
    "scenario",
    "stroke",
    "seed",
    "trial_index",
    "success",
    ...FEATURE_KEYS,
    "outcome",
    "tau",
    "w",
    "n_baseline",
    "meaningful_feature",
    "meaningful_z",
    "reason",
  ];
  const rows: string[] = [head.join(",")];
  for (const s of sessions) {
    s.trials.forEach((t, i) => {
      const d = s.decisions[i];
      rows.push(
        [
          s.id,
          JSON.stringify(s.label),
          s.config.condition,
          s.config.scenario,
          s.config.strokeType,
          s.config.seed,
          t.index,
          t.success ? 1 : 0,
          ...FEATURE_KEYS.map((k) => t.features[k]),
          d?.outcome ?? "",
          d ? d.tau.toFixed(3) : "",
          d ? d.w.toFixed(3) : "",
          d?.n ?? "",
          d?.meaningful?.key ?? "",
          d?.meaningful ? d.meaningful.z.toFixed(3) : "",
          JSON.stringify(d?.reason ?? ""),
        ].join(","),
      );
    });
  }
  return rows.join("\n");
}
