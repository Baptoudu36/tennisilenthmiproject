import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/pages/SettingsPage";

const title = "Engine settings — TenniSilent";
const description =
  "Tune prior strength, thresholds, persistence, budget and gap — each with its scientific justification.";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: SettingsPage,
});
