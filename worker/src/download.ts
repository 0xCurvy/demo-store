/**
 * GET /download/:token: the 4K file of the paid order whose link carries this token, once. The file comes from
 * R2 and streams straight through; the link is used up when the whole body has been handed to the client, so a
 * download that breaks off can be retried. Same rules as the Node server's download route.
 */
import type { Context } from "hono";
import { downloadName, findProduct } from "../../server/src/catalog/products.js";
import { ShopError } from "../../server/src/errors.js";
import { requireShop } from "../../server/src/http/shop-state.js";
import { downloadProblem, isDownloadToken } from "../../server/src/orders/download.js";
import type { Env } from "./env.js";
import type { ShopDeps } from "./shop.js";

const PROBLEMS = {
  used: "This download link has already been used.",
  expired: "This download link has expired.",
};

export async function serveDownload(
  c: Context<{ Bindings: Env }>,
  deps: ShopDeps,
): Promise<Response> {
  const shop = requireShop(deps.state);
  const token = c.req.param("token");
  const order = isDownloadToken(token) ? await shop.repository.byDownloadToken(token) : null;

  if (!order?.download || order.status !== "paid") {
    throw new ShopError(404, "There is no download at this link.", "NO_DOWNLOAD");
  }

  const problem = downloadProblem(order.download, new Date());

  if (problem) throw new ShopError(410, PROBLEMS[problem], `DOWNLOAD_${problem.toUpperCase()}`);

  const product = findProduct(order.productId);
  const object = product ? await c.env.WALLPAPERS.get(product.file) : null;

  if (!product || !object) {
    deps.log.error(`Order ${order.id}: the file for ${order.productId} is missing in the bucket`);
    throw new ShopError(
      500,
      "The file is missing on the server. Contact the shop.",
      "FILE_MISSING",
    );
  }

  // Sent in full: the link is used up. A broken-off transfer rejects the pipe and leaves it open.
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();

  const delivered = object.body.pipeTo(writable).then(() =>
    shop.repository.update(order.id, (current) => {
      if (current.download && current.download.downloadedAt === null) {
        current.download.downloadedAt = new Date().toISOString();
      }
    }),
  );

  c.executionCtx.waitUntil(delivered.catch(() => undefined));

  return new Response(readable, {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(object.size),
      "Content-Disposition": `attachment; filename="${downloadName(product)}"`,
      "Cache-Control": "no-store",
      ETag: object.httpEtag,
    },
  });
}
