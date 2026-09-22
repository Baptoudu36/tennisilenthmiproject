import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PlayerProfile } from "@/engine/types";

interface ProfileState {
  profile: PlayerProfile | null;
  setProfile: (p: PlayerProfile) => void;
  clear: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      setProfile: (profile) => set({ profile }),
      clear: () => set({ profile: null }),
    }),
    { name: "tennisilent-profile" },
  ),
);
