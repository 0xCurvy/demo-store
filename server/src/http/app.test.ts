import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { readSignerSettings } from "../config/settings.js";
import { buildSignerList } from "../payments/signer-list.js";
import { MemoryLog, testShop, verifiedPayment } from "../testing/fixtures.js";
import { createApp } from "./app.js";

const ADMIN_TOKEN = "admin-token-0123456789";
const TX = `0x${"ab".repeat(32)}`;

const FILE_BYTES = "not really a png";

/** A folder with the first wallpaper's file, so the download route has something to send. */
function wallpapersDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "wallpapers-"));

  writeFileSync(join(dir, "01-beograd-genex-4k.png"), FILE_BYTES);

  return dir;
}

async function readyApp(clientIpHeader: string | null = null) {
  const harness = await testShop();
  const signer = readSignerSettings(harness.env);
  const log = new MemoryLog();

  if (!signer.ok) throw new Error("test signer");

  const app = createApp({
    shop: { ok: true, value: harness.shop },
    signerList: { ok: true, value: buildSignerList(signer.value) },
    adminToken: ADMIN_TOKEN,
    clientIpHeader,
    wallpapersDir: wallpapersDir(),
    log,
  });

  return { ...harness, app, log, signer: signer.value };
}

describe("the signer list", () => {
  it("is public JSON with CORS, for Curvy checkout to read", async () => {
    const { app, signer } = await readyApp();
    const response = await request(app).get("/.well-known/curvy-payments.json");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("*");
    expect(response.body.signers[0].address).toBe(signer.signerAddress);
    expect(response.body).toMatchObject({ name: "Brutalism", icon: "/curvy-icon.png" });
  });

  it("is published before the rest of the shop is set up", async () => {
    const signer = readSignerSettings({ MERCHANT_INTENT_SIGNING_KEY: `0x${"11".repeat(32)}` });

    if (!signer.ok) throw new Error("test signer");

    const app = createApp({
      shop: { ok: false, problems: ["RPC_URL is required"] },
      signerList: { ok: true, value: buildSignerList(signer.value) },
      adminToken: null,
      wallpapersDir: wallpapersDir(),
      log: new MemoryLog(),
    });

    expect((await request(app).get("/.well-known/curvy-payments.json")).status).toBe(200);

    expect((await request(app).get("/api/shop")).body).toEqual({
      ready: false,
      problems: ["RPC_URL is required"],
    });

    const order = await request(app).post("/api/orders").send({ productId: "01-beograd-genex" });

    expect(order.status).toBe(503);
    expect(order.body.code).toBe("NOT_SET_UP");
  });
});

