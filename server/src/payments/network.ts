/**
 * Checks that RPC_URL serves the shop's chain before the first payment request, and reads the token once.
 * A request made against the wrong chain would record a scan start block from that other chain.
 */
import { ShopError } from "../errors.js";
import type { Payments, TokenInfo } from "./payments.js";

export interface Network {
  ensureRightChain(): Promise<void>;
  token(): Promise<TokenInfo>;
}

/** Share one result between callers, but try again after a failure. */
function once<T>(load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined;

  return () => {
    pending ??= load().catch((error: unknown) => {
      pending = undefined;
      throw error;
    });

    return pending;
  };
}

export function createNetwork(payments: Payments, expectedChainId: number): Network {
  return {
    ensureRightChain: once(async () => {
      const chainId = await payments.chainId();

      if (chainId !== expectedChainId) {
        throw new ShopError(
          500,
          `RPC_URL serves chain ${chainId}, but the shop takes payments on chain ${expectedChainId}`,
          "WRONG_CHAIN",
        );
      }
    }),
    token: once(() => payments.token()),
  };
}
