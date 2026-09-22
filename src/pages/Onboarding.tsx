import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ChoiceGroup } from "@/components/ChoiceGroup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Hand, Level, PlayerProfile, StrokeType } from "@/engine/types";
import { useProfileStore } from "@/store/profile";

export function Onboarding() {
  const navigate = useNavigate();
  const existing = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);

  const [name, setName] = useState(existing?.name ?? "");
  const [hand, setHand] = useState<Hand>(existing?.hand ?? "right");
  const [level, setLevel] = useState<Level>(existing?.level ?? "intermediate");
  const [focus, setFocus] = useState<StrokeType>(existing?.focus ?? "forehand");
  const [budget, setBudget] = useState(existing?.budgetPreference ?? 3);

  const save = () => {
    const profile: PlayerProfile = {
      name: name.trim() || "Player",
      hand,
      level,
      focus,
      budgetPreference: budget,
      createdAt: existing?.createdAt ?? Date.now(),
    };
    setProfile(profile);
    navigate({ to: "/setup" });
  };

  return (
    <AppShell
      title="Your profile"
      subtitle="Four questions. They set the population reference used before the system has learned your own pattern."
    >
      <div className="max-w-2xl space-y-8">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="name">
            Name
          </label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="h-14 text-base"
          />
        </div>

        <ChoiceGroup
          label="Dominant hand"
          value={hand}
          columns={2}
          onChange={setHand}
          choices={[
            { value: "right", label: "Right" },
            { value: "left", label: "Left" },
          ]}
        />

        <ChoiceGroup
          label="Level"
          description="Used only as a starting prior; it is progressively replaced by your own data."
          value={level}
          onChange={setLevel}
          choices={[
            { value: "beginner", label: "Beginner" },
            { value: "intermediate", label: "Intermediate" },
            { value: "advanced", label: "Advanced" },
          ]}
        />

        <ChoiceGroup
          label="Main stroke focus"
          value={focus}
          onChange={setFocus}
          choices={[
            { value: "forehand", label: "Forehand" },
            { value: "backhand", label: "Backhand" },
            { value: "serve", label: "Serve" },
          ]}
        />

        <ChoiceGroup
          label="How often may the system interrupt you?"
          description="This is the maximum number of pulses in one practice session. Fewer interruptions usually means better long-term learning, because you keep detecting your own errors."
          value={budget}
          columns={4}
          onChange={setBudget}
          choices={[
            { value: 1, label: "Almost never", hint: "1 pulse" },
            { value: 3, label: "Rarely", hint: "3 pulses (recommended)" },
            { value: 5, label: "Sometimes", hint: "5 pulses" },
            { value: 8, label: "Often", hint: "8 pulses" },
          ]}
        />

        <Button size="lg" className="min-h-14 w-full text-base" onClick={save}>
          Continue
        </Button>
      </div>
    </AppShell>
  );
}
