/**
 * GET /api/health: whether the shop is set up and can reach its chain. Shows no secrets and never
 * the RPC URL.
 */
import { Router } from "express";
import { describeError } from "../../log.js";
import type { ShopState } from "../shop-state.js";

export function healthRoutes(state: ShopState): Router {
  const router = Router();

  router.get("/api/health", async (_request, response) => {
    if (!state.ok) {
      response.status(503).json({ ok: false, setUp: false, problems: state.problems });

      return;
    }

    const { settings, network } = state.value;

    try {
      await network.ensureRightChain();

      const token = await network.token();

      response.json({ ok: true, setUp: true, chainId: settings.chainId, token });
    } catch (error) {
      response.status(503).json({ ok: false, setUp: true, error: describeError(error) });
    }
  });

  return router;
}
