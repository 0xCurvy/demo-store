/** Which screen the completion page shows for an order. */
import type { OrderView } from "@api";

export type CompletionScreen =
  | "waiting"
  | "confirming"
  | "link-closed"
  | "paid"
  | "underpaid"
  | "wrong-token"
  | "expired";

export function completionScreen(order: OrderView, nowSeconds: number): CompletionScreen {
  switch (order.status) {
    case "paid":
      return "paid";
    case "confirming":
      return "confirming";
    case "underpaid":
      return "underpaid";
    case "wrong_token":
      return "wrong-token";
    case "expired":
      return "expired";

    case "processing": {
      const latest = order.attempts.at(-1);

      // The link closed, but a payment can still land: the shop keeps looking for an hour.
      return latest && latest.expiry <= nowSeconds ? "link-closed" : "waiting";
    }
  }
}

/** A fresh payment makes sense only while nothing has been found and nothing paid. */
export function canPayAgain(order: OrderView): boolean {
  return order.status === "processing" || order.status === "expired";
}
