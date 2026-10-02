/**
 * Starts the shop: reads `.env`, serves the pages and the API on one port, and checks open
 * orders on chain in the background. `pnpm dev` passes `--dev` for live reload.
 */
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readServerSettings,
  readShopSettings,
  readSignerSettings,
  type Settings,
} from "./config/settings.js";
import { createApp } from "./http/app.js";
import { builtPages, devPages } from "./http/web-pages.js";
import { consoleLog as log } from "./log.js";
import { buildSignerList } from "./payments/signer-list.js";
import { createShop, type Shop } from "./shop.js";
import { JsonFileRepository } from "./storage/json-file-repository.js";

const PROJECT_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const dev = process.argv.includes("--dev");

function loadDotEnv(): void {
  const file = resolve(PROJECT_ROOT, ".env");

  if (existsSync(file)) process.loadEnvFile(file);
}

function exitWith(problems: string[]): never {
  log.error(`The server settings are not valid:\n  - ${problems.join("\n  - ")}`);
  process.exit(1);
}

loadDotEnv();

const server = readServerSettings(process.env);

if (!server.ok) exitWith(server.problems);

const signer = readSignerSettings(process.env);
const shopSettings = readShopSettings(process.env);
const repository = new JsonFileRepository(resolve(PROJECT_ROOT, server.value.storeFile));

const shop: Settings<Shop> =
  shopSettings.ok && signer.ok
    ? {
        ok: true,
        value: createShop({ settings: shopSettings.value, signer: signer.value, repository, log }),
      }
    : { ok: false, problems: shopSettings.ok ? [] : shopSettings.problems };

const signerList = signer.ok ? { ok: true as const, value: buildSignerList(signer.value) } : signer;
const httpServer = createServer();

const app = createApp({
  shop,
  signerList,
  adminToken: server.value.adminToken,
  clientIpHeader: server.value.clientIpHeader,
  wallpapersDir: resolve(PROJECT_ROOT, server.value.wallpapersDir),
  log,
  pages: dev ? await devPages(httpServer) : builtPages(),
});

httpServer.on("request", app);

httpServer.listen(server.value.port, () => {
  log.info(`The shop is open on http://localhost:${server.value.port}`);

  if (!signer.ok) {
    log.warn("The signer list is not published yet: set MERCHANT_INTENT_SIGNING_KEY.");
  }

  if (!shop.ok) {
    log.warn(`The shop cannot take payments yet:\n  - ${shop.problems.join("\n  - ")}`);
  }

  if (server.value.adminToken === null) log.info("Set ADMIN_TOKEN to open the admin page.");
});

if (shop.ok) shop.value.reconciler.start(server.value.checkPaymentsEverySeconds);
