/**
 * Every error becomes a JSON `ApiError`. RPC errors are never echoed: they can contain the RPC URL
 * and its API key.
 */
import { PaymentVerificationError } from "@0xcurvy/payments-sdk/merchant";
import type { ErrorRequestHandler } from "express";
import { BaseError } from "viem";
import { SetupError, ShopError } from "../errors.js";
import type { Log } from "../log.js";
import type { ApiError } from "./contract.js";

type ErrorResponse = { status: number; body: ApiError };

/** express.json() marks the errors it throws with a `type`. */
function bodyParserError(error: unknown): string | null {
  return typeof error === "object" && error !== null && "type" in error ? String(error.type) : null;
}

function toResponse(error: unknown, log: Log): ErrorResponse {
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

  if (bodyParserError(error) === "entity.parse.failed") {
    return { status: 400, body: { error: "the body must be JSON" } };
  }

  if (bodyParserError(error) === "entity.too.large") {
    return { status: 413, body: { error: "the body is too large" } };
  }

  if (error instanceof BaseError) {
    log.error(`Chain RPC request failed: ${error.shortMessage}`);

    return { status: 502, body: { error: "the chain RPC did not answer; try again" } };
  }

  log.error(error instanceof Error ? (error.stack ?? error.message) : String(error));

  return { status: 500, body: { error: "internal error" } };
}

export function errorHandler(log: Log): ErrorRequestHandler {
  return (error, _request, response, _next) => {
    const { status, body } = toResponse(error, log);

    response.status(status).json(body);
  };
}
