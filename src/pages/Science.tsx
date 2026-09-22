import { AppShell } from "@/components/AppShell";

const PRINCIPLES: { title: string; body: string }[] = [
  {
    title: "Individual baseline",
    body: "The reference is built only from the player's own successful strokes, using robust statistics (median, 1.4826 × MAD). Technique is idiosyncratic: a legitimate personal style must not be treated as an error.",
  },
  {
    title: "Bayesian shrinkage cold start",
    body: "Before the player has enough data, the reference is a weighted blend of their own estimate and population norms: w = n/(n+n₀). The system answers 'which reference before a baseline exists?' explicitly rather than guessing.",
  },
  {
    title: "Adaptive threshold",
    body: "τ(n) = τ_min + (τ_max − τ_min)·e^(−n/10). The interface is deliberately more tolerant while its own model is uncertain, protecting the learner from false alarms.",
  },
  {
    title: "Persistence rule",
    body: "Human movement is inherently variable. A deviation counts only if the same feature is flagged with the same sign in at least 3 of the last 5 strokes — systematic error, not motor noise.",
  },
  {
    title: "Bandwidth / budgeted feedback",
    body: "Feedback is delivered only when performance leaves an acceptable bandwidth, and at most a few times per session. Reduced-frequency feedback consistently produces better learning than feedback after every repetition.",
  },
  {
    title: "Faded feedback",
    body: "The budget decreases as sessions accumulate (floor of one pulse). Gradual withdrawal transfers the error-detection role back to the learner.",
  },
  {
    title: "Guidance hypothesis",
    body: "Salmoni, Schmidt & Walter (1984): augmented feedback guides performance while present, but frequent feedback creates dependence and degrades retention. Silence is therefore a pedagogical act, not a system limitation.",
  },
  {
    title: "Self-controlled feedback",
    body: "The pulse itself is content-free; the explanation appears only if the player asks for it. Learner-controlled feedback schedules improve learning and preserve the sense of agency.",
  },
  {
    title: "No interruption during execution",
    body: "A pulse is never emitted during the swing. Interrupting an ongoing motor program disrupts execution; decisions are queued and released in the break between strokes.",
  },
  {
    title: "Retention and transfer testing",
    body: "Performance during practice is not learning. The evaluation lab tests the same simulated player without feedback on the trained stroke (retention) and on a different stroke (transfer).",
  },
];

export function Science() {
  return (
    <AppShell
      title="About the science"
      subtitle="The decision rules implemented in this prototype and the motor-learning principles behind them."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {PRINCIPLES.map((p) => (
          <div key={p.title} className="card-soft p-5">
            <h2 className="font-display text-base font-semibold text-primary">{p.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
