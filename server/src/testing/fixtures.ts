/**
 * Test helpers. Keys are generated fresh and their secrets thrown away. Payment requests are made
 * and signed by the real SDK; only chain reads and `verifyPayment` are faked.
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { PaymentIntent } from "@0xcurvy/payments-sdk";
import type { PaymentVerification, VerifiedPayment } from "@0xcurvy/payments-sdk/merchant";
import { encodeReceivingKeys } from "@0xcurvy/payments-sdk/merchant/keys";
import initRustCore, { pubFromScalar } from "@0xcurvy/rs-core-wasm/core";
import { bn254 } from "@noble/curves/bn254";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  type Env,
  readShopSettings,
  readSignerSettings,
  type ShopSettings,
  type SignerSettings,
} from "../config/settings.js";
import type { Log } from "../log.js";
import { createCurvyPayments } from "../payments/curvy-payments.js";
import type { PaymentLookup, Payments } from "../payments/payments.js";
import { createShop } from "../shop.js";
import { JsonFileRepository } from "../storage/json-file-repository.js";

const BABYJUBJUB_ORDER =
  2736030358979909402780800718157159386076813972158567259200215660948447373041n;

let rustCore: Promise<unknown> | undefined;

function randomScalar(order: bigint): bigint {
  return (BigInt(`0x${randomBytes(32).toString("hex")}`) % (order - 1n)) + 1n;
}

/** A valid "01…" public key for payments, for keys nobody holds. */
export async function randomReceivingKeys(): Promise<string> {
  const wasm = createRequire(import.meta.url).resolve(
    "@0xcurvy/rs-core-wasm/core/curvy_wasm_bg.wasm",
  );

  rustCore ??= initRustCore({ module_or_path: readFileSync(wasm) });
  await rustCore;

  const publicKey = privateKeyToAccount(generatePrivateKey()).publicKey;
  const S = `${BigInt(`0x${publicKey.slice(4, 68)}`)}.${BigInt(`0x${publicKey.slice(68)}`)}`;
  const v = bn254.G1.ProjectivePoint.BASE.multiply(randomScalar(bn254.fields.Fr.ORDER)).toAffine();
  const [bx, by] = pubFromScalar(randomScalar(BABYJUBJUB_ORDER).toString());

  return encodeReceivingKeys({ S, V: `${v.x}.${v.y}`, babyJubjubPublicKey: `${bx}.${by}` });
}

/** A complete, valid environment for Arbitrum One USDC. */
export async function testEnv(overrides: Env = {}): Promise<Env> {
  return {
    CURVY_PAYMENTS_PUBLIC_KEY: await randomReceivingKeys(),
    MERCHANT_INTENT_SIGNING_KEY: generatePrivateKey(),
    CHAIN_ID: "42161",
    TOKEN_ADDRESS: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    AGGREGATOR_ADDRESS: "0xe51924cef003a654ec9735c4d97f5d4862cbcbb1",
    CHECKOUT_URL: "https://checkout.example/checkout",
    MERCHANT_ORIGIN: "https://shop.example",
    RPC_URL: "https://rpc.example/v2/secret-api-key",
    CONFIRMATIONS: "2",
    ...overrides,
  };
}

function settingsOrThrow<T>(result: { ok: true; value: T } | { ok: false; problems: string[] }): T {
  if (!result.ok) throw new Error(result.problems.join("; "));

  return result.value;
}

export type VerifyScript = (
  request: PaymentIntent,
  lookup: PaymentLookup,
) => PaymentVerification | Promise<PaymentVerification>;

/** Real request signing; a scripted chain. */
export class FakePayments implements Payments {
  head = 1_000n;
  verifyCalls: { request: PaymentIntent; lookup: PaymentLookup }[] = [];
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
    this.verifyCalls.push({ request, lookup });

    return this.script(request, lookup);
  }
}

export function verifiedPayment(overrides: Partial<VerifiedPayment> = {}): VerifiedPayment {
  return {
    txHash: `0x${"ab".repeat(32)}`,
    blockNumber: 1_001n,
    confirmations: 2n,
    noteId: 12345n,
    vaultTokenId: 2n,
    netAmount: 3_950_000n,
    minimumNetAmount: 3_900_000n,
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

  count(fragment: string) {
    return this.lines.filter((line) => line.includes(fragment)).length;
  }
}

/** A shop over an in-memory repository, a fake chain and a clock the test moves. */
export async function testShop(overrides: Env = {}) {
  const env = await testEnv(overrides);
  const settings: ShopSettings = settingsOrThrow(readShopSettings(env));
  const signer: SignerSettings = settingsOrThrow(readSignerSettings(env));
  const repository = new JsonFileRepository();
  const payments = new FakePayments(settings);
  const log = new MemoryLog();

  // Starts at real time: the SDK stamps each request's expiry from Date.now().
  let clock = Date.now();

  const shop = createShop({ settings, signer, repository, payments, log, now: () => clock });

  return {
    env,
    shop,
    payments,
    repository,
    log,
    advance(ms: number) {
      clock += ms;
    },
  };
}
