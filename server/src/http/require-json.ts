/**
 * POST routes accept only JSON. A form on another site cannot send `application/json` without a
 * CORS preflight, which this server never answers, so it cannot create orders in a buyer's name.
 */
import type { RequestHandler } from "express";
import { ShopError } from "../errors.js";

export const requireJson: RequestHandler = (request, _response, next) => {
  if (!request.is("application/json")) {
    throw new ShopError(415, "send a JSON body (content-type: application/json)");
  }

  next();
};

/** The parsed JSON body as an object, or an empty one. */
export function body(request: { body?: unknown }): Record<string, unknown> {
  const value = request.body;

  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
