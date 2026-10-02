/** How each order status is named and coloured on every page. */
import type { OrderStatus } from "@api";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  processing: "Waiting for payment",
  confirming: "Confirming",
  paid: "Paid",
  underpaid: "Underpaid",
  wrong_token: "Wrong token",
  expired: "Expired",
};

export type StatusTone = "done" | "waiting" | "problem";

export const STATUS_TONES: Record<OrderStatus, StatusTone> = {
  processing: "waiting",
  confirming: "waiting",
  paid: "done",
  underpaid: "problem",
  wrong_token: "problem",
  expired: "problem",
};

/** Nothing more will happen to an order in these statuses without the buyer or the shop. */
export function isSettled(status: OrderStatus): boolean {
  return (
    status === "paid" || status === "underpaid" || status === "wrong_token" || status === "expired"
  );
}
