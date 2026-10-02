/**
 * Everything the shop needs from the chain and the Curvy Payments SDK, behind one small interface.
 * The real one is in `curvy-payments.ts`; tests pass a fake.
 */
import type { PaymentIntent, SignedPaymentIntent } from "@0xcurvy/payments-sdk";
import type { PaymentVerification } from "@0xcurvy/payments-sdk/merchant";
import type { Hex } from "viem";

export interface TokenInfo {
  symbol: string;
  decimals: number;
}

/** Look a payment up by its shield transaction, or scan from the block before the request was made. */
export type PaymentLookup = { txHash: Hex } | { fromBlock: bigint };

export interface Payments {
  chainId(): Promise<number>;
  blockNumber(): Promise<bigint>;
  token(): Promise<TokenInfo>;
  /**
   * Create a payment request for this amount and sign it with the shop's checkout signer. The description is
   * signed too, so Curvy checkout can show the buyer what they are paying for and nobody can change it.
   */
  createSignedPayment(amount: bigint, description: string): Promise<SignedPaymentIntent>;
  /** Check the chain for a payment of this request. Only this decides whether an order is paid. */
  verifyPayment(request: PaymentIntent, lookup: PaymentLookup): Promise<PaymentVerification>;
}
