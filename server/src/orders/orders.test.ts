import { PaymentVerificationError } from "@0xcurvy/payments-sdk/merchant";
import { decodePaymentIntentFragment } from "@0xcurvy/payments-sdk/transport";
import { describe, expect, it } from "vitest";
import { testShop, verifiedPayment } from "../testing/fixtures.js";
import { readRecord } from "./attempt.js";
import { MAX_ATTEMPTS_PER_ORDER } from "./order-service.js";

const TX = `0x${"ab".repeat(32)}` as const;
const OTHER_TX = `0x${"cd".repeat(32)}` as const;

describe("creating an order", () => {
  it("signs a one-time request for the product's price and records where to scan from", async () => {
    const { shop, payments } = await testShop();

    payments.head = 5_000n;

    const { order, checkoutUrl } = await shop.orders.createOrder("01-beograd-genex");
    const record = readRecord(order.attempts[0]!);

    expect(order.amount).toBe("1337000");
    expect(order.status).toBe("processing");
    expect(record.fromBlock).toBe(5_000n);
    expect(checkoutUrl.startsWith("https://checkout.example/checkout#")).toBe(true);

    const signed = decodePaymentIntentFragment(new URL(checkoutUrl).hash);

    expect(signed.intent.amount).toBe("1337000");
    expect(signed.intent.merchantOrigin).toBe("https://shop.example");

    // Signed, so checkout can show what is being bought.
    expect(signed.intent.description).toBe("Beograd · Genex kula · 4K wallpaper 01/10");
  });

  it("refuses an unknown product", async () => {
    const { shop } = await testShop();

    await expect(shop.orders.createOrder("gift-card")).rejects.toThrow("there is no product");
  });

  it("waits while the shop already has as many unpaid orders as it keeps open", async () => {
    const { shop } = await testShop({ MAX_OPEN_ORDERS: "2" });

    await shop.orders.createOrder("01-beograd-genex");
    await shop.orders.createOrder("01-beograd-genex");

    await expect(shop.orders.createOrder("01-beograd-genex")).rejects.toThrow(
      "too many unpaid orders",
    );
  });

  it("refuses to start when RPC_URL serves another chain", async () => {
    const { shop, payments } = await testShop();

    payments.chainId = async () => 1;

    await expect(shop.orders.createOrder("01-beograd-genex")).rejects.toThrow(
      "RPC_URL serves chain 1, but the shop takes payments on chain 42161",
    );
  });
});

describe("the transaction hash from the return URL", () => {
  it("pays the order when verifyPayment agrees, and fulfils it exactly once", async () => {
    const { shop, payments, log } = await testShop();
    const { order } = await shop.orders.createOrder("01-beograd-genex");

    payments.script = () => ({ status: "paid", payment: verifiedPayment() });

    const paid = await shop.orders.acceptTxHash(order.id, TX);

    await shop.orders.acceptTxHash(order.id, TX);
    await shop.reconciler.checkOpenOrders();

    expect(paid.status).toBe("paid");
    expect(paid.fulfilledAt).not.toBeNull();
    expect(paid.download?.token).toMatch(/^[0-9a-f]{64}$/);
    expect(paid.download?.downloadedAt).toBeNull();
    expect(payments.verifyCalls[0]?.lookup).toEqual({ txHash: TX });
    expect(log.count("is paid. Download link issued.")).toBe(1);
  });

  it("is rejected when the transaction pays something else", async () => {
    const { shop, payments } = await testShop();
    const { order } = await shop.orders.createOrder("01-beograd-genex");

    payments.script = () => {
      throw new PaymentVerificationError("UNRELATED", "does not pay this request");
    };

    await expect(shop.orders.acceptTxHash(order.id, OTHER_TX)).rejects.toThrow(
      "does not pay this order",
    );

    expect((await shop.orders.getOrder(order.id)).status).toBe("processing");
  });

  it("must look like a transaction hash", async () => {
    const { shop } = await testShop();
    const { order } = await shop.orders.createOrder("01-beograd-genex");

    await expect(shop.orders.acceptTxHash(order.id, "0x1234")).rejects.toThrow("32-byte hex hash");
  });
});

