import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { ChoiceGroup } from "@/components/ChoiceGroup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CONDITION_LABELS, runProtocol, type PhaseResult } from "@/engine/evaluation";
import { decisionsToCsv } from "@/engine/report";
import type { Scenario, StrokeType } from "@/engine/types";
import { useProfileStore } from "@/store/profile";
import { useSettingsStore } from "@/store/settings";

export function EvaluationLab() {
  const settings = useSettingsStore((s) => s.settings);
  const profile = useProfileStore((s) => s.profile);
  const [seed, setSeed] = useState(7331);
  const [acqStroke, setAcqStroke] = useState<StrokeType>("forehand");
  const [transferStroke, setTransferStroke] = useState<StrokeType>("backhand");
  const [scenario, setScenario] = useState<Scenario>("stable");
  const [nTrials, setNTrials] = useState(60);
  const [results, setResults] = useState<PhaseResult[] | null>(null);

  const run = () =>
    setResults(
      runProtocol({
        seed,
        level: profile?.level ?? "intermediate",
        acquisitionStroke: acqStroke,
        transferStroke,
        acquisitionScenario: scenario,
        transferScenario: scenario,
        nTrials,
        retentionTrials: 30,
        settings,
      }),
    );


  const combined = (metric: "meanCV" | "successRate") =>
    results
      ? (["acquisition", "retention", "transfer"] as const).map((p) => ({
          phase: p[0].toUpperCase() + p.slice(1),
          ...Object.fromEntries(
            results
              .filter((r) => r.phase === p)
              .map((r) => [CONDITION_LABELS[r.condition], Number(r[metric].toFixed(2))]),
          ),
        }))
      : [];

  const exportCsv = () => {
    if (!results) return;
    const csv = decisionsToCsv(results.map((r) => r.session));
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tennisilent-protocol-${seed}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell
      title="Evaluation lab"
      subtitle="Acquisition → Retention (no feedback) → Transfer (no feedback), run on the same simulated player with identical seeds under three feedback conditions."
    >
      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <ChoiceGroup
            label="Acquisition stroke"
            value={acqStroke}
            onChange={setAcqStroke}
            choices={[
              { value: "forehand", label: "Forehand" },
              { value: "backhand", label: "Backhand" },
              { value: "serve", label: "Serve" },
            ]}
          />
          <ChoiceGroup
            label="Transfer stroke"
            value={transferStroke}
            onChange={setTransferStroke}
            choices={[
              { value: "forehand", label: "Forehand" },
              { value: "backhand", label: "Backhand" },
              { value: "serve", label: "Serve" },
            ]}
          />
          <ChoiceGroup
            label="Scenario"
            value={scenario}
            onChange={setScenario}
            choices={[
              { value: "stable", label: "Stable" },
              { value: "fatigue", label: "Fatigue" },
              { value: "outliers", label: "Outliers" },
            ]}
          />
          <ChoiceGroup
            label="Acquisition trials"
            value={nTrials}
            columns={3}
            onChange={setNTrials}
            choices={[
              { value: 40, label: "40" },
              { value: 60, label: "60" },
              { value: 100, label: "100" },
            ]}
          />
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="labseed">
              Seed
            </label>
            <Input
              id="labseed"
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value) || 0)}
              className="h-14 text-base"
            />
          </div>
          <Button size="lg" className="min-h-14 w-full" onClick={run}>
            Run protocol
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="min-h-14 w-full"
            onClick={exportCsv}
            disabled={!results}
          >
            Export CSV
          </Button>
        </div>

        <div className="space-y-8">
          <div className="card-soft p-5 text-sm text-muted-foreground">
            <span className="font-display text-foreground">Guidance hypothesis.</span>{" "}
            Frequent augmented feedback improves performance while it is available, but
            learners become dependent on it: when it is withdrawn, retention suffers.
            TenniSilent is validated if the budgeted condition shows lower variability and
            higher success than the continuous condition on the no-feedback retention and
            transfer tests — even if continuous looks better during acquisition.
          </div>

          {!results && (
            <p className="text-sm text-muted-foreground">
              Run the protocol to compare the three conditions.
            </p>
          )}

          {results && (
            <>
              {(
                [
                  ["meanCV", "Movement variability (mean CV %, lower is better)"],
                  ["successRate", "Success rate (%, higher is better)"],
                ] as const
              ).map(([metric, title]) => (
                <div key={metric}>
                  <h2 className="font-display text-lg font-semibold">{title}</h2>
                  <div className="card-soft mt-3 h-72 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={combined(metric)}>
                        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                        <XAxis dataKey="phase" stroke="var(--color-muted-foreground)" tick={{ fontSize: 11 }} />
                        <YAxis stroke="var(--color-muted-foreground)" tick={{ fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            background: "var(--color-surface-2)",
                            border: "1px solid var(--color-border)",
                            borderRadius: 12,
                            fontSize: 12,
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey={CONDITION_LABELS.budgeted} fill="var(--color-primary)" radius={6} />
                        <Bar dataKey={CONDITION_LABELS.continuous} fill="var(--color-chart-3)" radius={6} />
                        <Bar dataKey={CONDITION_LABELS.none} fill="var(--color-chart-6)" radius={6} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}

              <div className="card-soft overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      {["Condition", "Phase", "Mean CV", "Success", "Pulses"].map((h) => (
                        <th key={h} className="px-4 py-3 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={`${r.condition}-${r.phase}`} className="border-t border-border">
                        <td className="px-4 py-3">{CONDITION_LABELS[r.condition]}</td>
                        <td className="px-4 py-3 capitalize">{r.phase}</td>
                        <td className="px-4 py-3 font-mono">{r.meanCV.toFixed(2)}%</td>
                        <td className="px-4 py-3 font-mono">{r.successRate.toFixed(1)}%</td>
                        <td className="px-4 py-3 font-mono">{r.pulses}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
