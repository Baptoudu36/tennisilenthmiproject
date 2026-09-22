import { createFileRoute } from "@tanstack/react-router";
import { LiveSession } from "@/pages/LiveSession";

const title = "Live session — TenniSilent";
const description =
  "Glanceable court screen: stroke phase, remaining feedback budget and content-free pulses delivered only between strokes.";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: LiveSession,
});
