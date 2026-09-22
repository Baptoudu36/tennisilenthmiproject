import { createFileRoute } from "@tanstack/react-router";
import { Report } from "@/pages/Report";

const title = "Session report — TenniSilent";
const description =
  "Pulses delivered versus suppressed with the reason for each silence, main observations, drills and per-feature charts.";

export const Route = createFileRoute("/report/$id")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ReportRoute,
});

function ReportRoute() {
  const { id } = Route.useParams();
  return <Report id={id} />;
}
