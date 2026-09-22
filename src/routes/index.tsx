import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/pages/Landing";

const title = "TenniSilent — coaching that knows when not to speak";
const description =
  "An intelligent tennis coaching interface delivering feedback only when intervention is meaningful for motor learning, and remaining silent otherwise.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Landing,
});
