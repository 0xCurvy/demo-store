import type { AdminAttemptView, TokenView } from "@api";
import { formatDateTime, shortHex } from "@/shared/lib/format";
import { formatToken } from "@/shared/lib/money";
import { StatusLabel } from "@/shared/ui/StatusLabel";
import { TransactionLink } from "@/shared/ui/TransactionLink";

type AttemptDetailsProps = {
  attempt: AdminAttemptView;
  chainId: number;
  token: TokenView;
  /** The shop counts an order paid once Curvy commits it, so the commit is worth showing. */
  paidOnCommit: boolean;
  /** When the page last read the orders (seconds since epoch). */
  nowSeconds: number;
};

/** Everything the shop's last `verifyPayment` said about one payment attempt. */
export function AttemptDetails(props: AttemptDetailsProps) {
  const { attempt, chainId, token, paidOnCommit, nowSeconds } = props;
  const payable = attempt.status === "processing" && attempt.expiry > nowSeconds;

  const committed =
    attempt.committed === null ? "not found yet" : attempt.committed ? "yes" : "not yet";

  const facts = [
    ["Link closes", formatDateTime(new Date(attempt.expiry * 1_000).toISOString())],
    ["Payment reference", shortHex(attempt.ephemeralKeyX)],
    ["Received after fees", formatToken(attempt.netAmount, token)],
    ["Needed after fees", formatToken(attempt.minimumNetAmount, token)],
    ["Confirmations", attempt.confirmations ?? "none yet"],
    ...(paidOnCommit ? [["Committed by Curvy", committed]] : []),
    ["Scanning from block", attempt.fromBlock],
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h4 className="font-semibold">Attempt {attempt.number}</h4>
        <StatusLabel status={attempt.status} />
        {attempt.txHash && <TransactionLink chainId={chainId} txHash={attempt.txHash} />}
        {!attempt.lastCheckOk && attempt.checkedAt && (
          <span className="text-sm text-red-ink">The last check did not reach the chain.</span>
        )}
      </div>

      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-ink-muted">{label}</dt>
            <dd className="font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      {attempt.siblingNoteIds.length > 0 && (
        <p className="text-sm text-red-ink">
          More than one payment arrived for this reference. Only one can be spent: review this
          order.
        </p>
      )}

      <p className="text-sm text-ink-muted">
        {attempt.checkedAt
          ? `From the shop's last check on chain, ${formatDateTime(attempt.checkedAt)}. Paid orders are not checked again.`
          : "Not checked on chain yet."}
      </p>

      {payable && (
        <a
          href={attempt.checkoutUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-sm font-semibold text-sky-ink underline underline-offset-4"
        >
          Open the checkout link
        </a>
      )}
    </div>
  );
}
