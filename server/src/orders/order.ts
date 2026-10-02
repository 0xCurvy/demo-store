/**
 * An order and its payment attempts, as the shop stores them.
 *
 * One order can have several attempts: a fresh one is created after a payment Curvy could not
 * take, or after a link expired. Each attempt keeps ONE opaque payment record from the SDK's
 * `serializePaymentRecord`, stored whole. Statuses, transaction hashes and amounts are read from
 * that record, never kept beside it.
 */
import type { Address, Hex } from "viem";
import type { Download } from "./download.js";

/**
 * Where a payment attempt stands.
 *
 * - `processing`: nothing has paid it yet.
 * - `confirming`: the payment is on chain and waiting for enough confirmations.
 * - `paid`: the payment is confirmed. The order can ship.
 * - `underpaid` / `wrong_token`: something arrived, but not what the order asked for.
 * - `expired`: nothing arrived before the link closed (plus a grace period).
 */
export type AttemptStatus =
  | "processing"
  | "confirming"
  | "paid"
  | "underpaid"
  | "wrong_token"
  | "expired";

export interface Attempt {
  number: number;
  /** One value from `serializePaymentRecord`. Keep it whole: later SDK versions add fields. */
  record: string;
  createdAt: string;
  /** Nothing paid it before its link closed, plus the grace period. */
  expired: boolean;
  /** Whether the last check reached the chain. An attempt only expires after one did. */
  lastCheckOk: boolean;
  /** When the shop last checked this attempt on chain (ms since epoch). */
  checkedAt: number;
}

export interface Order {
  id: Hex;
  productId: string;
  productName: string;
  /** In US dollars, as a decimal string. */
  price: string;
  token: { address: Address; symbol: string; decimals: number };
  /** What the buyer pays, in token base units (a decimal string). */
  amount: string;
  status: AttemptStatus;
  attempts: Attempt[];
  createdAt: string;
  paidAt: string | null;
  /** Set once, in the same write that first marks the order paid. */
  fulfilledAt: string | null;
  /** The one-time link to the file, issued in that same write. */
  download: Download | null;
}

/** A payment can land shortly after its link closes, so the shop keeps looking this much longer. */
export const GRACE_PERIOD_SECONDS = 60 * 60;

/** Attempts the shop keeps checking: unpaid ones, and ones a full payment can still fix. */
export const OPEN_STATUSES: readonly AttemptStatus[] = [
  "processing",
  "confirming",
  "underpaid",
  "wrong_token",
];

const ORDER_ID = /^0x[0-9a-f]{64}$/;

export function isOrderId(value: unknown): value is Hex {
  return typeof value === "string" && ORDER_ID.test(value);
}
