import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { OUTCOME_LABELS } from "@/engine/decision";
import { FEATURES, featureDef } from "@/engine/features";
import { featureSeries, generateReport } from "@/engine/report";
import type { DecisionOutcome, FeatureKey } from "@/engine/types";
import { useSessionsStore } from "@/store/sessions";
import { useSettingsStore } from "@/store/settings";

export function Report({ id }: { id: string }) {
  const sessions = useSessionsStore((s) => s.sessions);
  const settings = useSettingsStore((s) => s.settings);
  const session = sessions.find((s) => s.id === id) ?? sessions[sessions.length - 1];
  const [feature, setFeature] = useState<FeatureKey>("contactForward_cm");

  const report = useMemo(
    () => (session ? generateReport(session, settings) : null),
    [session, settings],
  );
  const series = useMemo(
    () => (session ? featureSeries(session, feature, settings) : null),
    [session, feature, settings],
  );

  if (!session || !report || !series) {
    return (
      <AppShell title="No session found">
        <Button asChild size="lg" className="min-h-14">
          <Link to="/setup">Run a session</Link>
        </Button>
      </AppShell>
    );
  }

  const order: DecisionOutcome[] = [
    "DELIVERED",
    "SILENT_NO_DEVIATION",
    "SUPPRESSED_NOT_PERSISTENT",
    "SUPPRESSED_CALIBRATION",
    "SUPPRESSED_MIN_GAP",
    "SUPPRESSED_BUDGET",
  ];

  return (
    <AppShell
      title={session.label}
      subtitle={`${session.config.condition} condition · ${session.config.scenario} scenario · seed ${session.config.seed}`}
    >
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ["Strokes", String(report.trials)],
          ["Success rate", `${report.successRate.toFixed(0)}%`],
          ["Pulses delivered", `${report.delivered} / ${session.budgetAllowed || 0}`],
          ["Silence", `${report.silenceRate.toFixed(0)}%`],
        ].map(([k, v]) => (
          <div key={k} className="card-soft p-5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{k}</div>
            <div className="mt-2 font-display text-3xl">{v}</div>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Why the system stayed silent</h2>
        <div className="card-soft mt-4 divide-y divide-border">
          {order.map((o) => (
            <div key={o} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className={o === "DELIVERED" ? "text-primary" : "text-muted-foreground"}>
                {OUTCOME_LABELS[o]}
              </span>
              <span className="font-mono">{report.breakdown[o]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">
          Main observations ({report.observations.length})
        </h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {report.observations.map((o) => (
            <div key={`${o.key}-${o.direction}`} className="card-soft p-5">
              <div className="font-display text-base text-primary">{o.label}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {o.direction === "above" ? "Above" : "Below"} your usual pattern on{" "}
                {o.trialsFlagged} strokes (mean z = {o.meanZ.toFixed(2)}).
              </p>
              <div className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">
                Objective
              </div>
              <p className="text-sm">{o.objective}</p>
              <div className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
                Drill
              </div>
              <p className="text-sm">{o.drill}</p>
            </div>
          ))}
          {report.observations.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No systematic deviation was detected. Nothing to change.
            </p>
          )}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-4 font-display text-xl font-semibold">Feature across strokes</h2>
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
            <ComposedChart data={series.data}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis dataKey="trial" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 11 }}
                stroke="var(--color-muted-foreground)"
                unit={` ${featureDef(feature).unit}`}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Area
                dataKey="high"
                stroke="none"
                fill="var(--color-silence)"
                fillOpacity={0.12}
                isAnimationActive={false}
              />
              <Area
                dataKey="low"
                stroke="none"
                fill="var(--color-background)"
                fillOpacity={1}
                isAnimationActive={false}
              />
              <Line
                dataKey="center"
                stroke="var(--color-silence)"
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                dataKey="value"
                stroke="var(--color-chart-3)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Scatter dataKey="pulse" fill="var(--color-primary)" isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Shaded band = individual baseline ± τ·scale. Orange dots = delivered pulses.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Within-session variability</h2>
        <div className="card-soft mt-4 divide-y divide-border">
          {report.variability.map((v) => (
            <div key={v.key} className="flex items-center justify-between px-5 py-3 text-sm">
              <span>{v.label}</span>
              <span className="font-mono text-muted-foreground">
                SD {v.sd.toFixed(1)} {v.unit} · CV {v.cv.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-10 flex gap-3">
        <Button asChild size="lg" className="min-h-14">
          <Link to="/progress">See progress</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="min-h-14">
          <Link to="/setup">New session</Link>
        </Button>
      </div>
    </AppShell>
  );
}
