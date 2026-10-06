import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { readSignerSettings } from "../config/settings.js";
import { createApp } from "../http/app.js";
import { buildSignerList } from "../payments/signer-list.js";
import { AGENT_PAY_TO, MemoryLog, testShop } from "../testing/fixtures.js";
import { JsonFileX402Store } from "./json-file-store.js";

const FILE_BYTES = "not really a png";
const ADMIN_TOKEN = "admin-token-0123456789";

async function agentApp() {
  const harness = await testShop();
  const signer = readSignerSettings(harness.env);
  const dir = mkdtempSync(join(tmpdir(), "wallpapers-"));

  writeFileSync(join(dir, "01-beograd-genex-4k.png"), FILE_BYTES);

  if (!signer.ok) throw new Error("test signer");

  const app = createApp({
    shop: { ok: true, value: harness.shop },
    signerList: { ok: true, value: buildSignerList(signer.value) },
    adminToken: ADMIN_TOKEN,
    wallpapersDir: dir,
    log: new MemoryLog(),
  });

  return { ...harness, app };
}

describe("the agent catalogue", () => {
  it("lists every wallpaper as an x402 resource with its price, network and the steps", async () => {
    const { app } = await agentApp();
    const response = await request(app).get("/api/agent");

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      x402Version: 2,
      network: "eip155:42161",
      asset: { symbol: "USDC", decimals: 6 },
      schemes: ["curvy-transfer"],
    });

    expect(response.body.resources).toHaveLength(5);

    expect(response.body.resources[0]).toMatchObject({
      id: "01-beograd-genex",
      url: "https://shop.example/api/agent/wallpapers/01-beograd-genex",
      amount: "1337000",
      price: "1.337 USDC",
      mimeType: "image/png",
    });

    expect(response.body.steps).toHaveLength(4);
    expect(response.body.docs).toBe("https://shop.example/agents");
  });
});

describe("buying a wallpaper over x402", () => {
  it("answers 402 with the challenge until a payment is presented, then streams the file", async () => {
    const { app, agentMerchant, shop } = await agentApp();

    const challenge = await request(app).get("/api/agent/wallpapers/01-beograd-genex");

    expect(challenge.status).toBe(402);
    expect(challenge.headers["payment-required"]).toBe("ZmFrZQ");

    expect(challenge.body.accepts[0]).toMatchObject({
      scheme: "curvy-transfer",
      amount: "1337000",
    });

    expect(agentMerchant.charges[0]).toMatchObject({ price: 1337000n, mimeType: "image/png" });

    const paid = await request(app)
      .get("/api/agent/wallpapers/01-beograd-genex")
      .set("payment-signature", "cGFpZA")
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => callback(null, Buffer.concat(chunks)));
      });

    expect(paid.status).toBe(200);
    expect(paid.headers["content-type"]).toBe("image/png");
    expect(paid.headers["payment-response"]).toBe("b2s");

    expect(paid.headers["content-disposition"]).toContain(
      "brutalism-store-01-beograd-genex-4k.png",
    );

    expect((paid.body as Buffer).toString()).toBe(FILE_BYTES);

    // Served, the payment is pushed into the shop's note in the background.
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect((await shop.agents.get(AGENT_PAY_TO))?.status).toBe("confirmed");
  });

  it("knows no file for an unknown wallpaper", async () => {
    const { app } = await agentApp();
    const response = await request(app).get("/api/agent/wallpapers/nope");

    expect(response.status).toBe(404);
  });

  it("shows agent payments on the admin page and sweeps them with the payment check", async () => {
    const { app, agentMerchant } = await agentApp();

    await request(app).get("/api/agent/wallpapers/03-tjentiste-sutjeska");

    await request(app)
      .get("/api/agent/wallpapers/03-tjentiste-sutjeska")
      .set("payment-signature", "cGFpZA");

    // Pretend the background settle never ran: the sweep still moves the payment along.
    const settled = await agentMerchant.store.get(AGENT_PAY_TO);

    if (!settled) throw new Error("no payment");

    settled.status = "settled";
    await agentMerchant.store.put(settled);

    const run = await request(app)
      .post("/api/admin/check-payments")
      .set("authorization", `Bearer ${ADMIN_TOKEN}`);

    expect(run.body.agents).toMatchObject({ payments: 1, shielded: 1, confirmed: 1 });

    const overview = await request(app)
      .get("/api/admin/overview")
      .set("authorization", `Bearer ${ADMIN_TOKEN}`);

    expect(overview.body.agents).toMatchObject({
      confirmed: 1,
      netReceived: "1275207",
      unavailable: null,
    });

    expect(overview.body.agents.payments[0]).toMatchObject({
      payTo: AGENT_PAY_TO,
      status: "confirmed",
    });
  });
});

describe("the JSON agent payment store", () => {
  it("claims a status move exactly once", () => {
    const store = new JsonFileX402Store();

    store.put({
      payTo: AGENT_PAY_TO,
      status: "pending",
      amount: "1",
      resource: "https://shop.example/x",
      createdAt: 1,
      expiresAt: 2,
      accepts: [],
      note: { ownerHash: "1", ephemeralKey: ["2", "3"], viewTag: 4 },
    });

    expect(store.claim(AGENT_PAY_TO, "pending", "settling")).toBe(true);
    expect(store.claim(AGENT_PAY_TO, "pending", "settling")).toBe(false);
    expect(store.get(AGENT_PAY_TO.toUpperCase())?.status).toBe("settling");
    expect(store.list()).toHaveLength(1);
  });
});
