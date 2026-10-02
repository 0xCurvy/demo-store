import type { AdminOverview } from "@api";
import { chainInfo } from "@/shared/lib/chains";
import { formatDateTime } from "@/shared/lib/format";

/** The values the server runs with, so a wrong setting is easy to spot. */
export function ShopSettings({ settings }: { settings: AdminOverview["settings"] }) {
  const rows = [
    ["Network", `${chainInfo(settings.chainId).name} (${settings.chainId})`],
    ["Token", settings.token],
    ["Aggregator", settings.aggregator],
    ["Checkout page", settings.checkoutUrl],
    ["Shop origin", settings.merchantOrigin],
    ["Completion page", settings.completePath],
    [
      "Paid when",
      settings.paidWhen === "shielded" ? "the payment is shielded" : "the money is spendable",
    ],
    ["Confirmations", String(settings.confirmations)],
    ["Link lifetime", `${settings.paymentTtlSeconds / 60} minutes`],
    ["Signer", settings.signer],
    ["Signer valid until", formatDateTime(settings.signerNotAfter)],
  ];

  return (
    <details className="group border-t-2 border-ink pt-4">
      <summary className="cursor-pointer font-semibold">Shop settings</summary>

      <dl className="mt-4 grid gap-x-6 gap-y-3 md:grid-cols-[max-content_1fr]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-ink-muted">{label}</dt>
            <dd className="font-mono text-sm break-all">{value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
