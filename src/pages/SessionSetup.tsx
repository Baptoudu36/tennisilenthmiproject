import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ChoiceGroup } from "@/components/ChoiceGroup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fadedBudget } from "@/engine/decision";
import type { FeedbackCondition, Scenario, StrokeType } from "@/engine/types";
import { useProfileStore } from "@/store/profile";
import { useSessionsStore } from "@/store/sessions";

export function SessionSetup() {
  const navigate = useNavigate();
  const profile = useProfileStore((s) => s.profile);
  const sessions = useSessionsStore((s) => s.sessions);
  const setDraft = useSessionsStore((s) => s.setDraft);

  const [strokeType, setStrokeType] = useState<StrokeType>(profile?.focus ?? "forehand");
  const [nTrials, setNTrials] = useState(50);
  const [scenario, setScenario] = useState<Scenario>("fatigue");
  const [condition, setCondition] = useState<FeedbackCondition>("budgeted");
  const [seed, setSeed] = useState(4271);

  if (!profile) {
    return (
      <AppShell title="No player yet">
        <Button asChild size="lg" className="min-h-14">
          <Link to="/onboarding">Create a profile</Link>
        </Button>
      </AppShell>
    );
  }

  const nextSessionNumber = sessions.length + 1;
  const allowed =
    condition === "budgeted" ? fadedBudget(profile.budgetPreference, nextSessionNumber) : 0;

  return (
    <AppShell
      title="Session setup"
      subtitle={`Session ${nextSessionNumber} for ${profile.name}. The sensor stream is simulated; the decision engine is real.`}
    >
      <div className="max-w-2xl space-y-8">
        <ChoiceGroup
          label="Stroke"
          value={strokeType}
          onChange={setStrokeType}
          choices={[
            { value: "forehand", label: "Forehand" },
            { value: "backhand", label: "Backhand" },
            { value: "serve", label: "Serve" },
          ]}
        />

        <ChoiceGroup
          label="Number of strokes"
          value={nTrials}
          columns={4}
          onChange={setNTrials}
          choices={[
            { value: 20, label: "20" },
            { value: 50, label: "50" },
            { value: 80, label: "80" },
            { value: 120, label: "120" },
          ]}
        />

        <ChoiceGroup
          label="Simulation scenario"
          description="What happens to the simulated player during the session."
          value={scenario}
          onChange={setScenario}
          choices={[
            { value: "stable", label: "Stable", hint: "Noise only" },
            { value: "fatigue", label: "Fatigue drift", hint: "Progressive change from ~trial 25" },
            { value: "outliers", label: "Random outliers", hint: "Isolated spikes, no pattern" },
          ]}
        />

        <ChoiceGroup
          label="Feedback condition"
          value={condition}
          onChange={setCondition}
          choices={[
            { value: "budgeted", label: "Budgeted", hint: `TenniSilent · ${allowed} pulse(s)` },
            { value: "continuous", label: "Continuous", hint: "Pulse on every flagged stroke" },
            { value: "none", label: "None", hint: "Silent control" },
          ]}
        />

        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="seed">
            Seed
          </label>
          <p className="mb-3 text-xs text-muted-foreground">
            Same seed ⇒ exactly the same simulated player and strokes. Reproducibility is
            required to compare feedback conditions.
          </p>
          <Input
            id="seed"
            type="number"
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value) || 0)}
            className="h-14 max-w-40 text-base"
          />
        </div>

        <Button
          size="lg"
          className="min-h-14 w-full text-base"
          onClick={() => {
            setDraft({ strokeType, nTrials, scenario, condition, seed });
            navigate({ to: "/live" });
          }}
        >
          Go to the court
        </Button>
      </div>
    </AppShell>
  );
}
