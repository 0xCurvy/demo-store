import { CodeBlock } from "@/shared/ui/CodeBlock";

type AgentSamplesProps = {
  origin: string;
  resource: string;
  amount: string;
  symbol: string;
  exact: boolean;
};

/** Working code for the three ways an agent can pay: the Curvy payer, any x402 client, or by hand. */
export function AgentSamples({ origin, resource, amount, symbol, exact }: AgentSamplesProps) {
  const payer = `import { createX402Payer } from "@0xcurvy/payments-sdk/x402";
import { createPublicClient, createWalletClient, erc20Abi, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";
import { writeFile } from "node:fs/promises";

// The agent's wallet: ${symbol} on Arbitrum One${exact ? "" : ", plus a little ETH for gas"}.
const account = privateKeyToAccount(process.env.AGENT_KEY as \`0x\${string}\`);
const publicClient = createPublicClient({ chain: arbitrum, transport: http() });
const walletClient = createWalletClient({ account, chain: arbitrum, transport: http() });

const payer = createX402Payer({
  // Never pay more than this for one wallpaper (token base units; ${symbol} has 6 decimals).
  maxAmount: ${amount}n,${
    exact
      ? `
  // exact: sign an EIP-3009 authorization; Curvy's facilitator sends it and pays the gas.
  signer: account,`
      : ""
  }
  // curvy-transfer: send the ${symbol} yourself to the one-time address in the 402.
  send: ({ token, to, amount }) =>
    walletClient.writeContract({ address: token, abi: erc20Abi, functionName: "transfer", args: [to, amount] }),
});

// One call: the 402 is paid and the paid response comes back with the PNG as its body.
const response = await payer.fetch("${resource}");
await writeFile("wallpaper.png", Buffer.from(await response.arrayBuffer()));`;

  const curl = `# 1. Ask for the wallpaper. The answer is 402 with the challenge in a header.
curl -sD - -o /dev/null ${resource} | grep -i payment-required
# PAYMENT-REQUIRED: <base64 JSON>  →  { x402Version: 2, resource, accepts: [{ scheme, payTo, amount, ... }] }

# 2. Pay one row of "accepts" to its one-time payTo address: exactly "amount" base units of ${symbol}.
#    curvy-transfer: an ERC-20 transfer from your wallet, then note its transaction hash.

# 3. Ask again, presenting the payment. The body of the 200 is the 3840 × 2560 PNG.
PAYLOAD=$(printf '{"x402Version":2,"accepted":%s,"payload":{"txHash":"0x…"}}' "$ACCEPTED_ROW" | base64 -w0)
curl -s -H "PAYMENT-SIGNATURE: $PAYLOAD" -o wallpaper.png ${resource}`;

  const discover = `curl -s ${origin}/api/agent | jq '.resources[] | {id, url, price}'`;

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h3 className="text-2xl poster-title">Find the wallpapers</h3>
        <p className="leading-relaxed text-ink-muted">
          The catalogue is free and lists every wallpaper as a resource URL with its price, the
          network, the token and the schemes the shop accepts right now. There is a copy for
          crawlers at <code className="font-mono text-ink">/llms.txt</code>.
        </p>
        <CodeBlock title="Shell">{discover}</CodeBlock>
      </section>

      <section className="space-y-4">
        <h3 className="text-2xl poster-title">Pay with the Curvy payer</h3>
        <p className="leading-relaxed text-ink-muted">
          <code className="font-mono text-ink">@0xcurvy/payments-sdk/x402</code> ships a small
          payer: a <code className="font-mono text-ink">fetch</code> that answers one 402 per
          request, never above the amount you allow, and returns the paid response.
        </p>
        <CodeBlock title="TypeScript, Node 22">{payer}</CodeBlock>
      </section>

      <section className="space-y-4">
        <h3 className="text-2xl poster-title">Pay by hand, or with any x402 client</h3>
        <p className="leading-relaxed text-ink-muted">
          The protocol is plain x402 v2: a 402 with a{" "}
          <code className="font-mono text-ink">PAYMENT-REQUIRED</code> header, a retry with{" "}
          <code className="font-mono text-ink">PAYMENT-SIGNATURE</code>.{" "}
          {exact
            ? "Any client that speaks the exact scheme with EIP-3009 on Arbitrum One pays it directly."
            : "Right now the shop offers the curvy-transfer scheme: your agent sends the tokens itself and presents the transaction hash."}
        </p>
        <CodeBlock title="Shell">{curl}</CodeBlock>
      </section>
    </div>
  );
}
