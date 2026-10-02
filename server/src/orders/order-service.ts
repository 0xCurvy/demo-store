/**
 * The buyer-facing order flows. Only `verifyPayment` against the stored request decides whether an
 * order is paid: the transaction hash in the return URL is a hint, never proof.
 */
import { randomBytes } from "node:crypto";
import {
  type PaymentVerification,
  PaymentVerificationError,
  serializePaymentRecord,
} from "@0xcurvy/payments-sdk/merchant";
import { buildCheckoutUrl } from "@0xcurvy/payments-sdk/transport";
import { bytesToHex, type Hex } from "viem";
import { amountForPrice, findProduct, paymentDescription } from "../catalog/products.js";
import type { ShopSettings } from "../config/settings.js";
import { ShopError } from "../errors.js";
import type { Log } from "../log.js";
import { describeError } from "../log.js";
import type { Network } from "../payments/network.js";
import type { Payments } from "../payments/payments.js";
import type { OrderRepository } from "../storage/order-repository.js";
import { applyVerification, attemptStatus, isWorthChecking, readRecord } from "./attempt.js";
import { type Attempt, isOrderId, type Order } from "./order.js";
import { canStartAttempt, latestAttempt, updateOrderStatus } from "./order-status.js";
import type { PaymentChecker } from "./payment-checker.js";

/** A completion page that stays open re-checks one attempt at most this often. */
const REFRESH_EVERY_MS = 4_000;

/**
 * Payment attempts one order may have. A buyer rarely needs a second; the cap stops a script from
 * piling attempts onto one order, since the background check visits every open attempt.
 */
export const MAX_ATTEMPTS_PER_ORDER = 10;

export interface OrderServiceDeps {
  settings: ShopSettings;
  repository: OrderRepository;
  payments: Payments;
  network: Network;
  checker: PaymentChecker;
  onPaid: (order: Order) => void;
  log: Log;
  now?: () => number;
}

export type OrderService = ReturnType<typeof createOrderService>;

