import { fadedBudget, runEngine } from "@/engine/decision";
import { generateTrials } from "@/engine/simulator";
import type {
  EngineSettings,
  PlayerProfile,
  Session,
  SessionConfig,
} from "@/engine/types";
import { priorSuccessfulTrials } from "@/store/sessions";

/**
 * Builds a full session (trials + decisions) deterministically from a config.
 * The live screen only plays this back in time — the engine is not stochastic.
 */
export function buildSession(
  config: SessionConfig,
  profile: PlayerProfile,
  settings: EngineSettings,
  pastSessions: Session[],
): Session {
  const sessionNumber = pastSessions.length + 1;
  const trials = generateTrials({
    seed: config.seed,
    strokeType: config.strokeType,
    level: profile.level,
    nTrials: config.nTrials,
    scenario: config.scenario,
  });

  const baseBudget =
    config.condition === "budgeted" ? profile.budgetPreference : 0;
  // Faded feedback: the allowance shrinks as the player gains sessions.
  const budgetAllowed =
    config.condition === "budgeted" ? fadedBudget(baseBudget, sessionNumber) : 0;

  const prior = priorSuccessfulTrials(
    pastSessions,
    config.strokeType,
    settings.baselineWindow,
  );

  const { decisions } = runEngine({
    trials,
    strokeType: config.strokeType,
    level: profile.level,
    settings,
    condition: config.condition,
    budgetAllowed,
    priorSuccessful: prior,
    isFirstSession: pastSessions.length === 0,
  });

  return {
    id: `s${sessionNumber}-${config.seed}-${Date.now()}`,
    createdAt: Date.now(),
    label: `Session ${sessionNumber} · ${config.strokeType}`,
    config,
    level: profile.level,
    trials,
    decisions,
    budgetAllowed,
    sessionNumber,
  };
}
