/**
 * The shop, assembled once per Worker instance from its environment: the same `createShop` the Node server uses,
 * over D1 instead of a file. Settings come from the Worker's vars and secrets under the same names as `.env`.
 */
import type { MerchantKeySet } from "@0xcurvy/payments-sdk";
import {
  readServerSettings,
  readShopSettings,
  readSignerSettings,
  type Settings,
} from "../../server/src/config/settings.js";
import type { ShopState } from "../../server/src/http/shop-state.js";
import { consoleLog, type Log } from "../../server/src/log.js";
import { buildSignerList } from "../../server/src/payments/signer-list.js";
import { createShop } from "../../server/src/shop.js";
import { D1OrderRepository } from "./d1-repository.js";
import { D1X402Store } from "./d1-x402-store.js";
import { type Env, environmentValues } from "./env.js";

export interface ShopDeps {
  state: ShopState;
  signerList: Settings<MerchantKeySet>;
  adminToken: string | null;
  log: Log;
}

const shops = new WeakMap<Env, ShopDeps>();

export function shopFor(env: Env): ShopDeps {
  const existing = shops.get(env);

  if (existing) return existing;

  const values = environmentValues(env);
  const log = consoleLog;
  const signer = readSignerSettings(values);
  const settings = readShopSettings(values);
  const server = readServerSettings(values);
  const repository = new D1OrderRepository(env.ORDERS);

  const state: ShopState =
    settings.ok && signer.ok
      ? {
          ok: true,
          value: createShop({
            settings: settings.value,
            signer: signer.value,
            repository,
            agentStore: new D1X402Store(env.ORDERS),
            log,
          }),
        }
      : { ok: false, problems: settings.ok ? [] : settings.problems };

  const deps: ShopDeps = {
    state,
    signerList: signer.ok ? { ok: true, value: buildSignerList(signer.value) } : signer,
    adminToken: server.ok ? server.value.adminToken : null,
    log,
  };

  shops.set(env, deps);

  return deps;
}
