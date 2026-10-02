/** Orders as the API shows them: the buyer sees their own order, the admin page sees the details. */
import { attemptStatus, readRecord } from "../orders/attempt.js";
import type { Attempt, Order } from "../orders/order.js";
import { netReceived } from "../orders/order-status.js";
import type { AdminAttemptView, AdminOrderView, AttemptView, OrderView } from "./contract.js";

function attemptView(attempt: Attempt): AttemptView {
  const { payment, verification } = readRecord(attempt);
  const found = verification?.payment ?? null;

  return {
    number: attempt.number,
    status: attemptStatus(attempt),
    ephemeralKeyX: payment.intent.ephemeralKeyX,
    expiry: payment.intent.expiry,
    txHash: found?.txHash ?? null,
    netAmount: found?.netAmount.toString() ?? null,
    minimumNetAmount: found?.minimumNetAmount.toString() ?? null,
  };
}

export function orderView(order: Order, chainId: number): OrderView {
  return {
    id: order.id,
    productName: order.productName,
    priceCents: order.priceCents,
    chainId,
    token: order.token,
    amount: order.amount,
    status: order.status,
    attempts: order.attempts.map(attemptView),
    createdAt: order.createdAt,
    paidAt: order.paidAt,
  };
}

export function adminOrderView(
  order: Order,
  chainId: number,
  checkoutUrl: (attempt: Attempt) => string,
): AdminOrderView {
  const attempts = order.attempts.map((attempt): AdminAttemptView => {
    const { verification, fromBlock } = readRecord(attempt);
    const found = verification?.payment ?? null;

    return {
      ...attemptView(attempt),
      createdAt: attempt.createdAt,
      checkedAt: attempt.checkedAt ? new Date(attempt.checkedAt).toISOString() : null,
      lastCheckOk: attempt.lastCheckOk,
      noteId: found?.noteId.toString() ?? null,
      confirmations: found?.confirmations.toString() ?? null,
      committed: found?.committed ?? null,
      siblingNoteIds: found?.siblingNoteIds.map(String) ?? [],
      fromBlock: fromBlock.toString(),
      checkoutUrl: checkoutUrl(attempt),
    };
  });

  return {
    ...orderView(order, chainId),
    fulfilledAt: order.fulfilledAt,
    netReceived: netReceived(order).toString(),
    attempts,
  };
}
