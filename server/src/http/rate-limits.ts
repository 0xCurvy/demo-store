/**
 * Per-visitor limits on the API, so one address cannot flood the shop with orders or keep sending it
 * to the chain. The counts live in this process's memory: a restart clears them, and several server
 * processes would each count on their own (express-rate-limit takes a shared store for that).
 */
import { isIP } from "node:net";
import type { Request, RequestHandler } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { ShopError } from "../errors.js";
import type { Log } from "../log.js";

const MINUTE_MS = 60_000;

export interface RateLimits {
  /** Every API call. Generous: an open completion page asks every 2.5 seconds. */
  api: RequestHandler;
  /** New orders and fresh payment attempts: each signs a payment the background check then follows. */
  newPayments: RequestHandler;
  /** Transaction hashes from return links: each one is looked up on chain. */
  chainChecks: RequestHandler;
}

/**
 * The visitor's address. Behind a proxy, `header` names the one the proxy fills in with it (Railway
 * sets X-Real-IP). Name only a header the proxy always overwrites: one a visitor can set would let
 * them claim a new address on every request. Without a header, the connection's own address counts.
 */
export function clientAddress(request: Request, header: string | null): string {
  const fromProxy = header ? request.get(header)?.trim() : undefined;

  if (fromProxy && isIP(fromProxy)) return fromProxy;

  return request.socket.remoteAddress ?? "unknown";
}

export function rateLimits(header: string | null, log: Log): RateLimits {
  let warnedAboutProxy = false;

  // Behind a proxy without CLIENT_IP_HEADER, every visitor arrives from the proxy's address and
  // shares one limit. Say so once, so the fix is one setting away.
  function noticeProxy(request: Request) {
    if (header || warnedAboutProxy || !request.get("x-forwarded-for")) return;

    warnedAboutProxy = true;

    log.warn(
      "Requests arrive through a proxy, so all visitors share one rate limit. Set CLIENT_IP_HEADER " +
        "to the header your host puts the visitor's address in (X-Real-IP on Railway).",
    );
  }

  function limit(count: number, windowMs: number, message: string): RequestHandler {
    return rateLimit({
      windowMs,
      limit: count,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      keyGenerator: (request) => {
        noticeProxy(request);

        // IPv6 visitors share a limit per /56, the block one home or server usually gets.
        return ipKeyGenerator(clientAddress(request, header));
      },
      handler: (_request, _response, next) => {
        next(new ShopError(429, message, "TOO_MANY_REQUESTS"));
      },
      // The address comes from clientAddress, not Express's request.ip, so its proxy check does not apply.
      validate: { xForwardedForHeader: false },
    });
  }

  return {
    api: limit(120, MINUTE_MS, "too many requests from your address; wait a minute"),
    newPayments: limit(
      10,
      10 * MINUTE_MS,
      "too many new payments from your address; try again in a few minutes",
    ),
    chainChecks: limit(30, MINUTE_MS, "too many payment checks from your address; wait a minute"),
  };
}
