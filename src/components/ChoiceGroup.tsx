import { cn } from "@/lib/utils";

export interface Choice<T extends string | number> {
  value: T;
  label: string;
  hint?: string;
}

/**
 * Single-choice control with large touch targets (Fitts' law, ≥56 px on the
 * live screen) and few visible options at a time (Hick's law).
 */
export function ChoiceGroup<T extends string | number>({
  label,
  description,
  value,
  choices,
  onChange,
  columns = 3,
}: {
  label: string;
  description?: string;
  value: T;
  choices: Choice<T>[];
  onChange: (v: T) => void;
  columns?: 2 | 3 | 4;
}) {
  return (
    <div>
      <div className="mb-1 text-sm font-medium text-foreground">{label}</div>
      {description && (
        <p className="mb-3 text-xs text-muted-foreground">{description}</p>
      )}
      <div
        className={cn(
          "grid gap-2",
          columns === 2 && "grid-cols-2",
          columns === 3 && "grid-cols-1 sm:grid-cols-3",
          columns === 4 && "grid-cols-2 sm:grid-cols-4",
        )}
      >
        {choices.map((c) => {
          const active = c.value === value;
          return (
            <button
              key={String(c.value)}
              type="button"
              onClick={() => onChange(c.value)}
              className={cn(
                "min-h-14 rounded-xl border px-4 py-3 text-left transition-colors",
                active
                  ? "border-primary bg-primary/12 text-foreground"
                  : "border-border bg-surface text-muted-foreground hover:border-primary/50 hover:text-foreground",
              )}
            >
              <span className="block text-sm font-medium">{c.label}</span>
              {c.hint && <span className="block text-xs opacity-70">{c.hint}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
