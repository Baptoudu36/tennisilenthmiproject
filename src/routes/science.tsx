import { createFileRoute } from "@tanstack/react-router";
import { Science } from "@/pages/Science";

const title = "About the science — TenniSilent";
const description =
  "Individual baseline, Bayesian shrinkage cold start, persistence rule, budgeted and faded feedback, guidance hypothesis, retention and transfer testing.";

export const Route = createFileRoute("/science")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Science,
});
