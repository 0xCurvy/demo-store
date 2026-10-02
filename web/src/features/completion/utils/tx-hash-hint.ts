/** Hands the transaction hash from checkout's return link to the shop, which checks it on chain. */
import type { OrderView } from "@api";
import { ApiRequestError, api } from "@/shared/api/client";

/** Answers that retrying cannot change. Anything else (RPC lag, a slow network) is tried again. */
const FINAL_CODES = new Set([
  "UNRELATED",
  "NOT_A_SHIELD",
  "REVERTED",
  "INVALID_INPUT",
  "WRONG_CHAIN",
]);

export type HintResult =
  /** The transaction is not on chain yet: send it again on the next check. */
  | { kind: "pending" }
  /** The shop used it; the order may have moved on. */
  | { kind: "used"; order: OrderView }
  /** The shop cannot use it. It keeps scanning the chain for the order anyway. */
  | { kind: "rejected"; reason: string };

export async function sendHint(txHash: string): Promise<HintResult> {
  try {
    const order = await api.post<OrderView>("/api/orders/current/tx-hash", { txHash });

    return order.status === "processing" ? { kind: "pending" } : { kind: "used", order };
  } catch (error) {
    const final = error instanceof ApiRequestError && FINAL_CODES.has(error.code ?? "");

    if (final) return { kind: "rejected", reason: error.message };

    return { kind: "pending" };
  }
}
