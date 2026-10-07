/**
 * A scripted x402 merchant for tests, shared by the Node server's and the Worker's suites, so it must not import
 * anything Node-only. Every charge without a PAYMENT-SIGNATURE header is a fresh 402 for `AGENT_PAY_TO`; with one,
 * it is `paid`. `shield` and `confirm` move the payment one status each, as the SDK's do.
 */
import type {
  X402ChargeOptions,
  X402ChargeResult,
  X402Payment,
  X402RequestLike,
} from "@0xcurvy/payments-sdk/x402/merchant";
import type { AgentMerchant } from "../x402/agent-payments.js";
import { createMemoryPaymentStore } from "@0xcurvy/payments-sdk/x402/merchant";

export const AGENT_PAY_TO = "0x1111111111111111111111111111111111111111" as const;

export class FakeAgentMerchant implements AgentMerchant {
  readonly schemes = ["curvy-transfer"] as const;
  readonly network = "eip155:42161" as const;
  readonly tokens = [
    {
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      symbol: "USDC",
      decimals: 6,
      vaultTokenId: 2n,
    },
  ] as const;
  readonly charges: X402ChargeOptions[] = [];
  readonly store = createMemoryPaymentStore();

  async charge(request: X402RequestLike, options: X402ChargeOptions): Promise<X402ChargeResult> {
    this.charges.push(options);

    const headers = request.headers as { get?: (name: string) => string | null } & Record<
      string,
      unknown
    >;

    const presented =
      typeof headers.get === "function"
        ? headers.get("payment-signature")
        : headers["payment-signature"];

    const payment: X402Payment = (await this.store.get(AGENT_PAY_TO)) ?? {
      payTo: AGENT_PAY_TO,
      status: "pending",
      amount: options.price.toString(),
      resource: typeof request.url === "string" ? request.url : "",
      createdAt: Date.now(),
      expiresAt: Date.now() + 300_000,
      accepts: [
        {
          scheme: "curvy-transfer",
          network: this.network,
          asset: this.tokens[0].address,
          amount: options.price.toString(),
          payTo: AGENT_PAY_TO,
          maxTimeoutSeconds: 300,
          extra: {},
        },
      ],
      note: { ownerHash: "1", ephemeralKey: ["2", "3"], viewTag: 4 },
    };

    if (!presented) {
      await this.store.put(payment);

      return {
        status: "payment-required",
        payment,
        response: {
          status: 402,
          headers: { "payment-required": "ZmFrZQ", "cache-control": "no-store" },
          body: {
            x402Version: 2,
            resource: { url: payment.resource, mimeType: "image/png" },
            accepts: payment.accepts,
          },
        },
      };
    }

    payment.status = "settled";
    payment.payer = "0x2222222222222222222222222222222222222222";
    await this.store.put(payment);

    return {
      status: "paid",
      payment,
      headers: { "payment-response": "b2s", "cache-control": "no-store" },
    };
  }

  async getPayment(payTo: string) {
    return await this.store.get(payTo);
  }

  async listPayments() {
    return await this.store.list();
  }

  async shield(payTo: string) {
    const payment = await this.store.get(payTo);

    if (!payment) throw new Error(`unknown payment ${payTo}`);

    if (payment.status === "settled") {
      payment.status = "shielded";
      payment.shieldTxHash = `0x${"cd".repeat(32)}`;
      await this.store.put(payment);
    }

    return payment;
  }

  async confirm(payTo: string) {
    const payment = await this.store.get(payTo);

    if (!payment) throw new Error(`unknown payment ${payTo}`);

    if (payment.status === "shielded") {
      payment.status = "confirmed";
      payment.netAmount = "1275207";
      payment.noteId = "7";
      await this.store.put(payment);
    }

    return payment;
  }

  async minimumPrice() {
    return 500_000n;
  }
}
