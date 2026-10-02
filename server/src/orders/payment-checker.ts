/**
 * Checks one payment attempt on chain with the SDK's `verifyPayment` and applies the result.
 * A payment already found is re-read by its transaction; anything else is scanned for.
 */
import { type PaymentVerification, PaymentVerificationError } from "@0xcurvy/payments-sdk/merchant";
import type { Hex } from "viem";
import type { Payments } from "../payments/payments.js";
import type { OrderRepository } from "../storage/order-repository.js";
import {
  applyVerification,
  attemptStatus,
  forgetPayment,
  foundTxHash,
  readRecord,
  writeRecord,
} from "./attempt.js";
import type { Attempt, Order } from "./order.js";
import { updateOrderStatus } from "./order-status.js";

export interface PaymentCheckerDeps {
  repository: OrderRepository;
  payments: Payments;
  confirmations: number;
  onPaid: (order: Order) => void;
  now?: () => number;
}

export type PaymentChecker = ReturnType<typeof createPaymentChecker>;

export function createPaymentChecker(deps: PaymentCheckerDeps) {
  const { repository, payments, onPaid } = deps;
  const now = deps.now ?? Date.now;

  // Later scans start this many blocks behind the last scanned head, so a shallow reorg
  // cannot hide a payment.
  const rescanMargin = BigInt(Math.max(deps.confirmations, 64));

  function verify(attempt: Attempt, txHash: Hex | null): Promise<PaymentVerification> {
    const { payment, fromBlock } = readRecord(attempt);

    return payments.verifyPayment(payment.intent, txHash ? { txHash } : { fromBlock });
  }

  /** Nothing better than what is recorded sits below `head`, so the next scan can start near it. */
  function moveScanStart(attempt: Attempt, verification: PaymentVerification | null, head: bigint) {
    const found = verification?.status === "paid" || verification?.status === "confirming";

    if (found || head <= rescanMargin) return;

    const next = head - rescanMargin;

    if (next > readRecord(attempt).fromBlock) writeRecord(attempt, { fromBlock: next });
  }

  async function markCheckFailed(orderId: Hex, index: number) {
    await repository.update(orderId, (order) => {
      const attempt = order.attempts[index];

      if (!attempt) return;

      attempt.lastCheckOk = false;
      attempt.checkedAt = now();
    });
  }

  /** Check attempt `index` of an order. `head` is a block number read before the check started. */
  async function checkAttempt(orderId: Hex, index: number, head: bigint): Promise<void> {
    const snapshot = await repository.get(orderId);
    const attempt = snapshot?.attempts[index];

    if (!attempt) return;

    const before = { status: attemptStatus(attempt), txHash: foundTxHash(attempt) };
    const knownTx = before.status === "confirming" ? before.txHash : null;
    let verification: PaymentVerification | null;

    try {
      verification = await verify(attempt, knownTx);
    } catch (error) {
      // A known transaction the chain no longer has was reorged out: treated as not found below.
      const reorged =
        knownTx !== null &&
        error instanceof PaymentVerificationError &&
        error.code === "TX_NOT_FOUND";

      if (!reorged) {
        await markCheckFailed(orderId, index);
        throw error;
      }

      verification = null;
    }

    const updated = await repository.update(orderId, (order) => {
      const current = order.attempts[index];

      if (!current) return false;

      current.lastCheckOk = true;
      current.checkedAt = now();

      // A buyer's transaction hint may have recorded this attempt meanwhile: that result stands.
      const changedMeanwhile =
        attemptStatus(current) !== before.status || foundTxHash(current) !== before.txHash;

      if (changedMeanwhile) return false;

      if (knownTx !== null && (verification === null || verification.status === "not_found")) {
        forgetPayment(current);

        return updateOrderStatus(order);
      }

      const changed = verification !== null && applyVerification(current, verification);

      if (knownTx === null) moveScanStart(current, verification, head);

      return changed && updateOrderStatus(order);
    });

    if (updated?.result) onPaid(updated.order);
  }

  return { checkAttempt, verify };
}