export function createOrderService(deps: OrderServiceDeps) {
  const { settings, repository, payments, network, checker, onPaid, log } = deps;
  const now = deps.now ?? Date.now;

  /**
   * A signed, one-time payment request. The browser never chooses the amount, token, expiry or what the
   * payment says it is for.
   */
  async function newAttempt(amount: bigint, number: number, description: string): Promise<Attempt> {
    await network.ensureRightChain();

    // Read the block first: no payment for this request can land in an earlier one.
    const fromBlock = await payments.blockNumber();
    const payment = await payments.createSignedPayment(amount, description);

    return {
      number,
      record: serializePaymentRecord({ payment, fromBlock, verification: null }),
      createdAt: new Date(now()).toISOString(),
      expired: false,
      lastCheckOk: false,
      checkedAt: 0,
    };
  }

  function checkoutUrl(attempt: Attempt): string {
    return buildCheckoutUrl(settings.checkoutUrl, readRecord(attempt).payment);
  }

  async function getOrder(id: string): Promise<Order> {
    const order = isOrderId(id) ? await repository.get(id) : null;

    if (!order) throw new ShopError(404, "order not found", "NO_ORDER");

    return order;
  }

  async function createOrder(productId: unknown) {
    const product = findProduct(productId);

    if (!product) throw new ShopError(400, `there is no product ${JSON.stringify(productId)}`);

    // Every open order is checked on chain until it is paid or expires, so their number is capped.
    if ((await repository.open()).length >= settings.maxOpenOrders) {
      throw new ShopError(
        503,
        "the shop has too many unpaid orders right now; try again in a few minutes",
        "BUSY",
      );
    }

    const token = await network.token();
    const amount = amountForPrice(product.priceCents, token.decimals);
    const attempt = await newAttempt(amount, 1, paymentDescription(product));

    const order: Order = {
      id: bytesToHex(randomBytes(32)),
      productId: product.id,
      productName: product.name,
      priceCents: product.priceCents,
      token: { address: settings.tokenAddress, ...token },
      amount: amount.toString(),
      status: "processing",
      attempts: [attempt],
      createdAt: new Date(now()).toISOString(),
      paidAt: null,
      fulfilledAt: null,
    };

    await repository.create(order);

    return { order, checkoutUrl: checkoutUrl(attempt) };
  }

  /**
   * A fresh attempt after a payment Curvy could not take, or after the link expired. Only when
   * `latestEphemeralKeyX` names the order's latest attempt, so a stale page or a double click
   * cannot pile up attempts, and only while nothing has been found or paid.
   */
  async function startAttempt(id: string, latestEphemeralKeyX: unknown) {
    const namesLatest = (order: Order) => {
      const latest = latestAttempt(order);

      return (
        latest !== undefined &&
        readRecord(latest).payment.intent.ephemeralKeyX === latestEphemeralKeyX
      );
    };

    const snapshot = await getOrder(id);

    if (!canStartAttempt(snapshot)) {
      const status = snapshot.status.replace("_", " ");

      throw new ShopError(
        409,
        `the order is ${status}, so it cannot start another payment`,
        "NOT_RETRYABLE",
      );
    }

    if (!namesLatest(snapshot)) {
      throw new ShopError(409, "that is not the order's latest payment", "STALE_ATTEMPT");
    }

    if (snapshot.attempts.length >= MAX_ATTEMPTS_PER_ORDER) {
      throw new ShopError(
        409,
        "this order has had too many payment attempts; start a new order",
        "TOO_MANY_ATTEMPTS",
      );
    }

    // A retry says the same thing as the first attempt; a product removed since keeps its name.
    const product = findProduct(snapshot.productId);

    const attempt = await newAttempt(
      BigInt(snapshot.amount),
      snapshot.attempts.length + 1,
      product ? paymentDescription(product) : snapshot.productName,
    );

    const updated = await repository.update(id, (order) => {
      const full = order.attempts.length >= MAX_ATTEMPTS_PER_ORDER;

      if (full || !canStartAttempt(order) || !namesLatest(order)) return false;

      order.attempts.push({ ...attempt, number: order.attempts.length + 1 });
      updateOrderStatus(order);

      return true;
    });

    if (!updated?.result) throw new ShopError(409, "the order changed; reload it", "STALE_ATTEMPT");

    return checkoutUrl(updated.order.attempts.at(-1) as Attempt);
  }

  /** Check the transaction hash from the return URL against each unpaid attempt of the order. */
  async function acceptTxHash(id: string, txHash: unknown): Promise<Order> {
    if (typeof txHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
      throw new ShopError(400, "txHash must be a 32-byte hex hash");
    }

    const order = await getOrder(id);

    if (order.status === "paid") return order;

    for (const [index, attempt] of order.attempts.entries()) {
      if (attemptStatus(attempt) === "paid") continue;

      let verification: PaymentVerification;

      try {
        verification = await checker.verify(attempt, txHash as Hex);
      } catch (error) {
        // The transaction shields notes, but none of them pays this attempt.
        if (error instanceof PaymentVerificationError && error.code === "UNRELATED") continue;

        throw error;
      }

      const updated = await repository.update(id, (current) => {
        const target = current.attempts[index];

        return (
          target !== undefined &&
          applyVerification(target, verification) &&
          updateOrderStatus(current)
        );
      });

      if (updated?.result) onPaid(updated.order);

      return updated?.order ?? order;
    }

    throw new PaymentVerificationError(
      "UNRELATED",
      `transaction ${txHash} does not pay this order`,
    );
  }

  /** Re-check the order's open attempts, so an open completion page moves without waiting. */
  async function refresh(id: string): Promise<Order> {
    const order = await getOrder(id);
    const nowSeconds = Math.floor(now() / 1_000);

    const due = order.attempts
      .map((attempt, index) => ({ attempt, index }))
      .filter(({ attempt }) => order.status !== "paid" && isWorthChecking(attempt, nowSeconds))
      .filter(({ attempt }) => now() - attempt.checkedAt >= REFRESH_EVERY_MS);

    if (due.length > 0) {
      try {
        const head = await payments.blockNumber();

        for (const { index } of due) await checker.checkAttempt(order.id, index, head);
      } catch (error) {
        log.warn(`Could not re-check order ${id}: ${describeError(error)}`);
      }
    }

    return getOrder(id);
  }

  return { createOrder, getOrder, startAttempt, acceptTxHash, refresh, checkoutUrl };
}
