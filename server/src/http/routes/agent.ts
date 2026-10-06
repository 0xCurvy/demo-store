/**
 * Wallpapers for agents, over x402.
 *
 * GET /api/agent                    the catalogue: resources, prices, network, schemes, and the steps in words
 * GET /api/agent/wallpapers         the same
 * GET /api/agent/wallpapers/:id     402 with PAYMENT-REQUIRED until paid; then the 4K PNG with PAYMENT-RESPONSE
 */
import { createReadStream, statSync } from "node:fs";
import { join } from "node:path";
import { Router } from "express";
import { downloadName, findProduct } from "../../catalog/products.js";
import { ShopError } from "../../errors.js";
import { describeError } from "../../log.js";
import { AGENT_PATH, AGENT_WALLPAPERS_PATH, agentCatalogue } from "../../x402/catalogue.js";
import { requireShop, type ShopState } from "../shop-state.js";

export function agentRoutes(state: ShopState, wallpapersDir: string): Router {
  const router = Router();

  router.get([AGENT_PATH, AGENT_WALLPAPERS_PATH], async (_request, response) => {
    const shop = requireShop(state);
    const token = await shop.network.token();

    response.set("Cache-Control", "no-store");
    response.json(agentCatalogue(shop.settings, token, await shop.agents.availability()));
  });

  router.get(`${AGENT_WALLPAPERS_PATH}/:id`, async (request, response) => {
    const shop = requireShop(state);
    const product = findProduct(request.params.id);

    if (!product) throw new ShopError(404, "there is no such wallpaper", "NO_RESOURCE");

    const token = await shop.network.token();
    let result;

    try {
      result = await shop.agents.charge(
        { method: request.method, url: request.originalUrl, headers: request.headers },
        product,
        token.decimals,
      );
    } catch (error) {
      throw new ShopError(
        503,
        `agent payments are not available: ${describeError(error)}`,
        "AGENTS_UNAVAILABLE",
      );
    }

    if (result.status === "payment-required") {
      response.status(402).set(result.response.headers).json(result.response.body);

      return;
    }

    const file = join(wallpapersDir, product.file);
    let size: number;

    try {
      size = statSync(file).size;
    } catch {
      throw new ShopError(
        500,
        "The file is missing on the server. Contact the shop.",
        "FILE_MISSING",
      );
    }

    // Paid: the file is the response. Shielding into the shop's note continues after it is sent.
    void shop.agents.settle(result.payment.payTo);

    response.set({
      ...result.headers,
      "Content-Type": "image/png",
      "Content-Length": String(size),
      "Content-Disposition": `attachment; filename="${downloadName(product)}"`,
    });

    createReadStream(file).pipe(response);
  });

  return router;
}
