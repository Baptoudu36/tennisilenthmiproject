import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_SETTINGS } from "@/engine/decision";
import type { EngineSettings } from "@/engine/types";

interface SettingsState {
  settings: EngineSettings;
  update: <K extends keyof EngineSettings>(key: K, value: EngineSettings[K]) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: { ...DEFAULT_SETTINGS },
      update: (key, value) =>
        set((s) => ({ settings: { ...s.settings, [key]: value } })),
      reset: () => set({ settings: { ...DEFAULT_SETTINGS } }),
    }),
    { name: "tennisilent-settings" },
  ),
);

/** One-line scientific justification shown as a tooltip next to each parameter. */
export const SETTING_JUSTIFICATIONS: Record<keyof EngineSettings, string> = {
  n0: "Prior strength for Bayesian shrinkage: how many of the player's own successful trials are needed before the individual pattern outweighs population norms.",
  tauMax:
    "Upper detection threshold used when the individual model is still uncertain — a wide band avoids false alarms during cold start.",
  tauMin:
    "Lower detection threshold reached once the baseline is well estimated; ~2 SD keeps the false-positive rate low while remaining sensitive.",
  persistenceK:
    "Number of flagged trials required inside the window: motor output is inherently variable, so a single deviation is noise, not an error.",
  persistenceWindow:
    "Length of the recent-trial window over which persistence is assessed; short enough to stay responsive to genuine drift.",
  budget:
    "Maximum pulses per session. Reduced-frequency (bandwidth) feedback supports learning better than feedback after every repetition.",
  minGap:
    "Minimum trials between two pulses: the learner needs unguided repetitions to engage in their own error-detection processes.",
  calibrationTrials:
    "Observation-only trials at the start of a player's first session; no reference is trustworthy before data exists.",
  baselineWindow:
    "Rolling window of successful trials defining the individual reference; recent enough to track real technical change.",
};
