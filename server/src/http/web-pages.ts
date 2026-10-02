/**
 * The shop's pages (the React app in `web/`), served from the same origin as the API. In
 * development Vite runs as middleware with live reload; in production the built files are served.
 */
import { existsSync } from "node:fs";
import type { Server } from "node:http";
import { fileURLToPath } from "node:url";
import express, { type RequestHandler, Router } from "express";
import { securityHeaders } from "./security-headers.js";

const WEB_ROOT = fileURLToPath(new URL("../../../web/", import.meta.url));
const WEB_BUILD = fileURLToPath(new URL("../../../web/dist/", import.meta.url));

export async function devPages(httpServer: Server): Promise<RequestHandler> {
  const { createServer } = await import("vite");

  const vite = await createServer({
    root: WEB_ROOT,
    appType: "spa",
    server: { middlewareMode: true, hmr: { server: httpServer } },
  });

  return vite.middlewares;
}

export function builtPages(): Router {
  if (!existsSync(`${WEB_BUILD}index.html`)) {
    throw new Error(
      "The web app is not built. Run `pnpm run build`, or `pnpm dev` for development.",
    );
  }

  const router = Router();

  router.use(securityHeaders);
  router.use(express.static(WEB_BUILD, { index: false }));

  // Every other page is the React app; it picks the page from the URL.
  router.get("/{*page}", (_request, response) => {
    response.sendFile(`${WEB_BUILD}index.html`);
  });

  return router;
}
