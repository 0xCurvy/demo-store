import type { OrderView } from "@api";
import { formatPrice } from "@/shared/lib/money";
import { Button } from "@/shared/ui/Button";
import { ShopLoader } from "@/shared/ui/ShopLoader";
import { Sheet } from "@/shared/ui/Sheet";

type WaitingPanelProps = {
  order: OrderView;
  stage: "waiting" | "confirming" | "link-closed";
  startingAgain: boolean;
  onPayAgain: () => void;
};

const COPY = {
  waiting: {
    title: "Waiting for your payment",
    text: "Keep this page open. It updates as soon as the payment reaches the shop, usually within a minute.",
  },
  confirming: {
    title: "Payment found",
    text: "The shop is waiting for the chain to confirm it before it counts the order as paid.",
  },
  "link-closed": {
    title: "The payment link has closed",
    text: "If you paid, keep this page open: the shop looks for your payment for another hour. If you did not pay, start a new payment.",
  },
};

export function WaitingPanel({ order, stage, startingAgain, onPayAgain }: WaitingPanelProps) {
  const { title, text } = COPY[stage];

  return (
    <Sheet offset="red" aria-live="polite" className="p-6 md:p-8">
      <ShopLoader label={title} />
      <h1 className="mt-6 text-3xl font-extrabold font-stretch-expanded">{title}</h1>
      <p className="mt-2 leading-relaxed text-ink-muted">{text}</p>

      <p className="mt-6 border-t-2 border-dashed border-ink pt-4 font-semibold">
        {order.productName}, {formatPrice(order.price)}
      </p>

      {stage === "link-closed" && (
        <Button className="mt-6" variant="secondary" busy={startingAgain} onClick={onPayAgain}>
          {startingAgain ? "Opening checkout…" : "Start a new payment"}
        </Button>
      )}
    </Sheet>
  );
}
