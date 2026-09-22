import { createFileRoute } from "@tanstack/react-router";
import { Onboarding } from "@/pages/Onboarding";

const title = "Player profile — TenniSilent";
const description =
  "Set your level, dominant hand and how often the coaching interface may interrupt you.";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Onboarding,
});
