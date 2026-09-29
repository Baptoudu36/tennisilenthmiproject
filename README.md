# TenniSilent application - Master 2 - HMI course

Build "TenniSilent" — a working web prototype of an intelligent tennis coaching interface that knows WHEN NOT TO SPEAK. This is an academic Human–Machine Interaction (HMI) project (Master in Sport, Health & AI). The core innovation is NOT motion detection: it is a scientifically grounded DECISION ENGINE that stays silent by default and delivers feedback only when an intervention is meaningful for motor learning.

PROJECT SENTENCE (show on the landing page):

"An intelligent tennis coaching interface that helps players improve technical skills by delivering personalized feedback only when intervention is judged meaningful for motor learning, and remaining silent otherwise."

========================

1. SCOPE & CONSTRAINTS

========================

- Phase 1 prototype: NO real camera, NO real hardware. Simulate the sensor stream (camera pose estimation + racket/footwork kinematics) with a realistic trial generator. The decision engine must be real, deterministic and fully implemented.

- Stack: React + Vite + TypeScript + Tailwind + shadcn/ui + Recharts + Zustand (with persist middleware → localStorage). No backend, no auth for now.

- Architecture: keep ALL decision logic in pure, framework-free TypeScript modules under /src/engine so it can be unit-tested and later ported:

  /src/engine/types.ts        – Trial, Feature, Baseline, Decision, Session, PlayerProfile types

  /src/engine/features.ts     – feature definitions + population reference norms

  /src/engine/simulator.ts    – seeded trial generator

  /src/engine/baseline.ts     – robust individual baseline + Bayesian shrinkage toward population prior

  /src/engine/decision.ts     – deviation scoring, persistence rule, feedback budget, timing state machine

  /src/engine/report.ts       – post-session report generation

  /src/engine/evaluation.ts   – retention/transfer protocol metrics

  /src/store/                 – Zustand stores (profile, sessions, settings)

  /src/pages/                 – one file per screen

- Use a seeded PRNG (e.g. mulberry32) so simulations are reproducible.

- UI language: English. Code comments explaining the science behind each rule.

========================

2. DATA MODEL

========================

Each TRIAL = one stroke repetition, with:

- id, index, strokeType ("forehand" | "backhand" | "serve"), timestamp

- success: boolean (ball landed in target zone)

- features (6 kinematic features, numeric):

  racketHeadSpeed_kmh, contactHeight_cm, contactForward_cm (ahead of front foot),

  elbowAngleAtContact_deg, shoulderHipSeparation_deg, stanceWidth_cm

Population reference norms (mean, sd) per strokeType × level (beginner / intermediate / advanced) defined in features.ts with plausible values.

SIMULATOR: each simulated player has personal means (offset from population, i.e. a legitimate individual style) + trial-to-trial noise. Add configurable scenarios:

  a) "stable" – noise only

  b) "fatigue drift" – from trial ~25, one feature drifts progressively (e.g. contactForward_cm decreases)

  c) "random outliers" – isolated large deviations that do NOT persist

Success probability decreases with total deviation from the player's own means.

========================

3. DECISION ENGINE (the heart of the project — implement exactly)

========================

3.1 Individual baseline (adaptation to the user)

- Built ONLY from the player's own SUCCESSFUL trials (rolling window: last 30 successful trials, persisted across sessions).

- Robust statistics per feature j: center m_j = median, scale s_j = 1.4826 × MAD.

3.2 Cold-start calibration (Bayesian shrinkage — answers "which reference before a baseline exists?")

- n = number of successful trials in the baseline, n0 = 15 (prior strength, configurable).

- w = n / (n + n0)

- center_j = w·m_j + (1−w)·μ_pop_j ;  scale_j = w·s_j + (1−w)·σ_pop_j

- Early on, the system leans on population norms; it progressively trusts the individual pattern.

3.3 Deviation scoring

- z_j = (x_j − center_j) / scale_j for each feature.

- Adaptive threshold τ(n) = τ_min + (τ_max − τ_min)·exp(−n/10), with τ_max = 3.0, τ_min = 2.0 → more tolerant when uncertain.

- A feature is "flagged" on a trial if |z_j| > τ(n).

3.4 Meaningfulness rule (not every fluctuation is an error)

- A deviation is MEANINGFUL only if the same feature is flagged in ≥3 of the last 5 trials AND with the same sign (systematic, not random noise).

3.5 Feedback budget & timing (responsiveness & agency)

- Calibration phase: first 10 trials of a player's first session = observe only, never pulse.

- Max B pulses per session (default 3, configurable 0–10) and a minimum gap of 8 trials between pulses.