describe("the background check", () => {
  it("finds a payment without the buyer returning, then waits for confirmations", async () => {
    const { shop, payments } = await testShop();
    const { order } = await shop.orders.createOrder("01-beograd-genex");

    payments.script = () => ({
      status: "confirming",
      payment: verifiedPayment({ confirmations: 1n }),
    });

    await shop.reconciler.checkOpenOrders();

    expect((await shop.orders.getOrder(order.id)).status).toBe("confirming");

    payments.script = () => ({ status: "paid", payment: verifiedPayment() });

    const run = await shop.reconciler.checkOpenOrders();

    expect(run.paid).toEqual([order.id]);
    // A payment already found is re-read by its own transaction instead of scanning again.
    expect(payments.verifyCalls.at(-1)?.lookup).toEqual({ txHash: TX });
  });

  it("goes back to scanning when a found transaction is reorged out", async () => {
    const { shop, payments } = await testShop();
    const { order } = await shop.orders.createOrder("01-beograd-genex");

    payments.script = () => ({
      status: "confirming",
      payment: verifiedPayment({ confirmations: 1n }),
    });

    await shop.reconciler.checkOpenOrders();

    payments.script = () => {
      throw new PaymentVerificationError("TX_NOT_FOUND", "no such transaction");
    };

    await shop.reconciler.checkOpenOrders();

    expect((await shop.orders.getOrder(order.id)).status).toBe("processing");
  });

  it("starts later scans near the chain head, keeping a margin for reorgs", async () => {
    const { shop, payments } = await testShop();
    const { order } = await shop.orders.createOrder("01-beograd-genex");

    payments.head = 10_000n;
    await shop.reconciler.checkOpenOrders();

    const attempt = (await shop.orders.getOrder(order.id)).attempts[0]!;

    expect(readRecord(attempt).fromBlock).toBe(10_000n - 64n);
  });

  it("expires an attempt nobody paid, after the link closed and the grace period passed", async () => {
    const { shop, advance } = await testShop();
    const { order } = await shop.orders.createOrder("01-beograd-genex");

    await shop.reconciler.checkOpenOrders();
    // The link's hour, then the grace period.
    advance((3_600 + 3_600 + 1) * 1_000);

    const run = await shop.reconciler.checkOpenOrders();

    expect(run.expired).toBe(1);
    expect((await shop.orders.getOrder(order.id)).status).toBe("expired");
  });
});

describe("a fresh payment attempt", () => {
  it("is allowed for the latest attempt of an unpaid order", async () => {
    const { shop } = await testShop();
    const { order } = await shop.orders.createOrder("01-beograd-genex");
    const latest = readRecord(order.attempts[0]!).payment.intent.ephemeralKeyX;

    const checkoutUrl = await shop.orders.startAttempt(order.id, latest);
    const updated = await shop.orders.getOrder(order.id);

    expect(checkoutUrl).toContain("#");
    expect(updated.attempts.map((attempt) => attempt.number)).toEqual([1, 2]);

    expect(decodePaymentIntentFragment(new URL(checkoutUrl).hash).intent.description).toBe(
      "Beograd · Genex kula · 4K wallpaper 01/10",
    );
  });

  it("is refused for a stale attempt, so a double click cannot pile them up", async () => {
    const { shop } = await testShop();
    const { order } = await shop.orders.createOrder("01-beograd-genex");
    const first = readRecord(order.attempts[0]!).payment.intent.ephemeralKeyX;

    await shop.orders.startAttempt(order.id, first);

    await expect(shop.orders.startAttempt(order.id, first)).rejects.toThrow(
      "not the order's latest payment",
    );
  });

  it("stops at ten attempts, so a script cannot pile them onto one order", async () => {
    const { shop } = await testShop();
    const { order } = await shop.orders.createOrder("01-beograd-genex");

    const latest = async () => {
      const current = await shop.orders.getOrder(order.id);

      return readRecord(current.attempts.at(-1)!).payment.intent.ephemeralKeyX;
    };

    for (let count = 1; count < MAX_ATTEMPTS_PER_ORDER; count += 1) {
      await shop.orders.startAttempt(order.id, await latest());
    }

    await expect(shop.orders.startAttempt(order.id, await latest())).rejects.toThrow(
      "too many payment attempts",
    );

    expect((await shop.orders.getOrder(order.id)).attempts).toHaveLength(MAX_ATTEMPTS_PER_ORDER);
  });

  it("is refused once a payment was found", async () => {
    const { shop, payments } = await testShop();
    const { order } = await shop.orders.createOrder("01-beograd-genex");
    const latest = readRecord(order.attempts[0]!).payment.intent.ephemeralKeyX;

    payments.script = () => ({ status: "underpaid", payment: verifiedPayment({ netAmount: 1n }) });
    await shop.reconciler.checkOpenOrders();

    await expect(shop.orders.startAttempt(order.id, latest)).rejects.toThrow(
      "the order is underpaid, so it cannot start another payment",
    );
  });
});
