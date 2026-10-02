/** The Express app: rate limits, the signer list, the API, then the pages. */
import type { MerchantKeySet } from "@0xcurvy/payments-sdk";
import express, { type RequestHandler, type Router } from "express";
import type { Settings } from "../config/settings.js";
import { ShopError } from "../errors.js";
import type { Log } from "../log.js";
import { errorHandler } from "./error-handler.js";
import { adminRoutes } from "./routes/admin.js";
import { currentOrderRoutes } from "./routes/current-order.js";
import { downloadRoutes } from "./routes/download.js";
import { healthRoutes } from "./routes/health.js";
import { shopRoutes } from "./routes/shop.js";
import { signerListRoutes } from "./routes/signer-list.js";
import { rateLimits } from "./rate-limits.js";
import type { ShopState } from "./shop-state.js";

export interface AppOptions {
  shop: ShopState;
  signerList: Settings<MerchantKeySet>;
  adminToken: string | null;
  log: Log;
  /** The header a proxy puts the visitor's address in (CLIENT_IP_HEADER); unset reads the connection. */
  clientIpHeader?: string | null;
  /** Where the 4K files are (WALLPAPERS_DIR). */
  wallpapersDir: string;
  /** The web pages. Tests leave them out. */
  pages?: RequestHandler | Router;
}

export function createApp(options: AppOptions): express.Express {
  const { shop, signerList, adminToken, log, pages, wallpapersDir } = options;
  const limits = rateLimits(options.clientIpHeader ?? null, log);
  const app = express();

  app.disable("x-powered-by");

  // Limits come first, so a refused request costs no body parsing.
  app.use(["/api", "/download"], limits.api);
  app.post(["/api/orders", "/api/orders/current/attempts"], limits.newPayments);
  app.post("/api/orders/current/tx-hash", limits.chainChecks);

  app.use(express.json({ limit: "16kb" }));

  app.use(signerListRoutes(signerList));
  app.use(shopRoutes(shop));
  app.use(currentOrderRoutes(shop));
  app.use(adminRoutes(shop, adminToken));
  app.use(healthRoutes(shop));
  app.use(downloadRoutes(shop, wallpapersDir, log));

  app.use("/api", () => {
    throw new ShopError(404, "there is no such API route");
  });

  if (pages) app.use(pages);

  app.use(errorHandler(log));

  return app;
}
