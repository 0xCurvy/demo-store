/**
 * The shop owner's view. Both routes need `Authorization: Bearer <ADMIN_TOKEN>`.
 *
 * GET  /api/admin/overview         settings, totals and the latest orders with every attempt
 * POST /api/admin/check-payments   run the background payment check now
 */
import { Router } from "express";
import { netReceived } from "../../orders/order-status.js";
import { requireAdmin } from "../admin-auth.js";
import type { AdminOverview, PaymentCheckRun } from "../contract.js";
import { adminOrderView } from "../order-views.js";
import { requireShop, type ShopState } from "../shop-state.js";

const RECENT_ORDERS = 100;

export function adminRoutes(state: ShopState, adminToken: string | null): Router {
  const router = Router();

  router.use("/api/admin", requireAdmin(adminToken));

  router.get("/api/admin/overview", async (_request, response) => {
    const shop = requireShop(state);
    const { settings, signer, repository, orders } = shop;
    const recent = await repository.recent(RECENT_ORDERS);
    const paid = recent.filter((order) => order.status === "paid");
    const paidNet = paid.reduce((sum, order) => sum + netReceived(order), 0n);

    response.json({
      settings: {
        chainId: settings.chainId,
        token: settings.tokenAddress,
        aggregator: settings.aggregatorAddress,
        checkoutUrl: settings.checkoutUrl,
        merchantOrigin: settings.merchantOrigin,
        confirmations: settings.confirmations,
        paidWhen: settings.paidWhen,
        completePath: settings.completePath,
        paymentTtlSeconds: settings.paymentTtlSeconds,
        signer: signer.signerAddress,
        signerNotAfter: signer.notAfter,
      },
      totals: {
        orders: recent.length,
        paid: paid.length,
        netReceived: paidNet.toString(),
        token: recent[0]?.token ?? null,
      },
      orders: recent.map((order) => adminOrderView(order, settings.chainId, orders.checkoutUrl)),
    } satisfies AdminOverview);
  });

  router.post("/api/admin/check-payments", async (_request, response) => {
    const summary = await requireShop(state).reconciler.checkOpenOrders();

    response.json(summary satisfies PaymentCheckRun);
  });

  return router;
}
