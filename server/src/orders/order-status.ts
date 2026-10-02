/** Rules for an order as a whole, derived from its attempts. */
import { attemptStatus, readRecord } from "./attempt.js";
import { issueDownload } from "./download.js";
import { type Attempt, type AttemptStatus, OPEN_STATUSES, type Order } from "./order.js";

/** The order shows its most advanced attempt: one paid attempt pays the order. */
const STATUS_ORDER: readonly AttemptStatus[] = [
  "paid",
  "confirming",
  "underpaid",
  "wrong_token",
  "processing",
  "expired",
];

/**
 * Recompute the order's status. Returns true when this call marked the order paid for the first
 * time: that is the one moment the order is fulfilled, recorded as `fulfilledAt` and the download
 * link issued, in the same write.
 */
export function updateOrderStatus(order: Order, now = new Date()): boolean {
  const statuses = new Set(order.attempts.map(attemptStatus));

  order.status = STATUS_ORDER.find((status) => statuses.has(status)) ?? "processing";

  if (order.status !== "paid" || order.fulfilledAt !== null) return false;

  order.paidAt ??= now.toISOString();
  order.fulfilledAt = now.toISOString();
  order.download ??= issueDownload(now);

  return true;
}

/** Whether the shop still has something to check for this order. */
export function isOrderOpen(order: Order): boolean {
  if (order.status === "paid") return false;

  return order.attempts.some((attempt) => OPEN_STATUSES.includes(attemptStatus(attempt)));
}

/** A fresh attempt is allowed only while nothing has been found and nothing paid. */
export function canStartAttempt(order: Order): boolean {
  return order.status === "processing" || order.status === "expired";
}

export function latestAttempt(order: Order): Attempt | undefined {
  return order.attempts.at(-1);
}

/** What the shop received after Curvy's fees, across attempts that paid something. */
export function netReceived(order: Order): bigint {
  let total = 0n;

  for (const attempt of order.attempts) {
    const status = attemptStatus(attempt);
    const net = readRecord(attempt).verification?.payment?.netAmount;
    const counts = status === "paid" || status === "confirming" || status === "underpaid";

    if (net !== undefined && counts) total += net;
  }

  return total;
}