describe("buying", () => {
  it("creates an order, remembers it in a cookie and sends the buyer to checkout", async () => {
    const { app } = await readyApp();

    const response = await request(app).post("/api/orders").send({ productId: "01-beograd-genex" });

    expect(response.status).toBe(201);
    expect(response.body.checkoutUrl).toMatch(/^https:\/\/checkout\.example\/checkout#/);

    expect(response.headers["set-cookie"]?.[0]).toMatch(
      /curvy_demo_order=0x[0-9a-f]{64}; .*HttpOnly/,
    );
  });

  it("accepts only JSON, so a form on another site cannot place orders", async () => {
    const { app } = await readyApp();

    const response = await request(app)
      .post("/api/orders")
      .type("form")
      .send("productId=01-beograd-genex");

    expect(response.status).toBe(415);
  });

  it("shows the order and accepts the return URL's transaction hash", async () => {
    const { app, payments } = await readyApp();

    const created = await request(app).post("/api/orders").send({ productId: "01-beograd-genex" });
    // The cookie is Secure (the shop's origin is https), so pass it on by hand over plain http.

    const cookie = String(created.headers["set-cookie"]?.[0]).split(";")[0] ?? "";

    payments.script = () => ({ status: "paid", payment: verifiedPayment() });

    const paid = await request(app)
      .post("/api/orders/current/tx-hash")
      .set("cookie", cookie)
      .send({ txHash: TX });

    expect(paid.status).toBe(200);

    expect(paid.body).toMatchObject({
      productName: "Beograd · Genex kula",
      status: "paid",
      chainId: 42161,
    });

    expect(paid.body.attempts[0].txHash).toBe(TX);
  });

  it("sends the file once at the paid order's download link", async () => {
    const { app, payments } = await readyApp();

    const created = await request(app).post("/api/orders").send({ productId: "01-beograd-genex" });

    const cookie = String(created.headers["set-cookie"]?.[0]).split(";")[0] ?? "";

    payments.script = () => ({ status: "paid", payment: verifiedPayment() });

    const paid = await request(app)
      .post("/api/orders/current/tx-hash")
      .set("cookie", cookie)
      .send({ txHash: TX });

    const url: string = paid.body.download.url;

    expect(url).toMatch(/^\/download\/[0-9a-f]{64}$/);
    expect(paid.body.download.downloadedAt).toBeNull();

    const file = await request(app).get(url);

    expect(file.status).toBe(200);

    expect(file.headers["content-disposition"]).toContain(
      "brutalism-store-01-beograd-genex-4k.png",
    );

    expect(Buffer.from(file.body as Uint8Array).toString()).toBe(FILE_BYTES);

    const again = await request(app).get(url);

    expect(again.status).toBe(410);
    expect(again.body.code).toBe("DOWNLOAD_USED");

    const shown = await request(app).get("/api/orders/current").set("cookie", cookie);

    expect(shown.body.download.downloadedAt).not.toBeNull();
  });

  it("has no file for a token nobody was given", async () => {
    const { app } = await readyApp();
    const response = await request(app).get(`/download/${"0".repeat(64)}`);

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("NO_DOWNLOAD");
  });

  it("has no order for a browser that did not buy anything", async () => {
    const { app } = await readyApp();
    const response = await request(app).get("/api/orders/current");

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("NO_ORDER");
  });
});

describe("the admin API", () => {
  it("needs the admin token", async () => {
    const { app } = await readyApp();

    expect((await request(app).get("/api/admin/overview")).status).toBe(401);

    const overview = await request(app)
      .get("/api/admin/overview")
      .set("authorization", `Bearer ${ADMIN_TOKEN}`);

    expect(overview.status).toBe(200);
    expect(overview.body.totals).toMatchObject({ orders: 0, paid: 0 });
  });

  it("runs the payment check on demand", async () => {
    const { app } = await readyApp();

    await request(app).post("/api/orders").send({ productId: "01-beograd-genex" });

    const run = await request(app)
      .post("/api/admin/check-payments")
      .set("authorization", `Bearer ${ADMIN_TOKEN}`);

    expect(run.body).toMatchObject({ openOrders: 1, checked: 1, failed: 0 });
  });
});

it("answers unknown API routes with JSON", async () => {
  const { app } = await readyApp();
  const response = await request(app).get("/api/nothing-here");

  expect(response.status).toBe(404);
  expect(response.body.error).toBe("there is no such API route");
});

describe("limits", () => {
  const buy = (app: Parameters<typeof request>[0], address: string) =>
    request(app)
      .post("/api/orders")
      .set("x-real-ip", address)
      .send({ productId: "01-beograd-genex" });

  it("slow down an address that keeps starting payments, and no one else", async () => {
    const { app } = await readyApp("X-Real-IP");

    for (let count = 0; count < 10; count += 1) {
      expect((await buy(app, "203.0.113.7")).status).toBe(201);
    }

    const refused = await buy(app, "203.0.113.7");

    expect(refused.status).toBe(429);
    expect(refused.body.code).toBe("TOO_MANY_REQUESTS");
    expect(refused.headers["retry-after"]).toBeDefined();
    expect((await buy(app, "203.0.113.8")).status).toBe(201);
  });

  it("count the connection's address unless told which proxy header to read", async () => {
    const { app } = await readyApp();

    // A visitor who makes up a new X-Real-IP for every request still has one limit.
    for (let count = 0; count < 10; count += 1) await buy(app, `203.0.113.${count}`);

    expect((await buy(app, "203.0.113.99")).status).toBe(429);
  });

  it("warn once when requests come through a proxy nobody named", async () => {
    const { app, log } = await readyApp();

    await request(app).get("/api/shop").set("x-forwarded-for", "203.0.113.7");
    await request(app).get("/api/shop").set("x-forwarded-for", "203.0.113.8");

    const warnings = log.lines.filter((line) => line.includes("CLIENT_IP_HEADER"));

    expect(warnings).toHaveLength(1);
  });
});
