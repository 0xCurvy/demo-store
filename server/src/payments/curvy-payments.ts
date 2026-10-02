/** The real `Payments`: a viem client for the chain and the Curvy Payments SDK for requests. */
import { signPaymentIntent } from "@0xcurvy/payments-sdk/intent";
import { initialize } from "@0xcurvy/payments-sdk/merchant";
import { createPublicClient, erc20Abi, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { ShopSettings } from "../config/settings.js";
import type { Payments, TokenInfo } from "./payments.js";

export function createCurvyPayments(settings: ShopSettings): Payments {
  const publicClient = createPublicClient({
    transport: http(settings.rpcUrl, { timeout: 20_000, retryCount: 2 }),
  });

  const sdk = initialize({
    ...settings.sdk,
    receivingKeys: settings.receivingKeys,
    merchantOrigin: settings.merchantOrigin,
    confirmations: settings.confirmations,
    paidWhen: settings.paidWhen,
    ttlSeconds: settings.paymentTtlSeconds,
    checkoutCompletePath: settings.completePath,
  });

  const signer = privateKeyToAccount(settings.signingKey);
  const token = settings.tokenAddress;

  async function readToken(): Promise<TokenInfo> {
    const decimals = await publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "decimals",
    });

    // symbol() is optional in ERC-20; the amount is what matters.
    const symbol = await publicClient
      .readContract({ address: token, abi: erc20Abi, functionName: "symbol" })
      .catch(() => "TOKEN");

    return { symbol, decimals };
  }

  return {
    chainId: () => publicClient.getChainId(),
    blockNumber: () => publicClient.getBlockNumber({ cacheTime: 0 }),
    token: readToken,

    async createSignedPayment(amount, description) {
      const request = await sdk.createPaymentRequest({ amount, description });

      return signPaymentIntent(request, (typedData) => signer.signTypedData(typedData));
    },

    verifyPayment(request, lookup) {
      return sdk.verifyPayment({ publicClient, request, ...lookup });
    },
  };
}
