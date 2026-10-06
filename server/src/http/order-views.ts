/** Orders as the API shows them: the buyer sees their own order, the admin page sees the details. */
import { attemptStatus, readRecord } from "../orders/attempt.js";
import type { Attempt, Order } from "../orders/order.js";
import { netReceived } from "../orders/order-status.js";
import type { X402Payment } from "@0xcurvy/payments-sdk/x402/merchant";
import type {
  AdminAgentPaymentView,
  AdminAttemptView,
  AdminOrderView,
  AttemptView,
  OrderView,
} from "./contract.js";

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
    price: order.price,
    chainId,
    token: order.token,
    amount: order.amount,
    status: order.status,
    attempts: order.attempts.map(attemptView),
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    download: order.download
      ? {
          url: `/download/${order.download.token}`,
          expiresAt: order.download.expiresAt,
          downloadedAt: order.download.downloadedAt,
        }
      : null,
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

  const { download, ...view } = orderView(order, chainId);

  return {
    ...view,
    fulfilledAt: order.fulfilledAt,
    downloadedAt: download?.downloadedAt ?? null,
    netReceived: netReceived(order).toString(),
    attempts,
  };
}

export function adminAgentPaymentView(payment: X402Payment): AdminAgentPaymentView {
  return {
    payTo: payment.payTo,
    status: payment.status,
    resource: payment.resource,
    amount: payment.amount,
    netAmount: payment.netAmount ?? null,
    payer: payment.payer ?? null,
    settleTxHash: payment.settleTxHash ?? null,
    shieldTxHash: payment.shieldTxHash ?? null,
    createdAt: new Date(payment.createdAt).toISOString(),
    error: payment.error ?? null,
  };
}
