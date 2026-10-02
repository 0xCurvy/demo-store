import type { OrderView } from "@api";
import { errorMessage } from "@/shared/api/client";
import { Notice } from "@/shared/ui/Notice";
import { OverprintLoader } from "@/shared/ui/OverprintLoader";
import { isNoOrder } from "../hooks/useCheckoutReturn";
import { completionScreen } from "../utils/completion-screen";
import { NoOrder } from "./NoOrder";
import { PaymentProblem } from "./PaymentProblem";
import { Receipt } from "./Receipt";
import { WaitingPanel } from "./WaitingPanel";

type CompletionContentProps = {
  order: OrderView | undefined;
  /** When the shop last reported on the order (ms since epoch). */
  checkedAt: number;
  error: Error | null;
  retrying: boolean;
  startingAgain: boolean;
  onPayAgain: (latestEphemeralKeyX: string) => void;
};

/** The one screen that fits where the order stands. */
export function CompletionContent(props: CompletionContentProps) {
  const { order, checkedAt, error, retrying, startingAgain, onPayAgain } = props;

  if (retrying) return <OverprintLoader label="Starting a new payment" />;

  if (isNoOrder(error)) return <NoOrder />;

  if (!order && error) {
    return (
      <Notice tone="warning" title="The order did not load">
        {errorMessage(error)}
      </Notice>
    );
  }

  if (!order) return <OverprintLoader label="Loading your order" />;

  const screen = completionScreen(order, Math.floor(checkedAt / 1_000));
  const payAgain = () => onPayAgain(order.attempts.at(-1)?.ephemeralKeyX ?? "");

  switch (screen) {
    case "paid":
      return <Receipt order={order} />;
    case "waiting":
    case "confirming":
    case "link-closed":
      return (
        <WaitingPanel
          order={order}
          stage={screen}
          startingAgain={startingAgain}
          onPayAgain={payAgain}
        />
      );
    case "underpaid":
    case "wrong-token":
    case "expired":
      return (
        <PaymentProblem
          order={order}
          problem={screen}
          startingAgain={startingAgain}
          onPayAgain={payAgain}
        />
      );
  }
}
