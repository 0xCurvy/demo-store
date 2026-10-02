/**
 * Everything the shop reads from the environment, validated at startup. `.env.example` documents
 * each variable. Problems are reported by variable name; secrets and the RPC URL are never echoed.
 */
import { DEFAULT_CHECKOUT_COMPLETE_PATH } from "@0xcurvy/payments-sdk";
import { initialize, type PaidWhen, type PaymentSDKConfig } from "@0xcurvy/payments-sdk/merchant";
import type { Address, Hex } from "viem";
import { privateKeyToAddress } from "viem/accounts";
import { z } from "zod";
import * as field from "./fields.js";

export type Env = Record<string, string | undefined>;

export type Settings<T> = { ok: true; value: T } | { ok: false; problems: string[] };

/** The checkout signer. Read on its own, so the signer list can go live before anything else. */
export interface SignerSettings {
  signingKey: Hex;
  signerAddress: Address;
  /** When checkout stops accepting this signer (ISO date). */
  notAfter: string;
}

/**
 * How the shop takes payments: the receiving account, the Curvy environment and checkout page, and the network the
 * SDK resolves from them (Arbitrum One on mainnet, Ethereum Sepolia on testnet, or the overrides for a staging stack).
 */
export interface ShopSettings {
  receivingKeys: string;
  signingKey: Hex;
  /** What the SDK's `initialize` takes: the environment, overrides and tokens as configured. */
  sdk: Pick<PaymentSDKConfig, "environment" | "network" | "tokens">;
  /** Resolved by the SDK from `sdk`: the chain requests are made for. */
  chainId: number;
  /** Resolved by the SDK: the token the shop prices in (the first it takes). */
  tokenAddress: Address;
  /** Resolved by the SDK: the aggregator payments are checked against. */
  aggregatorAddress: Address;
  checkoutUrl: string;
  merchantOrigin: string;
  /** Curvy's API gateway for the stack, which also proxies the chain's JSON-RPC at /rpc/<chainId>. */
  curvyApiUrl: string;
  /** RPC_URL, or the gateway's proxy for the shop's chain when none is set. */
  rpcUrl: string;
  confirmations: number;
  paidWhen: PaidWhen;
  /** Where checkout returns the buyer: the page `web/` serves at /checkout/complete. */
  completePath: string;
  paymentTtlSeconds: number;
  /** Unpaid orders the shop keeps open at once; past this, new orders wait. */
  maxOpenOrders: number;
}

/** How this process runs. Every value has a default. */
export interface ServerSettings {
  port: number;
  storeFile: string;
  adminToken: string | null;
  checkPaymentsEverySeconds: number;
  /** The header a proxy in front of the shop puts the visitor's address in; null reads the connection. */
  clientIpHeader: string | null;
  /** The folder with the 4K files, relative to the project root unless absolute. */
  wallpapersDir: string;
}

const SIGNER_VALIDITY_DAYS = 90;

const signerSchema = z.object({
  MERCHANT_INTENT_SIGNING_KEY: field.signingKey,
  MERCHANT_SIGNER_NOT_AFTER: field.isoDate.optional(),
});

const shopSchema = z.object({
  CURVY_PAYMENTS_PUBLIC_KEY: field.receivingKeys,
  MERCHANT_INTENT_SIGNING_KEY: field.signingKey,
  CURVY_ENVIRONMENT: z
    .enum(["mainnet", "testnet"], { error: "must be mainnet or testnet" })
    .default("mainnet"),
  // A staging or local Curvy stack: name its chain and aggregator. Unset, the environment's own contracts apply.
  CHAIN_ID: field.positiveInteger.optional(),
  AGGREGATOR_ADDRESS: field.address.optional(),
  // Symbols or addresses the shop takes, the first preferred. Unset, all Curvy takes on the network.
  TOKENS: field.list.optional(),
  CHECKOUT_URL: field.pageUrl("Curvy's checkout page, such as https://app.curvy.box/checkout"),
  MERCHANT_ORIGIN: field.origin,
  // The stack's API gateway: https://api.curvy.box for production, https://api.curvy.dev for staging.
  CURVY_API_URL: field.origin.default("https://api.curvy.box"),
  // Your own RPC endpoint. Unset, the shop reads the chain through the gateway's proxy, /rpc/<chainId>.
  RPC_URL: field.rpcUrl.optional(),
  CONFIRMATIONS: field.positiveInteger.default(12),
  PAID_WHEN: z
    .enum(["shielded", "committed"], { error: "must be shielded or committed" })
    .default("shielded"),
  PAYMENT_TTL_SECONDS: field.positiveInteger
    .min(120, { error: "must be at least 120 seconds" })
    .max(86_400, { error: "must be at most 86400 seconds (24 hours)" })
    // An hour leaves time to pay from an exchange; checkout offers that only while 30 minutes are left.
    .default(3_600),
  MAX_OPEN_ORDERS: field.positiveInteger.default(200),
});

