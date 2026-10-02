/**
 * The order in this browser's session, for the completion page that Curvy checkout returns to.
 *
 * GET  /api/orders/current            the order; `?refresh=1` checks the chain first
 * POST /api/orders/current/tx-hash    { txHash } from the return URL: a hint, checked on chain
 * POST /api/orders/current/attempts   { latestEphemeralKeyX } a fresh payment for the latest attempt
 */
import { Router } from "express";
import type { FreshAttempt } from "../contract.js";
import { orderIdFromCookie } from "../order-cookie.js";
import { orderView } from "../order-views.js";
import { body, requireJson } from "../require-json.js";
import { requireShop, type ShopState } from "../shop-state.js";

export function currentOrderRoutes(state: ShopState): Router {
  const router = Router();

  router.get("/api/orders/current", async (request, response) => {
    const shop = requireShop(state);
    const id = orderIdFromCookie(request);
    const refresh = request.query.refresh === "1";
    const order = refresh ? await shop.orders.refresh(id) : await shop.orders.getOrder(id);

    response.json(orderView(order, shop.settings.chainId));
  });

  router.post("/api/orders/current/tx-hash", requireJson, async (request, response) => {
    const shop = requireShop(state);
    const id = orderIdFromCookie(request);
    const order = await shop.orders.acceptTxHash(id, body(request).txHash);

    response.json(orderView(order, shop.settings.chainId));
  });

  router.post("/api/orders/current/attempts", requireJson, async (request, response) => {
    const shop = requireShop(state);
    const id = orderIdFromCookie(request);
    const checkoutUrl = await shop.orders.startAttempt(id, body(request).latestEphemeralKeyX);

    response.status(201).json({ checkoutUrl } satisfies FreshAttempt);
  });

  return router;
}
