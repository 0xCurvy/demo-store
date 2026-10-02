import type { OrderView } from "@api";
import { formatToken } from "@/shared/lib/money";
import { Button } from "@/shared/ui/Button";
import { Sheet } from "@/shared/ui/Sheet";

type PaymentProblemProps = {
  order: OrderView;
  problem: "underpaid" | "wrong-token" | "expired";
  startingAgain: boolean;
  onPayAgain: () => void;
};

function describe(order: OrderView, problem: PaymentProblemProps["problem"]) {
  const found = order.attempts.find((attempt) => attempt.netAmount !== null);

  switch (problem) {
    case "underpaid":
      return {
        title: "The payment was less than the order total",
        text: `The shop received ${formatToken(found?.netAmount ?? null, order.token)} after Curvy's fees, but this order needs at least ${formatToken(found?.minimumNetAmount ?? null, order.token)}. Contact the shop to settle the difference.`,
      };
    case "wrong-token":
      return {
        title: "The payment arrived in another token",
        text: `This order takes ${order.token.symbol} only. Contact the shop about the payment.`,
      };
    case "expired":
      return {
        title: "No payment arrived",
        text: "The payment link closed and nothing arrived for this order. Start a new payment to buy it.",
      };
  }
}

export function PaymentProblem({ order, problem, startingAgain, onPayAgain }: PaymentProblemProps) {
  const { title, text } = describe(order, problem);

  return (
    <Sheet offset="pink" className="p-6 md:p-8">
      <h1 className="text-3xl font-extrabold font-stretch-expanded">{title}</h1>
      <p className="mt-2 leading-relaxed text-ink-muted">{text}</p>

      {problem === "expired" && (
        <Button className="mt-6" busy={startingAgain} onClick={onPayAgain}>
          {startingAgain ? "Opening checkout…" : "Start a new payment"}
        </Button>
      )}
    </Sheet>
  );
}