const serverSchema = z.object({
  PORT: field.positiveInteger.default(3100),
  STORE_FILE: z.string().default(".data/orders.json"),
  ADMIN_TOKEN: field.secret.optional(),
  CHECK_PAYMENTS_EVERY_SECONDS: field.positiveInteger.default(30),
  CLIENT_IP_HEADER: field.headerName.optional(),
  WALLPAPERS_DIR: z.string().default("wallpapers"),
});

/** Blank values count as unset, so `NAME=` in `.env` means "use the default". */
function withoutBlanks(env: Env): Env {
  return Object.fromEntries(
    Object.entries(env).map(([name, value]) => [name, value?.trim() ? value.trim() : undefined]),
  );
}

function read<S extends z.ZodType, T>(
  schema: S,
  env: Env,
  toSettings: (value: z.output<S>) => T,
): Settings<T> {
  const result = schema.safeParse(withoutBlanks(env));

  if (!result.success) {
    return {
      ok: false,
      problems: result.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`),
    };
  }

  return { ok: true, value: toSettings(result.data) };
}

export function readSignerSettings(env: Env, now = Date.now()): Settings<SignerSettings> {
  return read(signerSchema, env, (values) => ({
    signingKey: values.MERCHANT_INTENT_SIGNING_KEY,
    signerAddress: privateKeyToAddress(values.MERCHANT_INTENT_SIGNING_KEY),
    notAfter:
      values.MERCHANT_SIGNER_NOT_AFTER ??
      new Date(now + SIGNER_VALIDITY_DAYS * 86_400_000).toISOString(),
  }));
}

export function readShopSettings(env: Env): Settings<ShopSettings> {
  const parsed = read(shopSchema, env, (values) => values);

  if (!parsed.ok) return parsed;

  const values = parsed.value;

  const sdk: ShopSettings["sdk"] = {
    environment: values.CURVY_ENVIRONMENT,
    ...(values.CHAIN_ID === undefined
      ? {}
      : { network: { chainId: values.CHAIN_ID, aggregatorAddress: values.AGGREGATOR_ADDRESS } }),
    ...(values.TOKENS === undefined ? {} : { tokens: values.TOKENS }),
  };

  // The SDK resolves the network from the environment and the overrides, and refuses what it cannot serve.
  let resolved: { chainId: number; tokenAddress: Address; aggregatorAddress: Address };

  try {
    const instance = initialize({
      ...sdk,
      receivingKeys: values.CURVY_PAYMENTS_PUBLIC_KEY,
      merchantOrigin: values.MERCHANT_ORIGIN,
      confirmations: values.CONFIRMATIONS,
      paidWhen: values.PAID_WHEN,
      ttlSeconds: values.PAYMENT_TTL_SECONDS,
      checkoutCompletePath: DEFAULT_CHECKOUT_COMPLETE_PATH,
    });

    const [tokenAddress] = instance.tokens;

    if (!tokenAddress) throw new Error("TOKENS names no token Curvy takes on this network");

    if (!instance.aggregatorAddress) {
      throw new Error("AGGREGATOR_ADDRESS is required on a chain the SDK does not know");
    }

    resolved = {
      chainId: instance.chainId,
      tokenAddress,
      aggregatorAddress: instance.aggregatorAddress,
    };
  } catch (error) {
    return { ok: false, problems: [error instanceof Error ? error.message : String(error)] };
  }

  return read(shopSchema, env, () => ({
    receivingKeys: values.CURVY_PAYMENTS_PUBLIC_KEY,
    signingKey: values.MERCHANT_INTENT_SIGNING_KEY,
    sdk,
    ...resolved,
    checkoutUrl: values.CHECKOUT_URL,
    merchantOrigin: values.MERCHANT_ORIGIN,
    curvyApiUrl: values.CURVY_API_URL,
    rpcUrl: values.RPC_URL ?? `${values.CURVY_API_URL}/rpc/${resolved.chainId}`,
    confirmations: values.CONFIRMATIONS,
    paidWhen: values.PAID_WHEN,
    completePath: DEFAULT_CHECKOUT_COMPLETE_PATH,
    paymentTtlSeconds: values.PAYMENT_TTL_SECONDS,
    maxOpenOrders: values.MAX_OPEN_ORDERS,
  }));
}

export function readServerSettings(env: Env): Settings<ServerSettings> {
  return read(serverSchema, env, (values) => ({
    port: values.PORT,
    storeFile: values.STORE_FILE,
    adminToken: values.ADMIN_TOKEN ?? null,
    checkPaymentsEverySeconds: values.CHECK_PAYMENTS_EVERY_SECONDS,
    clientIpHeader: values.CLIENT_IP_HEADER ?? null,
    wallpapersDir: values.WALLPAPERS_DIR,
  }));
}
