import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { seedDemoData } from "@/store/demo";
import { useProfileStore } from "@/store/profile";
import { useSessionsStore } from "@/store/sessions";

export function Landing() {
  const profile = useProfileStore((s) => s.profile);
  const sessions = useSessionsStore((s) => s.sessions);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => setSeeded(true), []);

  return (
    <div className="min-h-screen court-glow">
      <div className="mx-auto flex max-w-4xl flex-col px-5 py-20 sm:py-28">
        <span className="font-display text-sm uppercase tracking-[0.35em] text-primary">
          TenniSilent
        </span>

        <h1 className="mt-8 font-display text-3xl font-semibold leading-tight sm:text-5xl">
          An intelligent tennis coaching interface that helps players improve technical
          skills by delivering personalized feedback only when intervention is judged
          meaningful for motor learning, and remaining silent otherwise.
        </h1>

        <div className="mt-10 max-w-2xl space-y-3 text-base text-muted-foreground">
          <p>
            The system watches every stroke but says almost nothing : silence is the
            default state, not a failure to detect.
          </p>
          <p>
            It first learns your own movement pattern, then speaks only when a deviation
            is systematic — repeated across strokes, not a one-off fluctuation.
          </p>
          <p>
            When it does speak, it is a single content-free pulse delivered between
            strokes, and you decide whether to see the reason behind it.
          </p>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-3">
          <Button asChild size="lg" className="min-h-14 px-8 text-base">
            <Link to={profile ? "/setup" : "/onboarding"}>Start</Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="min-h-14"
            onClick={() => {
              seedDemoData();
              setSeeded(true);
            }}
          >
            Load demo player
          </Button>
          <Button asChild variant="ghost" size="lg" className="min-h-14">
            <Link to="/science">About the science</Link>
          </Button>
        </div>

        {seeded && profile && (
          <p className="mt-6 text-sm text-muted-foreground">
            Signed in as <span className="text-foreground">{profile.name}</span> ·{" "}
            {sessions.length} recorded session{sessions.length === 1 ? "" : "s"}.
          </p>
        )}

        <div className="mt-20 grid gap-4 sm:grid-cols-3">
          {[
            ["Individual baseline", "Your reference will be your own strokes, nothing else."],
            ["Persistence rule", "A deviation must repeat in 3 of the last 5 strokes to count."],
            ["Feedback budget", "A few pulses per session, fading as you progress."],
          ].map(([t, d]) => (
            <div key={t} className="card-soft p-5">
              <div className="font-display text-sm font-semibold text-primary">{t}</div>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
