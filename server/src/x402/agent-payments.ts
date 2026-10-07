/**
 * Payments from agents over HTTP 402 (x402), on top of the Payments SDK's merchant. The shop wraps it so both hosts
 * drive it the same way: `charge` answers one request, `settle` pushes a fresh payment into the shop's note, and
 * `sweep` makes one step of progress for every payment with funds in flight. Nothing here runs on a timer: the
 * Node server calls `sweep` from its background check, the Worker from its cron trigger.
 */
import {
  createX402Merchant,
  ShieldRefusedError,
  type X402ChargeResult,
  type X402Merchant,
  type X402MerchantConfig,
  type X402Payment,
  type X402PaymentStore,
  type X402RequestLike,
  type X402Scheme,
} from "@0xcurvy/payments-sdk/x402/merchant";
import { amountForPrice, paymentDescription, type Product } from "../catalog/products.js";
import type { ShopSettings } from "../config/settings.js";
import { describeError, type Log } from "../log.js";

/** The part of the SDK's merchant the shop uses; tests pass a fake with just this. */
export type AgentMerchant = Pick<
  X402Merchant,
  | "charge"
  | "getPayment"
  | "listPayments"
  | "shield"
  | "confirm"
  | "minimumPrice"
  | "schemes"
  | "network"
  | "tokens"
>;

export interface AgentPaymentsDeps {
  settings: ShopSettings;
  store: X402PaymentStore;
  log: Log;
  /** Tests pass a fake; by default the SDK's merchant over the chain and Curvy's broadcaster. */
  createMerchant?: (config: X402MerchantConfig) => Promise<AgentMerchant>;
}

export interface SweepSummary {
  payments: number;
  shielded: number;
  confirmed: number;
  /** The broadcaster refused the portal for good (screening, too small): nothing more to do. */
  refused: number;
  failed: number;
}

export type AgentPayments = ReturnType<typeof createAgentPayments>;

export function createAgentPayments(deps: AgentPaymentsDeps) {
  const { settings, store, log } = deps;
  const create = deps.createMerchant ?? createX402Merchant;
  let merchant: Promise<AgentMerchant> | undefined;

  function config(schemes: X402Scheme[]): X402MerchantConfig {
    return {
      receivingKeys: settings.receivingKeys,
      rpcUrl: settings.rpcUrl,
      tokens: [settings.tokenAddress],
      // The Curvy stack: its contracts come from this API, and its portal broadcaster and facilitator sit behind it.
      apiBaseUrl: settings.curvyApiUrl,
      ...(settings.aggregatorAddress
        ? { addresses: { aggregator: settings.aggregatorAddress } }
        : {}),
      merchantOrigin: settings.merchantOrigin,
      confirmations: settings.confirmations,
      schemes,
      ...(settings.x402Recovery ? { recovery: settings.x402Recovery } : {}),
      // The hosts drive shielding themselves: see `settle` and `sweep`.
      autoShield: false,
      store,
      onEvent: ({ type, payment, error }) => {
        const detail = error ? describeError(error) : (payment.error ?? "");

        log.info(`Agent payment ${payment.payTo} ${type} ${detail}`.trim());
      },
    };
  }

  async function start(): Promise<AgentMerchant> {
    const schemes = settings.x402Schemes;

    try {
      return await create(config(schemes));
    } catch (error) {
      // `exact` needs a facilitator that offers it; `curvy-transfer` needs none. Offer what works.
      if (schemes.includes("exact") && schemes.includes("curvy-transfer")) {
        log.warn(`Agent payments offer curvy-transfer only: ${describeError(error)}`);

        return create({ ...config(["curvy-transfer"]), facilitator: false });
      }

      throw error;
    }
  }

  /** The merchant, started on first use; a failed start is tried again next time. */
  function ready(): Promise<AgentMerchant> {
    merchant ??= start().catch((error: unknown) => {
      merchant = undefined;
      throw error;
    });

    return merchant;
  }

  /** Answer one request for a wallpaper: a 402 to send back, or `paid` with the headers for the file. */
  async function charge(
    request: X402RequestLike,
    product: Product,
    decimals: number,
  ): Promise<X402ChargeResult> {
    const x402 = await ready();

    return x402.charge(request, {
      price: amountForPrice(product.price, decimals),
      description: paymentDescription(product),
      mimeType: "image/png",
    });
  }

  /** Push a payment that was just served into the shop's note: register the portal, then confirm the note. */
  async function settle(payTo: string): Promise<void> {
    try {
      const x402 = await ready();
      const shielded = await x402.shield(payTo);

      if (shielded.status === "shielded") await x402.confirm(payTo);
    } catch (error) {
      if (!(error instanceof ShieldRefusedError))
        log.warn(`Agent payment ${payTo}: ${describeError(error)}`);
    }
  }

  /** One step for every payment with funds in flight. Safe to call often; each call does bounded work. */
  async function sweep(): Promise<SweepSummary> {
    const summary: SweepSummary = { payments: 0, shielded: 0, confirmed: 0, refused: 0, failed: 0 };
    const x402 = await ready();

    for (const payment of await x402.listPayments()) {
      if (
        payment.status !== "settling" &&
        payment.status !== "settled" &&
        payment.status !== "shielded"
      )
        continue;

      summary.payments += 1;

      try {
        let current: X402Payment = payment;

        if (current.status === "settling" || current.status === "settled") {
          current = await x402.shield(current.payTo);

          if (current.status === "shielded") summary.shielded += 1;
        }

        if (current.status === "shielded") {
          current = await x402.confirm(current.payTo);

          if (current.status === "confirmed") summary.confirmed += 1;
        }
      } catch (error) {
        if (error instanceof ShieldRefusedError) {
          summary.refused += 1;
          log.warn(`Agent payment ${payment.payTo} refused: ${error.message}`);
        } else {
          summary.failed += 1;
          log.warn(`Agent payment ${payment.payTo}: ${describeError(error)}`);
        }
      }
    }

    return summary;
  }

  /** How agents can pay right now: the schemes the merchant offers, or why none are available yet. */
  async function availability(): Promise<
    { schemes: readonly X402Scheme[] } | { unavailable: string }
  > {
    try {
      const x402 = await ready();

      return { schemes: x402.schemes };
    } catch (error) {
      return { unavailable: describeError(error) };
    }
  }

  return {
    charge,
    settle,
    sweep,
    availability,
    list: () => ready().then((x402) => x402.listPayments()),
    get: (payTo: string) => ready().then((x402) => x402.getPayment(payTo)),
  };
}
