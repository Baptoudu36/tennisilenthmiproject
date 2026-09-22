import { createFileRoute } from "@tanstack/react-router";
import { SessionSetup } from "@/pages/SessionSetup";

const title = "Session setup — TenniSilent";
const description =
  "Choose stroke, number of strokes, simulation scenario, feedback condition and seed before going to the court.";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: SessionSetup,
});
