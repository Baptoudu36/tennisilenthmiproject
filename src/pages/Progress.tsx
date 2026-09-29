import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { buildBaseline, cv } from "@/engine/baseline";
import { FEATURES } from "@/engine/features";
import type { FeatureKey } from "@/engine/types";
import { useSessionsStore } from "@/store/sessions";
import { useSettingsStore } from "@/store/settings";

export function ProgressPage() {
  const sessions = useSessionsStore((s) => s.sessions);
  const settings = useSettingsStore((s) => s.settings);
  const [feature, setFeature] = useState<FeatureKey>("contactForward_cm");

  const data = useMemo(
    () =>
      sessions.map((s, i) => {
        const successTrials = s.trials.filter((t) => t.success);
        const baseline = buildBaseline(successTrials, s.config.strokeType, s.level, settings);
        return {
          name: `S${i + 1}`,
          cv: Number(cv(s.trials.map((t) => t.features[feature])).toFixed(2)),
          meanCV: Number(
            (
              FEATURES.reduce(
                (acc, f) => acc + cv(s.trials.map((t) => t.features[f.key])),
                0,
              ) / FEATURES.length
            ).toFixed(2),
          ),
          success: Number(((successTrials.length / s.trials.length) * 100).toFixed(1)),
          budget: s.budgetAllowed,
          delivered: s.decisions.filter((d) => d.outcome === "DELIVERED").length,
          center: Number(baseline.features[feature].center.toFixed(1)),
          w: Number(baseline.w.toFixed(2)),
          id: s.id,
          label: s.label,
        };
      }),
    [sessions, settings, feature],
  );

  if (!sessions.length) {
    return (
      <AppShell title="No history yet">
        <Button asChild size="lg" className="min-h-14">
          <Link to="/setup">Run a first session</Link>
        </Button>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Progress"
      subtitle="The target outcome is DECREASING variability around the player's own pattern — not convergence toward a population ideal."
    >
      <div className="flex flex-wrap items-center gap-2">
        {FEATURES.map((f) => (
          <button
            key={f.key}
            onClick={() => setFeature(f.key)}
            className={
              "rounded-full border px-3 py-1.5 text-xs " +
              (feature === f.key
                ? "border-primary bg-primary/12 text-foreground"
                : "border-border text-muted-foreground")
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card-soft mt-4 h-80 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke="var(--color-muted-foreground)" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="l" stroke="var(--color-muted-foreground)" tick={{ fontSize: 11 }} />
            <YAxis
              yAxisId="r"
              orientation="right"
              stroke="var(--color-muted-foreground)"
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Bar yAxisId="l" dataKey="cv" name="CV (%)" fill="var(--color-chart-3)" radius={6} />
            <Line
              yAxisId="r"
              dataKey="success"
              name="Success (%)"
              stroke="var(--color-success)"
              strokeWidth={2}
            />
            <Line
              yAxisId="l"
              dataKey="budget"
              name="Budget allowed"
              stroke="var(--color-primary)"
              strokeDasharray="4 4"
              strokeWidth={2}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="card-soft mt-8 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {["Session", "Mean CV", "Success", "FEEDBACK", "Pulses", "Baseline center", "w", ""].map(
                (h) => (
                  <th key={h} className="px-4 py-3 font-medium">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.id} className="border-t border-border">
                <td className="px-4 py-3">{d.label}</td>
                <td className="px-4 py-3 font-mono">{d.meanCV}%</td>
                <td className="px-4 py-3 font-mono">{d.success}%</td>
                <td className="px-4 py-3 font-mono">{d.budget}</td>
                <td className="px-4 py-3 font-mono">{d.delivered}</td>
                <td className="px-4 py-3 font-mono">{d.center}</td>
                <td className="px-4 py-3 font-mono">{d.w}</td>
                <td className="px-4 py-3">
                  <Link
                    to="/report/$id"
                    params={{ id: d.id }}
                    className="text-primary underline underline-offset-4"
                  >
                    Report
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
