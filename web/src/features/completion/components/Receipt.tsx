import type { OrderView } from "@api";
import { Link } from "react-router";
import { formatPrice, formatToken } from "@/shared/lib/money";
import { Sheet } from "@/shared/ui/Sheet";
import { TransactionLink } from "@/shared/ui/TransactionLink";
import { DownloadPanel } from "./DownloadPanel";
import { PaidStamp } from "./PaidStamp";
import { ReceiptLines } from "./ReceiptLines";

export function Receipt({ order }: { order: OrderView }) {
  const paying = order.attempts.find((attempt) => attempt.status === "paid");

  const transaction = paying?.txHash ? (
    <TransactionLink chainId={order.chainId} txHash={paying.txHash} />
  ) : (
    "not recorded"
  );

  return (
    <Sheet offset="sky" aria-labelledby="receipt-title">
      <header className="p-6 md:p-8">
        <PaidStamp />
        <h1 id="receipt-title" className="mt-6 text-4xl poster-title">
          Your wallpaper is ready
        </h1>
        <p className="mt-2 leading-relaxed text-ink-muted">
          The shop confirmed the payment on chain. Here is your copy of {order.productName}.
        </p>
      </header>

      {order.download && (
        <div className="border-t-2 border-ink px-6 py-6 md:px-8">
          <DownloadPanel download={order.download} />
        </div>
      )}

      <div className="border-t-2 border-dashed border-ink px-6 pb-2 md:px-8">
        <ReceiptLines
          lines={[
            { label: "Item", value: order.productName },
            { label: "Price", value: formatPrice(order.price) },
            { label: "You paid", value: formatToken(order.amount, order.token) },
            {
              label: "The shop received",
              value: formatToken(paying?.netAmount ?? null, order.token),
            },
            { label: "Transaction", value: transaction },
          ]}
        />
      </div>

      <footer className="border-t-2 border-ink p-6 md:px-8">
        <Link
          to="/"
          className="font-semibold text-sky-ink underline decoration-2 underline-offset-4"
        >
          Back to the shop
        </Link>
      </footer>
    </Sheet>
  );
}
