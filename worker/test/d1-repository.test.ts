import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { Order } from "../../server/src/orders/order.js";
import { D1OrderRepository } from "../src/d1-repository.js";

function order(id: string, overrides: Partial<Order> = {}): Order {
  return {
    id: `0x${id.padStart(64, "0")}` as Order["id"],
    productId: "01-beograd-genex",
    productName: "Beograd · Genex kula",
    price: "1.337",
    token: { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", decimals: 6 },
    amount: "1337000",
    status: "processing",
    attempts: [],
    createdAt: new Date(Number(id) * 1_000).toISOString(),
    paidAt: null,
    fulfilledAt: null,
    download: null,
    ...overrides,
  };
}

describe("orders in D1", () => {
  it("stores and reads an order back unchanged", async () => {
    const repository = new D1OrderRepository(env.ORDERS);
    const created = order("1");

    await repository.create(created);

    expect(await repository.get(created.id)).toEqual(created);
    expect(await repository.get(created.id.toUpperCase())).toEqual(created);
    expect(await repository.get(`0x${"f".repeat(64)}`)).toBeNull();
  });

  it("refuses the same order twice", async () => {
    const repository = new D1OrderRepository(env.ORDERS);

    await repository.create(order("2"));
    await expect(repository.create(order("2"))).rejects.toThrow();
  });

  it("writes a change once, and nothing when nothing changed", async () => {
    const repository = new D1OrderRepository(env.ORDERS);
    const created = order("3");

    await repository.create(created);

    const unchanged = await repository.update(created.id, () => "looked");

    expect(unchanged).toEqual({ order: created, result: "looked" });

    const changed = await repository.update(created.id, (current) => {
      current.status = "paid";
      current.paidAt = "2026-10-02T10:00:00.000Z";

      return true;
    });

    expect(changed?.result).toBe(true);
    expect((await repository.get(created.id))?.status).toBe("paid");
    expect(await repository.update(`0x${"e".repeat(64)}`, () => 1)).toBeNull();
  });

  it("lists the newest first, and the open ones", async () => {
    const repository = new D1OrderRepository(env.ORDERS);

    await repository.create(order("4"));
    await repository.create(order("5", { status: "paid" }));
    await repository.create(order("6"));

    const recent = await repository.recent(2);

    expect(recent.map((item) => item.id)).toEqual([order("6").id, order("5").id]);

    // Open means unpaid with an attempt still worth checking; these have no attempts, so none are open.
    expect(await repository.open()).toEqual([]);
  });

  it("finds an order by its download token", async () => {
    const repository = new D1OrderRepository(env.ORDERS);
    const token = "a".repeat(64);

    await repository.create(order("7"));

    await repository.update(order("7").id, (current) => {
      current.download = {
        token,
        issuedAt: "2026-10-02T10:00:00.000Z",
        expiresAt: "2026-10-09T10:00:00.000Z",
        downloadedAt: null,
      };
    });

    expect((await repository.byDownloadToken(token))?.id).toBe(order("7").id);
    expect(await repository.byDownloadToken("b".repeat(64))).toBeNull();
  });
});
