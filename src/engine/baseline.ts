import { FEATURE_KEYS, popNorms } from "./features";
import type {
  Baseline,
  BaselineFeature,
  EngineSettings,
  FeatureKey,
  Level,
  StrokeType,
  Trial,
} from "./types";

export function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Robust scale: 1.4826 × MAD ≈ SD for normal data, but outlier-resistant. */
export function madScale(values: number[]): number {
  if (values.length === 0) return NaN;
  const m = median(values);
  return 1.4826 * median(values.map((v) => Math.abs(v - m)));
}

export function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN;
}

export function sd(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(
    values.reduce((a, v) => a + (v - m) ** 2, 0) / (values.length - 1),
  );
}

/** Coefficient of variation (%) — scale-free variability measure. */
export function cv(values: number[]): number {
  const m = mean(values);
  if (!m) return 0;
  return (sd(values) / Math.abs(m)) * 100;
}

/**
 * Individual baseline with Bayesian shrinkage toward the population prior.
 *
 * Built ONLY from the player's own SUCCESSFUL trials: we model what "working
 * technique" looks like FOR THIS PLAYER, not a textbook ideal.
 *
 *   w = n / (n + n0)
 *   center = w·median + (1-w)·μ_pop
 *   scale  = w·(1.4826·MAD) + (1-w)·σ_pop
 *
 * With few observations the engine leans on population norms (cold start);
 * as evidence accumulates it progressively trusts the individual pattern.
 */
export function buildBaseline(
  successfulTrials: Trial[],
  stroke: StrokeType,
  level: Level,
  settings: EngineSettings,
): Baseline {
  const window = successfulTrials.slice(-settings.baselineWindow);
  const norms = popNorms(stroke, level);
  const n = window.length;
  const w = n / (n + settings.n0);
  const features = {} as Record<FeatureKey, BaselineFeature>;

  for (const k of FEATURE_KEYS) {
    const values = window.map((t) => t.features[k]);
    const mj = n > 0 ? median(values) : null;
    let sj = n > 1 ? madScale(values) : null;
    // MAD can collapse to 0 with ties; fall back to the population SD.
    if (sj !== null && (!isFinite(sj) || sj < norms[k].sd * 0.15)) {
      sj = norms[k].sd * 0.15;
    }
    features[k] = {
      center: mj === null ? norms[k].mean : w * mj + (1 - w) * norms[k].mean,
      scale: sj === null ? norms[k].sd : w * sj + (1 - w) * norms[k].sd,
      individualCenter: mj,
      individualScale: sj,
    };
  }
  return { n, w, features };
}
