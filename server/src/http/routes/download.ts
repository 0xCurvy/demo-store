/**
 * The buyer's one-time download.
 *
 * GET /download/:token   the 4K file of the paid order whose link carries this token, once
 *
 * The token is the only credential: it is random, lives on the order, and the buyer got it on the completion
 * page. The link is used up when the whole file has been sent, so a download that breaks off can be retried.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Router } from "express";
import { downloadName, findProduct } from "../../catalog/products.js";
import { ShopError } from "../../errors.js";
import type { Log } from "../../log.js";
import { downloadProblem, isDownloadToken } from "../../orders/download.js";
import { requireShop, type ShopState } from "../shop-state.js";

const PROBLEMS = {
  used: "This download link has already been used.",
  expired: "This download link has expired.",
};

export function downloadRoutes(state: ShopState, wallpapersDir: string, log: Log): Router {
  const router = Router();

  router.get("/download/:token", async (request, response, next) => {
    const shop = requireShop(state);
    const { token } = request.params;
    const order = isDownloadToken(token) ? await shop.repository.byDownloadToken(token) : null;

    if (!order?.download || order.status !== "paid") {
      throw new ShopError(404, "There is no download at this link.", "NO_DOWNLOAD");
    }

    const problem = downloadProblem(order.download, new Date());

    if (problem) throw new ShopError(410, PROBLEMS[problem], `DOWNLOAD_${problem.toUpperCase()}`);

    const product = findProduct(order.productId);
    const file = product ? join(wallpapersDir, product.file) : null;

    if (!product || !file || !existsSync(file)) {
      log.error(
        `Order ${order.id}: the file for ${order.productId} is missing in ${wallpapersDir}`,
      );

      throw new ShopError(
        500,
        "The file is missing on the server. Contact the shop.",
        "FILE_MISSING",
      );
    }

    response.download(file, downloadName(product), { cacheControl: false }, (error) => {
      // Sent in full: the link is used up. A broken-off transfer leaves it open for another try.
      if (error) return next(error);

      void shop.repository.update(order.id, (current) => {
        if (current.download && current.download.downloadedAt === null) {
          current.download.downloadedAt = new Date().toISOString();
        }
      });
    });
  });

  return router;
}
