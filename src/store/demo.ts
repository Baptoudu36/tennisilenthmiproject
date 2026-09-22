import { buildSession } from "@/lib/build-session";
import type { PlayerProfile, SessionConfig } from "@/engine/types";
import { useProfileStore } from "./profile";
import { useSessionsStore } from "./sessions";
import { useSettingsStore } from "./settings";

const DEMO_PROFILE: PlayerProfile = {
  name: "Alex (demo)",
  hand: "right",
  level: "intermediate",
  focus: "forehand",
  budgetPreference: 3,
  createdAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
};

const DEMO_SESSIONS: SessionConfig[] = [
  {
    strokeType: "forehand",
    nTrials: 50,
    scenario: "stable",
    condition: "budgeted",
    seed: 1042,
  },
  {
    strokeType: "forehand",
    nTrials: 50,
    scenario: "fatigue",
    condition: "budgeted",
    seed: 2088,
  },
];

/**
 * Seeds a demo player with two past sessions so history, baseline growth and
 * budget fading are visible immediately.
 */
export function seedDemoData() {
  const settings = useSettingsStore.getState().settings;
  useProfileStore.getState().setProfile(DEMO_PROFILE);
  const store = useSessionsStore.getState();
  store.clear();
  const built: ReturnType<typeof buildSession>[] = [];
  DEMO_SESSIONS.forEach((cfg, i) => {
    const session = buildSession(cfg, DEMO_PROFILE, settings, [...built]);
    session.createdAt = Date.now() - 1000 * 60 * 60 * 24 * (8 - i * 4);
    session.label = `Session ${i + 1} · ${cfg.strokeType}`;
    built.push(session);
    useSessionsStore.getState().addSession(session);
  });
}
