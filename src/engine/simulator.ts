import { FEATURE_KEYS, popNorms } from "./features";
import type {
  FeatureKey,
  FeatureVector,
  Level,
  Scenario,
  StrokeType,
  Trial,
} from "./types";

/** Seeded PRNG (mulberry32) — guarantees reproducible simulations. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box–Muller transform: standard normal from two uniforms. */
function gauss(rng: () => number): number {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * A simulated player has PERSONAL means offset from the population.
 * This is legitimate individual style, not an error — which is exactly why the
 * engine must build an individual baseline instead of policing population norms.
 */
export interface SimPlayer {
  means: FeatureVector;
  noise: FeatureVector;
}

export function makeSimPlayer(
  seed: number,
  stroke: StrokeType,
  level: Level,
): SimPlayer {
  const rng = mulberry32(seed);
  const norms = popNorms(stroke, level);
  const means = {} as FeatureVector;
  const noise = {} as FeatureVector;
  for (const k of FEATURE_KEYS) {
    // Personal style: up to ~1 population SD away from the population mean.
    means[k] = norms[k].mean + gauss(rng) * norms[k].sd * 0.8;
    // Trial-to-trial motor noise is smaller than between-subject spread.
    noise[k] = norms[k].sd * (0.32 + rng() * 0.16);
  }
  return { means, noise };
}

export interface SimConfig {
  seed: number;
  strokeType: StrokeType;
  level: Level;
  nTrials: number;
  scenario: Scenario;
  /** Trial index (0-based) at which the fatigue drift starts. */
  driftStart?: number;
  /** Feature affected by the fatigue drift. */
  driftFeature?: FeatureKey;
}

export function generateTrials(cfg: SimConfig): Trial[] {
  const {
    seed,
    strokeType,
    level,
    nTrials,
    scenario,
    driftStart = 25,
    driftFeature = "contactForward_cm",
  } = cfg;
  const player = makeSimPlayer(seed, strokeType, level);
  const rng = mulberry32(seed + 9973);
  const norms = popNorms(strokeType, level);
  const trials: Trial[] = [];
  const now = Date.now();

  for (let i = 0; i < nTrials; i++) {
    const features = {} as FeatureVector;
    let totalDev = 0;

    for (const k of FEATURE_KEYS) {
      let value = player.means[k] + gauss(rng) * player.noise[k];

      // (b) Fatigue drift: one feature degrades progressively — a SYSTEMATIC,
      // persistent change. This is the signal the engine should catch.
      if (scenario === "fatigue" && k === driftFeature && i >= driftStart) {
        const progress = (i - driftStart) / Math.max(1, nTrials - driftStart);
        value -= progress * 2.6 * player.noise[k] * 3;
      }

      // (c) Random outliers: isolated large deviations that do NOT persist.
      // The engine should stay silent on these (motor noise, not an error).
      if (scenario === "outliers" && rng() < 0.06) {
        value += (rng() < 0.5 ? -1 : 1) * player.noise[k] * 4.2;
      }

      features[k] = Math.round(value * 10) / 10;
      totalDev +=
        Math.abs(features[k] - player.means[k]) / Math.max(norms[k].sd, 1e-6);
    }

    // Success probability decreases with total deviation from the player's OWN
    // pattern: consistency around one's own technique predicts outcome.
    const p = Math.min(0.92, Math.max(0.08, 0.9 - 0.16 * totalDev));
    const success = rng() < p;

    trials.push({
      id: `${seed}-${i}`,
      index: i,
      strokeType,
      timestamp: now + i * 12000,
      success,
      features,
    });
  }
  return trials;
}
