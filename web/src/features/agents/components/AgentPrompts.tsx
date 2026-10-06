import type { AgentCatalogue } from "@api";
import { PromptBlock } from "@/shared/ui/PromptBlock";

/**
 * The two prompts a person pastes into their agent: one to set up a wallet it can pay from (skipped when it has
 * one), one to buy a wallpaper here. Written for an agent that can run code; every value an agent needs is in the
 * text, so nothing has to be looked up elsewhere.
 */
export function AgentPrompts({ catalogue }: { catalogue: AgentCatalogue }) {
  const first = catalogue.resources[0];
  const exact = catalogue.schemes.includes("exact");
  const amount = first?.amount ?? "1337000";
  const price = first?.price ?? "1.337 USDC";
  const origin = catalogue.docs.replace(/\/agents$/, "");

  const wallet = `Set up a wallet my agent can pay from on Arbitrum One, using Coinbase Developer Platform (CDP) server wallets.
Do it step by step and stop to ask me whenever a step needs me.

1. I need a CDP API key and a Wallet Secret. If I don't have them yet, point me to
   https://portal.cdp.coinbase.com/api-keys/secret (API key) and
   https://portal.cdp.coinbase.com/wallets/non-custodial/security (Wallet Secret),
   then wait for me to put them in a .env file in this project as
   CDP_API_KEY_ID, CDP_API_KEY_SECRET and CDP_WALLET_SECRET. Never print these values.

2. Install the SDK in this project (Node 22 or newer):
   npm install @coinbase/cdp-sdk viem dotenv

3. Create the account, or reuse it if it exists, and tell me its address:
   import "dotenv/config";
   import { CdpClient } from "@coinbase/cdp-sdk";
   const cdp = new CdpClient();
   const account = await cdp.evm.getOrCreateAccount({ name: "my-agent" });
   console.log(account.address);
   Save AGENT_ACCOUNT_NAME=my-agent to .env.

4. Ask me to fund that address on Arbitrum One (chain id 42161) with
   - at least 2 USDC (token 0xaf88d065e77c8cC2239327C5EDb3A432268e5831), and
   - about 0.0005 ETH for gas.
   A Coinbase or exchange withdrawal to "Arbitrum One" works, or a bridge from any other network.

5. Confirm the balances before you finish, reading the chain with viem:
   const client = createPublicClient({ chain: arbitrum, transport: http() });
   USDC: client.readContract({ address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", abi: erc20Abi, functionName: "balanceOf", args: [account.address] })
   ETH:  client.getBalance({ address: account.address })
   Report both to me in human units (USDC has 6 decimals).

When you later need to sign or send from this wallet, use viem with the CDP account:
   import { toAccount } from "viem/accounts";
   const walletClient = createWalletClient({ account: toAccount(account), chain: arbitrum, transport: http() });

Alternative if I'd rather not use Coinbase: generate a key with viem (generatePrivateKey from "viem/accounts"),
store it as AGENT_KEY in .env, use privateKeyToAccount(process.env.AGENT_KEY) as the account, and fund its address the same way.`;

  const buy = `Buy a 4K wallpaper from ${origin} for me and save it in this project. Pay from my agent wallet on Arbitrum One.

How the shop sells to agents (x402, HTTP 402):
- Catalogue, free: GET ${origin}/api/agent returns JSON with "resources" (one per wallpaper: id, name, url, amount, price),
  the "network" (eip155:42161, Arbitrum One), the "asset" (USDC: ${catalogue.asset.address}, 6 decimals)
  and the "schemes" the shop accepts right now.
- Each wallpaper costs ${price} (${amount} base units). Show me the list and let me pick one unless I already named it.
- GET the wallpaper's url. The answer is 402 Payment Required. The PAYMENT-REQUIRED header is base64 JSON:
  { x402Version: 2, resource, accepts: [ { scheme, network, asset, amount, payTo, maxTimeoutSeconds, extra } ] }.
  payTo is a one-time address made for this purchase; amount is the exact price in base units.
${
  exact
    ? `- Pay the "exact" row: sign an EIP-3009 TransferWithAuthorization for amount to payTo (Curvy's facilitator sends it and pays the gas),
  or pay the "curvy-transfer" row by sending exactly amount USDC to payTo from my wallet and keeping the transaction hash.`
    : `- Pay the "curvy-transfer" row: send exactly amount USDC to payTo from my wallet (an ERC-20 transfer), wait for the receipt,
  keep the transaction hash.`
}
- GET the same url again with the header PAYMENT-SIGNATURE: base64 of
  { x402Version: 2, accepted: <the accepts row you paid, unchanged>, payload: { txHash: "<the transfer hash>" } }.
  If the answer is 402 again with the same payTo, the transfer is still mining: wait 2 seconds and retry with the
  same header, for up to 90 seconds. Never pay a payTo twice.
- The 200 body is the PNG (3840 × 2560). Save it as <id>.png. The PAYMENT-RESPONSE header carries the settlement.

The easy way, in TypeScript with the shop's SDK (npm install @0xcurvy/payments-sdk viem):
  import { createX402Payer } from "@0xcurvy/payments-sdk/x402";
  import { createWalletClient, erc20Abi, http } from "viem";
  import { arbitrum } from "viem/chains";
  import { writeFile } from "node:fs/promises";
  // account: toAccount(cdpAccount) for a CDP wallet, or privateKeyToAccount(process.env.AGENT_KEY)
  const walletClient = createWalletClient({ account, chain: arbitrum, transport: http() });
  const payer = createX402Payer({
    maxAmount: ${amount}n,${exact ? "\n    signer: account," : ""}
    send: ({ token, to, amount }) =>
      walletClient.writeContract({ address: token, abi: erc20Abi, functionName: "transfer", args: [to, amount] }),
  });
  const response = await payer.fetch("${first?.url ?? `${origin}/api/agent/wallpapers/01-beograd-genex`}");
  await writeFile("wallpaper.png", Buffer.from(await response.arrayBuffer()));

Rules: spend at most ${price} per wallpaper and only what I asked for; check my USDC balance first and stop if it is
short; never print private keys or secrets; tell me the transaction hash and where you saved the file.`;

  return (
    <div className="space-y-12">
      <PromptBlock
        title="1 · Give your agent a wallet"
        tag="Optional, skip if it has one"
        audience="Prompt for your agent"
      >
        {wallet}
      </PromptBlock>
      <PromptBlock title="2 · Buy a wallpaper" audience="Prompt for your agent">
        {buy}
      </PromptBlock>
    </div>
  );
}
