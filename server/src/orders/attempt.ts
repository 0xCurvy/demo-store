/**
 * Reading and updating one payment attempt. These functions change the attempt in memory; the
 * repository applies them inside one write, so two checks can never overwrite each other.
 */
import {
  type PaymentRecord,
  type PaymentVerification,
  parsePaymentRecord,
  serializePaymentRecord,
} from "@0xcurvy/payments-sdk/merchant";
import type { Hex } from "viem";
import { type Attempt, type AttemptStatus, GRACE_PERIOD_SECONDS, OPEN_STATUSES } from "./order.js";

/** How far a status is toward paid. A different note replaces the recorded one only if it ranks higher. */
const PROGRESS: Record<AttemptStatus, number> = {
  expired: 0,
  processing: 0,
  underpaid: 1,
  wrong_token: 1,
  confirming: 2,
  paid: 3,
};

export function readRecord(attempt: Attempt): PaymentRecord {
  return parsePaymentRecord(attempt.record);
}

export function writeRecord(attempt: Attempt, change: Partial<PaymentRecord>): void {
  attempt.record = serializePaymentRecord({ ...readRecord(attempt), ...change });
}

export function attemptStatus(attempt: Attempt): AttemptStatus {
  if (attempt.expired) return "expired";

  const { verification } = readRecord(attempt);

  return verification === null || verification.status === "not_found"
    ? "processing"
    : verification.status;
}

/** The shield transaction of the payment found for this attempt, if any. */
export function foundTxHash(attempt: Attempt): Hex | null {
  return readRecord(attempt).verification?.payment?.txHash ?? null;
}

/** Forget the found payment, so the next check scans for it again (after a chain reorg). */
export function forgetPayment(attempt: Attempt): void {
  writeRecord(attempt, { verification: null });
}

/**
 * Apply a `verifyPayment` result. A paid attempt stays paid, `not_found` never erases a found
 * payment, and a different payment replaces the recorded one only if it gets further toward paid.
 * Returns whether the attempt changed.
 */
export function applyVerification(attempt: Attempt, verification: PaymentVerification): boolean {
  const status = attemptStatus(attempt);
  const payment = verification.payment;

  if (status === "paid" || verification.status === "not_found" || !payment) return false;

  const recordedNote = readRecord(attempt).verification?.payment?.noteId;
  const sameNote = recordedNote === payment.noteId;

  if (!sameNote && PROGRESS[verification.status] <= PROGRESS[status]) return false;

  // A payment that landed after the attempt expired still pays it.
  attempt.expired = false;
  writeRecord(attempt, { verification });

  return true;
}

/** Whether the shop should still look for this attempt's payment on chain. */
export function isWorthChecking(attempt: Attempt, nowSeconds: number): boolean {
  const status = attemptStatus(attempt);

  if (!OPEN_STATUSES.includes(status)) return false;

  // A payment already found is never given up on.
  if (status === "confirming" || status === "processing") return true;

  return nowSeconds <= readRecord(attempt).payment.intent.expiry + GRACE_PERIOD_SECONDS;
}

/**
 * Expire an unpaid attempt once its link closed and the grace period passed, but only after a
 * check actually reached the chain. Returns whether it expired the attempt.
 */
export function expireIfOverdue(attempt: Attempt, nowSeconds: number): boolean {
  if (attemptStatus(attempt) !== "processing" || !attempt.lastCheckOk) return false;

  if (nowSeconds <= readRecord(attempt).payment.intent.expiry + GRACE_PERIOD_SECONDS) return false;

  attempt.expired = true;

  return true;
}