- Faded feedback across sessions: B decreases by 1 every 2 sessions, floor = 1 (guidance hypothesis).

- Timing state machine per trial: READY → SWING → BREAK. A pulse is NEVER emitted during SWING; if a decision is triggered, it is queued and delivered at the start of BREAK (post-stroke, between trials).

- The pulse is CONTENT-FREE: a single haptic signal (navigator.vibrate(150) when supported) + a brief, subtle visual flash. No text during practice.

- Self-controlled feedback (agency): during BREAK after a pulse, show a small optional "Why?" button. If tapped, reveal ONE short line (e.g. "Contact point drifting behind — 3 of last 5 strokes"). The player chooses whether to see content.

3.6 Decision log (transparency & trust)

- Every trial produces a Decision record: trialIndex, flaggedFeatures with z-scores, τ(n), w, outcome ∈ {DELIVERED, SUPPRESSED_CALIBRATION, SUPPRESSED_NOT_PERSISTENT, SUPPRESSED_BUDGET, SUPPRESSED_MIN_GAP, SILENT_NO_DEVIATION}, plus a human-readable reason.

========================

4. SCREENS

========================

1) Landing: project sentence, 3-sentence explanation of "silence by default", CTA "Start".

2) Player profile / onboarding (≤ 4 questions, big controls): name, dominant hand, level, main stroke focus. Feedback budget preference with a plain-language explanation.

3) Session setup: stroke type, number of trials (default 50), simulation scenario, feedback condition ("Budgeted – TenniSilent", "Continuous – pulse on every flagged trial", "None"), seed.

4) LIVE SESSION (most important, designed for glanceable use on a phone at the court):

   - Minimal, dark, calm UI. Huge current state indicator (READY / SWING / BREAK), trial counter, remaining feedback budget as dots.

   - Controls: Start / Pause / Speed (1×, 5×, 20× for demos) / Stop.

   - Haptic pulse visualization.

   - Collapsible "Coach view" panel (hidden by default) with live z-score sparkline per feature, current τ(n), w, and the decision log. This shows the engine's reasoning to an observer.

5) Post-session report:

   - Summary: trials, success rate, pulses delivered vs. suppressed (with a breakdown by reason — this demonstrates the silence).

   - Max 3 main observations (most persistent deviations), each linked to ONE learning objective and ONE concrete drill recommendation (rule-based templates in report.ts).

   - Charts: per-feature value across trials with baseline band (center ± τ·scale), pulse markers, within-session variability (SD, CV).

6) Progress / history: across-session trend of variability (CV per feature), success rate, baseline evolution, faded budget. The desired outcome is DECREASING variability around the player's OWN pattern.

7) Evaluation lab (scientific validation):

   - Protocol builder: Acquisition (choose condition) → Retention test (same stroke, NO feedback) → Transfer test (different stroke or scenario, NO feedback).

   - Run the same simulated player under the 3 conditions with identical seeds and compare retention/transfer variability and success in a grouped bar chart.

   - Short text explaining the guidance hypothesis: continuous feedback helps during acquisition but can harm retention through dependence. TenniSilent is validated if budgeted feedback yields better no-feedback retention.

   - Export all trials + decisions as CSV.

8) Settings: n0, τ_max, τ_min, persistence window, budget, min gap, reset data. Each parameter comes with a one-line scientific justification tooltip.

========================

5. HMI DESIGN PRINCIPLES (apply everywhere)

========================

- Usability: nothing to interpret during action; the live screen must be understandable in <1 second.

- Hick's law: minimal choices per screen; Fitts' law: large touch targets (min 56px) on the live screen.

- No feedback during movement execution (never interrupt an ongoing motor program).

- Agency & trust: silence by default, explainable decisions, player-controlled content reveal.

- Safety: no flashing strobes (respect photosensitivity limits), no alarming colors for pulses, and a "pause everything" button always visible.

- Aesthetic: calm, premium sport-tech look: deep navy/near-black background, clay-orange accent, clean sans-serif, generous spacing, fully responsive (mobile-first for the live screen, desktop for report & evaluation).

========================

6. DELIVERABLE QUALITY

========================

- Everything must work end-to-end with simulated data: onboarding → session → report → history → evaluation lab.

- Seed a demo player with 2 past sessions so history and fading are visible immediately.

- Add a small "About the science" page listing the principles used: individual baseline, Bayesian shrinkage cold start, persistence rule, bandwidth/budgeted feedback, faded feedback, guidance hypothesis, self-controlled feedback, retention/transfer testing.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e23dbe48-cd17-46ef-983d-a8dcb5d53a24).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
