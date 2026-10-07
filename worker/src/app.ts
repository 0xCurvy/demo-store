/**
 * The shop's HTTP API on Cloudflare Workers: the same routes as the Node server's Express app, on Hono. The React
 * pages are static assets served beside the Worker (see wrangler.toml); the Worker answers the API, the signer
 * list and the one-time downloads.
 */
import { timingSafeEqual } from "node:crypto";
import { Hono, type MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import { getCookie, setCookie } from "hono/cookie";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import {
  downloadName,
  findProduct,
  PRODUCTS,
  SERIES_SIZE,
} from "../../server/src/catalog/products.js";
import { SetupError, ShopError } from "../../server/src/errors.js";
import type {
  AdminOverview,
  CreatedOrder,
  FreshAttempt,
  PaymentCheckRun,
  ShopView,
} from "../../server/src/http/contract.js";
import { adminOrderView, orderView } from "../../server/src/http/order-views.js";
import { agentsOverview } from "../../server/src/http/routes/admin.js";
import { requireShop } from "../../server/src/http/shop-state.js";
import { describeError } from "../../server/src/log.js";
import { netReceived } from "../../server/src/orders/order-status.js";
import {
  AGENT_PATH,
  AGENT_WALLPAPERS_PATH,
  agentCatalogue,
} from "../../server/src/x402/catalogue.js";
import { serveDownload } from "./download.js";
import type { Env } from "./env.js";
import { toErrorResponse } from "./errors.js";
import { rustCoreReady } from "./rust-core.js";
import type { ShopDeps } from "./shop.js";

const ORDER_COOKIE = "curvy_demo_order";
const ONE_DAY_SECONDS = 86_400;
const SIGNER_LIST_PATH = "/.well-known/curvy-payments.json";
const RECENT_ORDERS = 100;

type App = Hono<{ Bindings: Env }>;

/** POST routes accept only JSON, so a form on another site cannot place orders in a buyer's name. */
const requireJson: MiddlewareHandler = async (c, next) => {
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new ShopError(415, "send a JSON body (content-type: application/json)");
  }

  await next();
};

async function jsonBody(c: {
  req: { json(): Promise<unknown> };
}): Promise<Record<string, unknown>> {
  const value = await c.req.json().catch(() => {
    throw new ShopError(400, "the body must be JSON");
  });

  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function orderIdFromCookie(c: { req: Parameters<typeof getCookie>[0]["req"] }): string {
  const id = getCookie(c as Parameters<typeof getCookie>[0], ORDER_COOKIE);

  if (!id) throw new ShopError(401, "there is no order in this browser", "NO_ORDER");

  return id.toLowerCase();
}

function requireAdmin(adminToken: string | null): MiddlewareHandler {
  return async (c, next) => {
    if (adminToken === null) {
      throw new ShopError(503, "set ADMIN_TOKEN to open the admin page", "ADMIN_DISABLED");
    }

    const expected = Buffer.from(`Bearer ${adminToken}`);
    const actual = Buffer.from(c.req.header("authorization") ?? "");

    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new ShopError(401, "the admin token is not right", "UNAUTHORIZED");
    }

    await next();
  };
}

