import type { TokenView } from "@api";
import { chainInfo } from "@/shared/lib/chains";
import { Notice } from "@/shared/ui/Notice";

/** Says plainly whether a purchase here moves real money. */
export function NetworkNote({ chainId, token }: { chainId: number; token: TokenView }) {
  const chain = chainInfo(chainId);

  if (chain.testnet) {
    return (
      <Notice title={`Test money on ${chain.name}`}>
        Payments are in {token.symbol} on a test network, so nothing here costs anything real.
      </Notice>
    );
  }

  return (
    <Notice tone="warning" title={`Real money on ${chain.name}`}>
      Payments are in {token.symbol} and cannot be refunded by the shop. What you get is the 4K
      file, and a story to tell about Curvy checkout.
    </Notice>
  );
}
