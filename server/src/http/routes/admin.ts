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
import { adminAgentPaymentView, adminOrderView } from "../order-views.js";
import { requireShop, type ShopState } from "../shop-state.js";
import type { Shop } from "../../shop.js";

const RECENT_ORDERS = 100;

/** Agent payments, newest first, with what the confirmed ones brought in. */
export async function agentsOverview(agents: Shop["agents"]): Promise<AdminOverview["agents"]> {
  const availability = await agents.availability();

  if ("unavailable" in availability) {
    return { payments: [], confirmed: 0, netReceived: "0", unavailable: availability.unavailable };
  }

  const payments = (await agents.list()).sort((left, right) => right.createdAt - left.createdAt);
  const confirmed = payments.filter((payment) => payment.status === "confirmed");
  const net = confirmed.reduce((sum, payment) => sum + BigInt(payment.netAmount ?? "0"), 0n);

  return {
    payments: payments.map(adminAgentPaymentView),
    confirmed: confirmed.length,
    netReceived: net.toString(),
    unavailable: null,
  };
}

export function adminRoutes(state: ShopState, adminToken: string | null): Router {
  const router = Router();

  router.use("/api/admin", requireAdmin(adminToken));

  router.get("/api/admin/overview", async (_request, response) => {
    const shop = requireShop(state);
    const { settings, signer, repository, orders } = shop;
    const recent = await repository.recent(RECENT_ORDERS);
    const paid = recent.filter((order) => order.status === "paid");
    const paidNet = paid.reduce((sum, order) => sum + netReceived(order), 0n);
    const agents = await agentsOverview(shop.agents);

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
      agents,
    } satisfies AdminOverview);
  });

  router.post("/api/admin/check-payments", async (_request, response) => {
    const summary = await requireShop(state).reconciler.checkOpenOrders();

    response.json(summary satisfies PaymentCheckRun);
  });

  return router;
}
