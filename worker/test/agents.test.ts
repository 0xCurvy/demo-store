import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { D1X402Store } from "../src/d1-x402-store.js";
import { FILE_BYTES, readyApp, testContext } from "./fixtures.js";

const PAY_TO = "0x1111111111111111111111111111111111111111";

describe("agent payments in D1", () => {
  it("stores, lists and claims a status move exactly once", async () => {
    const store = new D1X402Store(env.ORDERS);

    await store.put({
      payTo: PAY_TO,
      status: "pending",
      amount: "1337000",
      resource: "https://shop.example/api/agent/wallpapers/01-beograd-genex",
      createdAt: 1,
      expiresAt: 2,
      accepts: [],
      note: { ownerHash: "1", ephemeralKey: ["2", "3"], viewTag: 4 },
    });

    expect(await store.claim(PAY_TO, "pending", "settling")).toBe(true);
    expect(await store.claim(PAY_TO, "pending", "settling")).toBe(false);
    expect((await store.get(PAY_TO.toUpperCase()))?.status).toBe("settling");
    expect((await store.list()).map((payment) => payment.payTo)).toEqual([PAY_TO]);
  });
});

describe("wallpapers for agents", () => {
  it("lists the catalogue, challenges with 402, then streams the file once paid", async () => {
    const { app, shop } = await readyApp();
    const catalogue = await app.request("/api/agent", {}, env);

    expect(catalogue.status).toBe(200);
    expect((await catalogue.json<{ resources: unknown[] }>()).resources).toHaveLength(5);

    const challenge = await app.request("/api/agent/wallpapers/01-beograd-genex", {}, env);

    expect(challenge.status).toBe(402);
    expect(challenge.headers.get("payment-required")).toBe("ZmFrZQ");

    await env.WALLPAPERS.put("01-beograd-genex-4k.png", FILE_BYTES);

    const ctx = testContext();

    const paid = await app.request(
      "/api/agent/wallpapers/01-beograd-genex",
      { headers: { "payment-signature": "cGFpZA" } },
      env,
      ctx.ctx,
    );

    expect(paid.status).toBe(200);
    expect(paid.headers.get("payment-response")).toBe("b2s");
    expect(new TextDecoder().decode(await paid.arrayBuffer())).toBe(FILE_BYTES);

    await ctx.settled();

    expect((await shop.agents.get(PAY_TO))?.status).toBe("confirmed");
  });
});
