import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { EngineSettings } from "@/engine/types";
import { seedDemoData } from "@/store/demo";
import { useProfileStore } from "@/store/profile";
import { useSessionsStore } from "@/store/sessions";
import { SETTING_JUSTIFICATIONS, useSettingsStore } from "@/store/settings";

const PARAMS: { key: keyof EngineSettings; label: string; min: number; max: number; step: number }[] =
  [
    { key: "n0", label: "Prior strength n₀", min: 1, max: 40, step: 1 },
    { key: "tauMax", label: "τ max", min: 2, max: 5, step: 0.1 },
    { key: "tauMin", label: "τ min", min: 1, max: 3, step: 0.1 },
    { key: "persistenceK", label: "Persistence k", min: 1, max: 5, step: 1 },
    { key: "persistenceWindow", label: "Persistence window", min: 3, max: 10, step: 1 },
    { key: "budget", label: "Feedback budget", min: 0, max: 10, step: 1 },
    { key: "minGap", label: "Minimum gap", min: 1, max: 20, step: 1 },
    { key: "calibrationTrials", label: "Calibration trials", min: 0, max: 30, step: 1 },
    { key: "baselineWindow", label: "Baseline window", min: 10, max: 80, step: 5 },
  ];

export function SettingsPage() {
  const { settings, update, reset } = useSettingsStore();
  const clearSessions = useSessionsStore((s) => s.clear);
  const clearProfile = useProfileStore((s) => s.clear);

  return (
    <AppShell
      title="Engine settings"
      subtitle="Every parameter changes how often the system speaks. Hover a name for the reason it exists."
    >
      <TooltipProvider delayDuration={100}>
        <div className="grid max-w-3xl gap-8">
          {PARAMS.map((p) => (
            <div key={p.key}>
              <div className="mb-3 flex items-center justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help border-b border-dashed border-border text-sm font-medium">
                      {p.label}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    {SETTING_JUSTIFICATIONS[p.key]}
                  </TooltipContent>
                </Tooltip>
                <span className="font-mono text-sm text-primary">
                  {Number(settings[p.key]).toFixed(p.step < 1 ? 1 : 0)}
                </span>
              </div>
              <Slider
                value={[Number(settings[p.key])]}
                min={p.min}
                max={p.max}
                step={p.step}
                onValueChange={([v]) => update(p.key, v)}
              />
            </div>
          ))}
        </div>
      </TooltipProvider>

      <div className="mt-12 flex flex-wrap gap-3">
        <Button variant="outline" size="lg" className="min-h-14" onClick={reset}>
          Reset parameters
        </Button>
        <Button size="lg" className="min-h-14" onClick={seedDemoData}>
          Reload demo player
        </Button>
        <Button
          variant="destructive"
          size="lg"
          className="min-h-14"
          onClick={() => {
            clearSessions();
            clearProfile();
            reset();
          }}
        >
          Erase all data
        </Button>
      </div>
    </AppShell>
  );
}
