import type { AdminOverview, TokenView } from "@api";
import { formatDateTime, shortHex } from "@/shared/lib/format";
import { formatToken, formatUnits } from "@/shared/lib/money";
import { Notice } from "@/shared/ui/Notice";

type AgentPaymentsProps = { agents: AdminOverview["agents"]; token: TokenView | null };

/** Payments from agents over x402: one row per one-time address, newest first. */
export function AgentPayments({ agents, token }: AgentPaymentsProps) {
  return (
    <section aria-labelledby="agent-payments" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 id="agent-payments" className="text-2xl font-bold font-stretch-expanded">
          Agent payments
        </h2>
        <p className="text-sm text-ink-muted">
          {agents.confirmed} confirmed
          {token && agents.confirmed > 0
            ? `, ${formatToken(agents.netReceived, token)} after fees`
            : ""}
        </p>
      </div>

      {agents.unavailable && (
        <Notice tone="warning" title="Agent payments are not available right now">
          {agents.unavailable}
        </Notice>
      )}

      {agents.payments.length === 0 ? (
        <p className="text-ink-muted">
          No agent has paid yet. The /agents page explains how one would.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl text-left text-sm">
            <thead>
              <tr className="text-ink-muted">
                {["Resource", "Status", "Amount", "Received", "Pay-to", "Created"].map(
                  (heading) => (
                    <th key={heading} scope="col" className="pr-4 pb-2 font-medium">
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {agents.payments.map((payment) => (
                <tr key={payment.payTo} className="border-t border-line align-top">
                  <td className="py-3 pr-4 font-mono text-xs break-all">
                    {payment.resource.replace(/^https?:\/\/[^/]+/, "")}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="font-semibold">{payment.status}</span>
                    {payment.error && <p className="text-xs text-red-ink">{payment.error}</p>}
                  </td>
                  <td className="py-3 pr-4 tabular-nums">
                    {token ? formatUnits(payment.amount, token.decimals) : payment.amount}
                  </td>
                  <td className="py-3 pr-4 tabular-nums">
                    {token
                      ? formatToken(payment.netAmount, token)
                      : (payment.netAmount ?? "none yet")}
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs">{shortHex(payment.payTo)}</td>
                  <td className="py-3 whitespace-nowrap">{formatDateTime(payment.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
