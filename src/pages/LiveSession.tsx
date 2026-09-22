import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { OUTCOME_LABELS } from "@/engine/decision";
import { FEATURES } from "@/engine/features";
import type { Session } from "@/engine/types";
import type { TrialPhase } from "@/engine/decision";
import { buildSession } from "@/lib/build-session";
import { cn } from "@/lib/utils";
import { useProfileStore } from "@/store/profile";
import { useSessionsStore } from "@/store/sessions";
import { useSettingsStore } from "@/store/settings";

const PHASE_MS: Record<TrialPhase, number> = { READY: 700, SWING: 500, BREAK: 1000 };

export function LiveSession() {
  const navigate = useNavigate();
  const profile = useProfileStore((s) => s.profile);
  const draft = useSessionsStore((s) => s.draft);
  const sessions = useSessionsStore((s) => s.sessions);
  const addSession = useSessionsStore((s) => s.addSession);
  const settings = useSettingsStore((s) => s.settings);

  // The whole session is computed up-front and deterministically; the live
  // screen is a time-accurate playback of it.
  const [session] = useState<Session | null>(() =>
    profile && draft ? buildSession(draft, profile, settings, sessions) : null,
  );

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<TrialPhase>("READY");
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [pulseAt, setPulseAt] = useState<number | null>(null);
  const [showWhy, setShowWhy] = useState(false);
  const [coachView, setCoachView] = useState(false);
  const [finished, setFinished] = useState(false);
  const savedRef = useRef(false);

  const total = session?.trials.length ?? 0;
  const decision = session?.decisions[idx] ?? null;
  const delivered = useMemo(
    () =>
      session
        ? session.decisions
            .slice(0, idx + (phase === "BREAK" ? 1 : 0))
            .filter((d) => d.outcome === "DELIVERED").length
        : 0,
    [session, idx, phase],
  );

  const finish = useCallback(() => {
    if (!session || savedRef.current) return;
    savedRef.current = true;
    setRunning(false);
    setFinished(true);
    addSession(session);
    navigate({ to: "/report/$id", params: { id: session.id } });
  }, [session, addSession, navigate]);

  useEffect(() => {
    if (!running || !session || finished) return;
    const timer = setTimeout(() => {
      if (phase === "READY") {
        setPhase("SWING");
      } else if (phase === "SWING") {
        // The pulse is NEVER emitted during the swing: a decision taken mid-stroke
        // is queued and released at the start of the following BREAK.
        setPhase("BREAK");
        const d = session.decisions[idx];
        if (d?.outcome === "DELIVERED") {
          setPulseAt(Date.now());
          setShowWhy(false);
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            navigator.vibrate?.(150);
          }
        }
      } else {
        setPulseAt(null);
        setShowWhy(false);
        if (idx + 1 >= session.trials.length) {
          finish();
        } else {
          setIdx((i) => i + 1);
          setPhase("READY");
        }
      }
    }, PHASE_MS[phase]! / speed);
    return () => clearTimeout(timer);
  }, [running, phase, idx, speed, session, finished, finish]);

  if (!profile || !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-muted-foreground">No session is configured.</p>
        <Button asChild size="lg" className="min-h-14">
          <Link to="/setup">Set up a session</Link>
        </Button>
      </div>
    );
  }

  const phaseColor =
    phase === "SWING" ? "text-primary" : phase === "BREAK" ? "text-silence" : "text-foreground";

  return (
    <div
      className={cn(
        "relative min-h-screen bg-background",
        pulseAt !== null && "pulse-flash",
      )}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-6">
        <div className="flex items-center justify-between">
          <span className="font-display text-sm uppercase tracking-[0.25em] text-muted-foreground">
            {session.config.strokeType}
          </span>
          <span className="text-sm text-muted-foreground">
            {idx + 1} / {total}
          </span>
        </div>

        {/* Glanceable state — readable in under a second at arm's length. */}
        <div className="card-soft flex flex-col items-center justify-center gap-4 px-6 py-14">
          <div
            className={cn(
              "font-display text-5xl font-semibold tracking-tight sm:text-7xl",
              phaseColor,
              phase === "READY" && running && "breathe",
            )}
          >
            {phase}
          </div>
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.max(session.budgetAllowed, 0) }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-3 w-3 rounded-full",
                  i < session.budgetAllowed - delivered ? "bg-primary" : "bg-border",
                )}
              />
            ))}
            {session.budgetAllowed === 0 && (
              <span className="text-xs text-muted-foreground">No feedback condition</span>
            )}
          </div>
          {pulseAt !== null && (
            <div className="flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-primary/70" />
              {!showWhy ? (
                <Button
                  variant="outline"
                  className="min-h-14 px-8"
                  onClick={() => setShowWhy(true)}
                >
                  Why?
                </Button>
              ) : (
                <p className="max-w-sm text-center text-sm text-foreground">
                  {decision?.whyLine}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Large, always-reachable controls. */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            size="lg"
            className="min-h-16 text-base"
            onClick={() => setRunning((r) => !r)}
          >
            {running ? "Pause everything" : idx === 0 ? "Start" : "Resume"}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="min-h-16 text-base"
            onClick={finish}
          >
            Stop & report
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[1, 5, 20].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={cn(
                "min-h-14 rounded-xl border text-sm font-medium transition-colors",
                speed === s
                  ? "border-primary bg-primary/12 text-foreground"
                  : "border-border bg-surface text-muted-foreground",
              )}
            >
              {s}× speed
            </button>
          ))}
        </div>

        <button
          onClick={() => setCoachView((c) => !c)}
          className="text-left text-sm text-muted-foreground underline underline-offset-4"
        >
          {coachView ? "Hide" : "Show"} coach view
        </button>

        {coachView && decision && (
          <div className="card-soft space-y-5 p-5">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                ["τ(n)", decision.tau.toFixed(2)],
                ["w", decision.w.toFixed(2)],
                ["n", String(decision.n)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-surface-2 py-3">
                  <div className="text-xs text-muted-foreground">{k}</div>
                  <div className="font-display text-lg">{v}</div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {FEATURES.map((f) => {
                const data = session.decisions
                  .slice(Math.max(0, idx - 24), idx + 1)
                  .map((d, i) => ({ i, z: d.z[f.key] }));
                const z = decision.z[f.key];
                return (
                  <div key={f.key} className="flex items-center gap-3">
                    <div className="w-40 shrink-0 text-xs text-muted-foreground">
                      {f.label}
                    </div>
                    <div className="h-8 flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                          <YAxis domain={[-4, 4]} hide />
                          <Line
                            type="monotone"
                            dataKey="z"
                            dot={false}
                            strokeWidth={1.5}
                            stroke={
                              Math.abs(z) > decision.tau
                                ? "var(--color-primary)"
                                : "var(--color-silence)"
                            }
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div
                      className={cn(
                        "w-14 shrink-0 text-right font-mono text-xs",
                        Math.abs(z) > decision.tau ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {z.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="max-h-64 space-y-2 overflow-y-auto">
              {session.decisions
                .slice(0, idx + 1)
                .slice(-25)
                .reverse()
                .map((d) => (
                  <div
                    key={d.trialIndex}
                    className="rounded-lg border border-border/70 bg-surface-2 px-3 py-2 text-xs"
                  >
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">#{d.trialIndex + 1}</span>
                      <span
                        className={
                          d.outcome === "DELIVERED" ? "text-primary" : "text-silence"
                        }
                      >
                        {OUTCOME_LABELS[d.outcome]}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{d.reason}</p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
