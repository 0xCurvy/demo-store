import { describe, expect, it } from "vitest";
import { testEnv } from "../testing/fixtures.js";
import { readServerSettings, readShopSettings, readSignerSettings } from "./settings.js";

const ANVIL_KEY_0 = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

describe("shop settings", () => {
  it("reads a complete environment, with defaults for the optional values", async () => {
    const env = await testEnv();
    const result = readShopSettings({ ...env, CONFIRMATIONS: "", PAID_WHEN: undefined });

    expect(result.ok).toBe(true);

    if (!result.ok) return;

    // Mainnet resolves to Curvy's Arbitrum One contracts and USDC first.
    expect(result.value).toMatchObject({
      sdk: { environment: "mainnet" },
      chainId: 42161,
      tokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      aggregatorAddress: "0xE51924cEF003a654EC9735c4d97f5D4862cBcbB1",
      confirmations: 12,
      paidWhen: "shielded",
      completePath: "/checkout/complete",
      paymentTtlSeconds: 3_600,
      maxOpenOrders: 200,
    });
  });

  it("names every missing variable at once", () => {
    const result = readShopSettings({});

    expect(result.ok).toBe(false);

    if (result.ok) return;

    const names = result.problems.map((problem) => problem.split(" ")[0]);

    expect(names).toEqual([
      "CURVY_PAYMENTS_PUBLIC_KEY",
      "MERCHANT_INTENT_SIGNING_KEY",
      "CHECKOUT_URL",
      "MERCHANT_ORIGIN",
    ]);
  });

  it("refuses values that would break payments, and never echoes the RPC URL", async () => {
    const env = await testEnv({
      CURVY_PAYMENTS_PUBLIC_KEY: "01not-a-real-value",
      MERCHANT_ORIGIN: "https://shop.example/store/",
      CHECKOUT_URL: "http://checkout.example/checkout",
      RPC_URL: "ftp://rpc.example/secret-api-key",
      PAYMENT_TTL_SECONDS: "90000",
    });

    const result = readShopSettings(env);

    expect(result.ok).toBe(false);

    if (result.ok) return;

    expect(result.problems.join("\n")).toMatchInlineSnapshot(`
      "CURVY_PAYMENTS_PUBLIC_KEY is not a valid value: copy it again from the Curvy web app's Payments setup
      CHECKOUT_URL must be an https URL without a query or fragment (http only for localhost)
      MERCHANT_ORIGIN must be a bare https origin (http only for localhost), such as https://shop.example.com
      RPC_URL must be an https URL (http only for a node on this machine)
      PAYMENT_TTL_SECONDS must be at most 86400 seconds (24 hours)"
    `);

    expect(result.problems.join("\n")).not.toContain("secret-api-key");
  });

  it("reads the chain through Curvy's gateway unless RPC_URL names an endpoint", async () => {
    const byDefault = readShopSettings(await testEnv({ RPC_URL: undefined }));

    expect(byDefault.ok && byDefault.value.rpcUrl).toBe("https://api.curvy.box/rpc/42161");

    const staging = readShopSettings(
      await testEnv({ RPC_URL: undefined, CURVY_API_URL: "https://api.curvy.dev" }),
    );

    expect(staging.ok && staging.value.rpcUrl).toBe("https://api.curvy.dev/rpc/42161");

    const own = readShopSettings(await testEnv({ RPC_URL: "https://rpc.example/v2/key" }));

    expect(own.ok && own.value.rpcUrl).toBe("https://rpc.example/v2/key");
  });

  it("takes a staging stack's chain and aggregator as overrides", async () => {
    const result = readShopSettings(
      await testEnv({
        CHAIN_ID: "42161",
        AGGREGATOR_ADDRESS: "0xCfFcFD5b1e082b3924CD7dD34A49c99ef080f953",
        TOKENS: "USDC",
      }),
    );

    expect(result.ok && result.value.aggregatorAddress).toBe(
      "0xCfFcFD5b1e082b3924CD7dD34A49c99ef080f953",
    );

    expect(result.ok && result.value.sdk.network?.chainId).toBe(42161);
  });

  it("accepts plain http only for this machine", async () => {
    const local = readShopSettings(
      await testEnv({ MERCHANT_ORIGIN: "http://localhost:3100", RPC_URL: "http://127.0.0.1:8545" }),
    );

    expect(local.ok).toBe(true);
  });
});

describe("signer settings", () => {
  it("need only the signing key, and default notAfter to 90 days out", () => {
    const now = Date.parse("2026-09-29T12:00:00Z");
    const result = readSignerSettings({ MERCHANT_INTENT_SIGNING_KEY: `0x${"11".repeat(32)}` }, now);

    expect(result.ok && result.value.notAfter).toBe("2026-12-28T12:00:00.000Z");
  });

  it("refuse a public development key", () => {
    const result = readSignerSettings({ MERCHANT_INTENT_SIGNING_KEY: ANVIL_KEY_0 });

    expect(result.ok ? [] : result.problems).toEqual([
      "MERCHANT_INTENT_SIGNING_KEY is a public development key: create a new one with `pnpm create-signer`",
    ]);
  });
});

describe("server settings", () => {
  it("have a default for everything", () => {
    expect(readServerSettings({})).toEqual({
      ok: true,
      value: {
        port: 3100,
        storeFile: ".data/orders.json",
        agentStoreFile: ".data/agent-payments.json",
        adminToken: null,
        checkPaymentsEverySeconds: 30,
        clientIpHeader: null,
        wallpapersDir: "wallpapers",
      },
    });
  });

  it("want a header name for the visitor's address", () => {
    expect(readServerSettings({ CLIENT_IP_HEADER: "X-Real-IP" })).toMatchObject({
      ok: true,
      value: { clientIpHeader: "X-Real-IP" },
    });

    const result = readServerSettings({ CLIENT_IP_HEADER: "X-Real-IP: 1.2.3.4" });

    expect(result.ok ? [] : result.problems).toEqual([
      "CLIENT_IP_HEADER must be a header name, such as X-Real-IP",
    ]);
  });

  it("want a long admin token", () => {
    const result = readServerSettings({ ADMIN_TOKEN: "short" });

    expect(result.ok ? [] : result.problems).toEqual([
      "ADMIN_TOKEN must be at least 16 characters (a random string)",
    ]);
  });
});
