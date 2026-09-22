import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Session, SessionConfig, StrokeType, Trial } from "@/engine/types";

interface SessionsState {
  sessions: Session[];
  /** Draft configuration handed from the setup screen to the live screen. */
  draft: SessionConfig | null;
  setDraft: (c: SessionConfig) => void;
  addSession: (s: Session) => void;
  clear: () => void;
}

export const useSessionsStore = create<SessionsState>()(
  persist(
    (set) => ({
      sessions: [],
      draft: null,
      setDraft: (draft) => set({ draft }),
      addSession: (s) => set((st) => ({ sessions: [...st.sessions, s] })),
      clear: () => set({ sessions: [], draft: null }),
    }),
    { name: "tennisilent-sessions" },
  ),
);

/**
 * Successful trials carried across sessions: the individual baseline persists,
 * so the player never restarts from a cold start twice.
 */
export function priorSuccessfulTrials(
  sessions: Session[],
  stroke: StrokeType,
  window: number,
): Trial[] {
  return sessions
    .filter((s) => s.config.strokeType === stroke)
    .flatMap((s) => s.trials.filter((t) => t.success))
    .slice(-window);
}
