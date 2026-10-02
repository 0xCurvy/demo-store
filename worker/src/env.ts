/** The Worker's bindings (from wrangler.toml), vars and secrets (from the deploy workflow). */
export interface Env {
  ORDERS: D1Database;
  WALLPAPERS: R2Bucket;
  ASSETS: Fetcher;
  ENVIRONMENT: string;
  MERCHANT_ORIGIN: string;
  CURVY_PAYMENTS_PUBLIC_KEY?: string;
  MERCHANT_INTENT_SIGNING_KEY?: string;
  MERCHANT_SIGNER_NOT_AFTER?: string;
  CURVY_ENVIRONMENT?: string;
  CHAIN_ID?: string;
  AGGREGATOR_ADDRESS?: string;
  TOKENS?: string;
  CHECKOUT_URL?: string;
  CURVY_API_URL?: string;
  RPC_URL?: string;
  ADMIN_TOKEN?: string;
  CONFIRMATIONS?: string;
  PAID_WHEN?: string;
  PAYMENT_TTL_SECONDS?: string;
  MAX_OPEN_ORDERS?: string;
}

/** The string values of the environment, in the shape the server's settings readers take. */
export function environmentValues(env: Env): Record<string, string | undefined> {
  const values: Record<string, string | undefined> = {};

  for (const [name, value] of Object.entries(env)) {
    if (typeof value === "string") values[name] = value;
  }

  return values;
}
