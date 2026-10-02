import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import {
  ADMIN_TOKEN,
  cookieOf,
  FILE_BYTES,
  readyApp,
  testContext,
  TX,
  verifiedPayment,
} from "./fixtures.js";

const json = (body: unknown) => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

describe("the signer list", () => {
  it("is public JSON with CORS, for Curvy checkout to read", async () => {
    const { app, signer } = await readyApp();
    const response = await app.request("/.well-known/curvy-payments.json", {}, env);
    const body = await response.json<{ signers: { address: string }[]; name: string }>();

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(body.signers[0]?.address).toBe(signer.signerAddress);
    expect(body.name).toBe("Brutalism");
  });
});

describe("buying", () => {
  it("lists the wallpapers without their file names", async () => {
    const { app } = await readyApp();
    const body = await (await app.request("/api/shop", {}, env)).json<{ products: object[] }>();

    expect(body.products).toHaveLength(5);
    expect(body.products[0]).not.toHaveProperty("file");
  });

  it("creates an order, remembers it in a cookie and sends the buyer to checkout", async () => {
    const { app } = await readyApp();
    const response = await app.request("/api/orders", json({ productId: "01-beograd-genex" }), env);
    const body = await response.json<{ checkoutUrl: string }>();

    expect(response.status).toBe(201);
    expect(body.checkoutUrl).toMatch(/^https:\/\/checkout\.example\/checkout#/);

    expect(response.headers.get("set-cookie")).toMatch(
      /curvy_demo_order=0x[0-9a-f]{64}; .*HttpOnly/,
    );
  });

  it("accepts only JSON", async () => {
    const { app } = await readyApp();

    const response = await app.request(
      "/api/orders",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "productId=x",
      },
      env,
    );

    expect(response.status).toBe(415);
  });

  it("pays the order from the return URL's transaction hash, then serves the file once", async () => {
    const { app, payments } = await readyApp();
    const created = await app.request("/api/orders", json({ productId: "01-beograd-genex" }), env);
    const cookie = cookieOf(created);

    payments.script = () => ({ status: "paid", payment: verifiedPayment() });

    const paid = await app.request(
      "/api/orders/current/tx-hash",
      { ...json({ txHash: TX }), headers: { "content-type": "application/json", cookie } },
      env,
    );

    const order = await paid.json<{
      status: string;
      productName: string;
      download: { url: string };
    }>();

    expect(paid.status).toBe(200);
    expect(order).toMatchObject({ status: "paid", productName: "Beograd · Genex kula" });
    expect(order.download.url).toMatch(/^\/download\/[0-9a-f]{64}$/);

    await env.WALLPAPERS.put("01-beograd-genex-4k.png", FILE_BYTES);

    const first = testContext();
    const file = await app.request(order.download.url, {}, env, first.ctx);

    expect(file.status).toBe(200);

    expect(file.headers.get("content-disposition")).toContain(
      "brutalism-store-01-beograd-genex-4k.png",
    );

    expect(new TextDecoder().decode(await file.arrayBuffer())).toBe(FILE_BYTES);

    await first.settled();

    const again = await app.request(order.download.url, {}, env, testContext().ctx);

    expect(again.status).toBe(410);
    expect((await again.json<{ code: string }>()).code).toBe("DOWNLOAD_USED");

    const shown = await app.request("/api/orders/current", { headers: { cookie } }, env);

    expect(
      (await shown.json<{ download: { downloadedAt: string | null } }>()).download.downloadedAt,
    ).not.toBeNull();
  });

  it("has no file for a token nobody was given", async () => {
    const { app } = await readyApp();
    const response = await app.request(`/download/${"0".repeat(64)}`, {}, env, testContext().ctx);

    expect(response.status).toBe(404);
  });

  it("has no order for a browser that did not buy anything", async () => {
    const { app } = await readyApp();
    const response = await app.request("/api/orders/current", {}, env);

    expect(response.status).toBe(401);
    expect((await response.json<{ code: string }>()).code).toBe("NO_ORDER");
  });
});

describe("the admin API", () => {
  it("needs the admin token, then shows totals and runs the payment check", async () => {
    const { app } = await readyApp();

    expect((await app.request("/api/admin/overview", {}, env)).status).toBe(401);

    await app.request("/api/orders", json({ productId: "03-tjentiste-sutjeska" }), env);

    const headers = { authorization: `Bearer ${ADMIN_TOKEN}` };
    const overview = await app.request("/api/admin/overview", { headers }, env);

    expect(overview.status).toBe(200);

    expect((await overview.json<{ totals: object }>()).totals).toMatchObject({
      orders: 1,
      paid: 0,
    });

    const run = await app.request("/api/admin/check-payments", { method: "POST", headers }, env);

    expect(await run.json()).toMatchObject({ openOrders: 1, checked: 1, failed: 0 });
  });
});

it("answers unknown API routes with JSON", async () => {
  const { app } = await readyApp();
  const response = await app.request("/api/nothing-here", {}, env);

  expect(response.status).toBe(404);
  expect((await response.json<{ error: string }>()).error).toBe("there is no such API route");
});
