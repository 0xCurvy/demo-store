/**
 * The buyer's order travels in a first-party cookie, so the completion page knows which order to
 * show. Curvy checkout never calls the shop's API, and the order id never appears in a URL.
 */
import type { Request, Response } from "express";
import { ShopError } from "../errors.js";

const COOKIE = "curvy_demo_order";
const ONE_DAY_MS = 86_400_000;

export function setOrderCookie(response: Response, orderId: string, secure: boolean): void {
  response.cookie(COOKIE, orderId, { httpOnly: true, sameSite: "lax", secure, maxAge: ONE_DAY_MS });
}

export function orderIdFromCookie(request: Request): string {
  for (const part of request.headers.cookie?.split(";") ?? []) {
    const [name, value] = part.trim().split("=");

    if (name === COOKIE && value) return decodeURIComponent(value).toLowerCase();
  }

  throw new ShopError(401, "there is no order in this browser", "NO_ORDER");
}
