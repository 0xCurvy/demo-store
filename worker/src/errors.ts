/** Every error becomes a JSON `ApiError`, as on the Node server. RPC errors are never echoed. */
import { PaymentVerificationError } from "@0xcurvy/payments-sdk/merchant";
import { BaseError } from "viem";
import { SetupError, ShopError } from "../../server/src/errors.js";
import type { ApiError } from "../../server/src/http/contract.js";
import type { Log } from "../../server/src/log.js";

export type ErrorResponse = { status: number; body: ApiError };

export function toErrorResponse(error: unknown, log: Log): ErrorResponse {
  if (error instanceof SetupError) {
    return {
      status: error.status,
      body: { error: error.message, code: error.code, problems: error.problems },
    };
  }

  if (error instanceof ShopError) {
    return { status: error.status, body: { error: error.message, code: error.code } };
  }

  if (error instanceof PaymentVerificationError) {
    const status = error.code === "TX_NOT_FOUND" ? 409 : 400;

    return { status, body: { error: error.message, code: error.code } };
  }

  if (error instanceof BaseError) {
    log.error(`Chain RPC request failed: ${error.shortMessage}`);

    return { status: 502, body: { error: "the chain RPC did not answer; try again" } };
  }

  log.error(error instanceof Error ? (error.stack ?? error.message) : String(error));

  return { status: 500, body: { error: "internal error" } };
}
