import { createFileRoute } from "@tanstack/react-router";
import { EvaluationLab } from "@/pages/EvaluationLab";

const title = "Evaluation lab — TenniSilent";
const description =
  "Acquisition, retention and transfer tests comparing budgeted, continuous and no feedback on the same simulated player.";

export const Route = createFileRoute("/lab")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: EvaluationLab,
});