export function createApp(deps: ShopDeps): App {
  const { state, signerList, adminToken, log } = deps;
  const app: App = new Hono();

  app.onError((error, c) => {
    const { status, body } = toErrorResponse(error, log);

    return c.json(body, status as ContentfulStatusCode);
  });

  // The SDK's Rust core must be loaded before the first payment request is derived or verified.
  app.use("/api/*", async (_c, next) => {
    await rustCoreReady();
    await next();
  });

  app.use("/api/*", bodyLimit({ maxSize: 16 * 1024 }));

  app.options(SIGNER_LIST_PATH, (c) => {
    c.header("Access-Control-Allow-Origin", "*");
    c.header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    c.header("Access-Control-Max-Age", "86400");

    return c.body(null, 204);
  });

  app.get(SIGNER_LIST_PATH, (c) => {
    c.header("Access-Control-Allow-Origin", "*");
    c.header("Cache-Control", "public, max-age=60");

    if (!signerList.ok) throw new SetupError(signerList.problems);

    return c.json(signerList.value);
  });

  app.get("/api/shop", async (c) => {
    if (!state.ok) return c.json({ ready: false, problems: state.problems } satisfies ShopView);

    const { settings, network } = state.value;
    const token = await network.token();

    return c.json({
      ready: true,
      products: PRODUCTS.map(({ file: _file, ...product }) => product),
      seriesSize: SERIES_SIZE,
      chainId: settings.chainId,
      token: { address: settings.tokenAddress, ...token },
    } satisfies ShopView);
  });

  app.post("/api/orders", requireJson, async (c) => {
    const shop = requireShop(state);
    const { order, checkoutUrl } = await shop.orders.createOrder((await jsonBody(c)).productId);

    setCookie(c, ORDER_COOKIE, order.id, {
      httpOnly: true,
      sameSite: "Lax",
      secure: shop.settings.merchantOrigin.startsWith("https://"),
      path: "/",
      maxAge: ONE_DAY_SECONDS,
    });

    return c.json({ orderId: order.id, checkoutUrl } satisfies CreatedOrder, 201);
  });

  app.get("/api/orders/current", async (c) => {
    const shop = requireShop(state);
    const id = orderIdFromCookie(c);
    const refresh = c.req.query("refresh") === "1";
    const order = refresh ? await shop.orders.refresh(id) : await shop.orders.getOrder(id);

    return c.json(orderView(order, shop.settings.chainId));
  });

  app.post("/api/orders/current/tx-hash", requireJson, async (c) => {
    const shop = requireShop(state);
    const id = orderIdFromCookie(c);
    const order = await shop.orders.acceptTxHash(id, (await jsonBody(c)).txHash);

    return c.json(orderView(order, shop.settings.chainId));
  });

  app.post("/api/orders/current/attempts", requireJson, async (c) => {
    const shop = requireShop(state);
    const id = orderIdFromCookie(c);
    const checkoutUrl = await shop.orders.startAttempt(id, (await jsonBody(c)).latestEphemeralKeyX);

    return c.json({ checkoutUrl } satisfies FreshAttempt, 201);
  });

  app.use("/api/admin/*", requireAdmin(adminToken));

  app.get("/api/admin/overview", async (c) => {
    const shop = requireShop(state);
    const { settings, signer, repository, orders } = shop;
    const recent = await repository.recent(RECENT_ORDERS);
    const paid = recent.filter((order) => order.status === "paid");
    const paidNet = paid.reduce((sum, order) => sum + netReceived(order), 0n);

    return c.json({
      settings: {
        chainId: settings.chainId,
        token: settings.tokenAddress,
        aggregator: settings.aggregatorAddress ?? `From ${settings.curvyApiUrl}`,
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
      agents: await agentsOverview(shop.agents),
    } satisfies AdminOverview);
  });

  app.post("/api/admin/check-payments", async (c) => {
    const summary = await requireShop(state).reconciler.checkOpenOrders();

    return c.json(summary satisfies PaymentCheckRun);
  });

  app.get("/api/health", async (c) => {
    if (!state.ok) return c.json({ ok: false, setUp: false, problems: state.problems }, 503);

    const { settings, network } = state.value;

    try {
      await network.ensureRightChain();

      const token = await network.token();

      return c.json({ ok: true, setUp: true, chainId: settings.chainId, token });
    } catch (error) {
      return c.json({ ok: false, setUp: true, error: describeError(error) }, 503);
    }
  });

  // Wallpapers for agents, over x402: the catalogue is free; a wallpaper answers 402 until it is paid.
  for (const path of [AGENT_PATH, AGENT_WALLPAPERS_PATH]) {
    app.get(path, async (c) => {
      const shop = requireShop(state);
      const token = await shop.network.token();

      c.header("Cache-Control", "no-store");

      return c.json(agentCatalogue(shop.settings, token, await shop.agents.availability()));
    });
  }

  app.get(`${AGENT_WALLPAPERS_PATH}/:id`, async (c) => {
    const shop = requireShop(state);
    const product = findProduct(c.req.param("id"));

    if (!product) throw new ShopError(404, "there is no such wallpaper", "NO_RESOURCE");

    const token = await shop.network.token();

    const result = await shop.agents
      .charge(c.req.raw, product, token.decimals)
      .catch((error: unknown) => {
        throw new ShopError(
          503,
          `agent payments are not available: ${describeError(error)}`,
          "AGENTS_UNAVAILABLE",
        );
      });

    if (result.status === "payment-required") {
      return c.json(result.response.body, 402, result.response.headers);
    }

    const object = await c.env.WALLPAPERS.get(product.file);

    if (!object) {
      log.error(
        `Agent payment ${result.payment.payTo}: the file for ${product.id} is missing in the bucket`,
      );

      throw new ShopError(
        500,
        "The file is missing on the server. Contact the shop.",
        "FILE_MISSING",
      );
    }

    // Paid: the file is the response. Shielding into the shop's note continues after it is sent.
    c.executionCtx.waitUntil(shop.agents.settle(result.payment.payTo));

    return new Response(object.body, {
      headers: {
        ...result.headers,
        "Content-Type": "image/png",
        "Content-Length": String(object.size),
        "Content-Disposition": `attachment; filename="${downloadName(product)}"`,
        ETag: object.httpEtag,
      },
    });
  });

  app.all("/api/*", () => {
    throw new ShopError(404, "there is no such API route");
  });

  app.get("/download/:token", (c) => serveDownload(c, deps));

  // Everything else is a page. In production the assets config answers those before the Worker runs.
  app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

  return app;
}
