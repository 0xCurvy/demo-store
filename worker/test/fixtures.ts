/**
 * Test helpers for the Worker: a shop over the local D1, with the Node server's real request signing and a
 * scripted chain, like the server's own fixtures. The receiving keys below are public keys nobody holds.
 */
import { env } from "cloudflare:test";
import type { PaymentIntent } from "@0xcurvy/payments-sdk";
import type { PaymentVerification, VerifiedPayment } from "@0xcurvy/payments-sdk/merchant";
import { generatePrivateKey } from "viem/accounts";
import {
  readServerSettings,
  readShopSettings,
  readSignerSettings,
  type ShopSettings,
} from "../../server/src/config/settings.js";
import type { Log } from "../../server/src/log.js";
import { createCurvyPayments } from "../../server/src/payments/curvy-payments.js";
import type { PaymentLookup, Payments } from "../../server/src/payments/payments.js";
import { buildSignerList } from "../../server/src/payments/signer-list.js";
import { createShop } from "../../server/src/shop.js";
import { FakeAgentMerchant } from "../../server/src/testing/fake-agent-merchant.js";
import { D1X402Store } from "../src/d1-x402-store.js";
import { createApp } from "../src/app.js";
import { D1OrderRepository } from "../src/d1-repository.js";
import { rustCoreReady } from "../src/rust-core.js";
import type { ShopDeps } from "../src/shop.js";

export const ADMIN_TOKEN = "admin-token-0123456789";
export const TX = `0x${"ab".repeat(32)}` as const;
export const FILE_BYTES = "not really a png";

const RECEIVING_KEYS =
  "01Q1JLejfW4maDvj_sdQzJR5uIXRmQ57hIeyuSqM42ZtbGXxqHdP6m6CpX8foSP8ImlbfbTKi9ukswewb3ekK-U_7pTxcdpmiMyjwKgQwGhxCYWWI1ssLMPGyiprTwZA5eynWuHqhbHW4Wp8XpqGjireHKhfWG-tKzD1GFcZ_ZnxJNzYwkYcVyp9XXSYZ6nlk6-FGh0yljHwBaTCxK5A_hOVZwEx32ypY3Aea4GhgawQ4ls8Xff5Ok2kqa2S2rqyDQZSCr5NijEg";

export function testEnv(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    CURVY_PAYMENTS_PUBLIC_KEY: RECEIVING_KEYS,
    MERCHANT_INTENT_SIGNING_KEY: generatePrivateKey(),
    CURVY_ENVIRONMENT: "mainnet",
    CHECKOUT_URL: "https://checkout.example/checkout",
    MERCHANT_ORIGIN: "https://shop.example",
    RPC_URL: "https://rpc.example/v2/secret-api-key",
    CONFIRMATIONS: "2",
    ADMIN_TOKEN,
    ...overrides,
  };
}

type VerifyScript = (request: PaymentIntent, lookup: PaymentLookup) => PaymentVerification;

/** Real request signing; a scripted chain. */
export class FakePayments implements Payments {
  head = 1_000n;
  script: VerifyScript = () => ({ status: "not_found", payment: null });
  private readonly real: Payments;

  constructor(private readonly settings: ShopSettings) {
    this.real = createCurvyPayments(settings);
  }

  async chainId() {
    return this.settings.chainId;
  }

  async blockNumber() {
    return this.head;
  }

  async token() {
    return { symbol: "USDC", decimals: 6 };
  }

  createSignedPayment(amount: bigint, description: string) {
    return this.real.createSignedPayment(amount, description);
  }

  async verifyPayment(request: PaymentIntent, lookup: PaymentLookup) {
    return this.script(request, lookup);
  }
}

export function verifiedPayment(overrides: Partial<VerifiedPayment> = {}): VerifiedPayment {
  return {
    txHash: TX,
    blockNumber: 1_001n,
    confirmations: 2n,
    noteId: 12345n,
    vaultTokenId: 2n,
    token: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    shortfall: 0n,
    netAmount: 1_300_000n,
    minimumNetAmount: 1_290_000n,
    portalShield: true,
    committed: false,
    siblingNoteIds: [],
    ...overrides,
  };
}

export class MemoryLog implements Log {
  lines: string[] = [];

  info(message: string) {
    this.lines.push(`info ${message}`);
  }

  warn(message: string) {
    this.lines.push(`warn ${message}`);
  }

  error(message: string) {
    this.lines.push(`error ${message}`);
  }
}

function ok<T>(result: { ok: true; value: T } | { ok: false; problems: string[] }): T {
  if (!result.ok) throw new Error(result.problems.join("; "));

  return result.value;
}

/** The app over the test's D1 and R2, with the shop ready and the chain scripted. */
export async function readyApp(overrides: Record<string, string> = {}) {
  await rustCoreReady();

  const values = testEnv(overrides);
  const settings = ok(readShopSettings(values));
  const signer = ok(readSignerSettings(values));
  const server = ok(readServerSettings(values));
  const repository = new D1OrderRepository(env.ORDERS);
  const payments = new FakePayments(settings);
  const log = new MemoryLog();
  const agentMerchant = new FakeAgentMerchant();

  const shop = createShop({
    settings,
    signer,
    repository,
    payments,
    agentStore: new D1X402Store(env.ORDERS),
    createMerchant: async () => agentMerchant,
    log,
  });

  const deps: ShopDeps = {
    state: { ok: true, value: shop },
    signerList: { ok: true, value: buildSignerList(signer) },
    adminToken: server.adminToken,
    log,
  };

  return { app: createApp(deps), deps, shop, repository, payments, agentMerchant, log, signer };
}

/** An execution context whose background work the test can wait for. */
export function testContext() {
  const pending: Promise<unknown>[] = [];

  return {
    ctx: {
      waitUntil(promise: Promise<unknown>) {
        pending.push(promise);
      },
      passThroughOnException() {},
      props: {},
    } as unknown as ExecutionContext,
    settled: () => Promise.allSettled(pending),
  };
}

/** The order cookie from a response, ready to send back. */
export function cookieOf(response: Response): string {
  return response.headers.get("set-cookie")?.split(";")[0] ?? "";
}
