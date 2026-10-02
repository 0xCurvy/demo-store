/**
 * GET  /api/shop     what the shop sells, on which network (or what is missing from its setup)
 * POST /api/orders   { productId } → a new order and the Curvy checkout URL to send the buyer to
 */
import { Router } from "express";
import { PRODUCTS, SERIES_SIZE } from "../../catalog/products.js";
import type { CreatedOrder, ShopView } from "../contract.js";
import { setOrderCookie } from "../order-cookie.js";
import { body, requireJson } from "../require-json.js";
import { requireShop, type ShopState } from "../shop-state.js";

export function shopRoutes(state: ShopState): Router {
  const router = Router();

  router.get("/api/shop", async (_request, response) => {
    if (!state.ok) {
      response.json({ ready: false, problems: state.problems } satisfies ShopView);

      return;
    }

    const { settings, network } = state.value;
    const token = await network.token();

    response.json({
      ready: true,
      products: PRODUCTS.map(({ file: _file, ...product }) => product),
      seriesSize: SERIES_SIZE,
      chainId: settings.chainId,
      token: { address: settings.tokenAddress, ...token },
    } satisfies ShopView);
  });

  router.post("/api/orders", requireJson, async (request, response) => {
    const shop = requireShop(state);
    const { order, checkoutUrl } = await shop.orders.createOrder(body(request).productId);
    const secure = shop.settings.merchantOrigin.startsWith("https://");

    setOrderCookie(response, order.id, secure);
    response.status(201).json({ orderId: order.id, checkoutUrl } satisfies CreatedOrder);
  });

  return router;
}
