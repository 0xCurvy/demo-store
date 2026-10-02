import type { AdminOverview } from "@api";
import { formatToken } from "@/shared/lib/money";

export function Totals({ totals }: { totals: AdminOverview["totals"] }) {
  const received = totals.token ? formatToken(totals.netReceived, totals.token) : "nothing yet";

  const facts = [
    { label: "Recent orders", value: String(totals.orders) },
    { label: "Paid", value: String(totals.paid) },
    { label: "Received after fees", value: received },
  ];

  return (
    <dl className="grid gap-4 sm:grid-cols-3">
      {facts.map((fact) => (
        <div key={fact.label} className="border-t-2 border-ink pt-3">
          <dt className="text-sm text-ink-muted">{fact.label}</dt>
          <dd className="mt-1 text-2xl font-bold font-stretch-expanded tabular-nums">
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
