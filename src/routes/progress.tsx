import { createFileRoute } from "@tanstack/react-router";
import { ProgressPage } from "@/pages/Progress";

const title = "Progress — TenniSilent";
const description =
  "Across-session trends: movement variability, success rate, baseline evolution and the fading feedback budget.";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ProgressPage,
});
