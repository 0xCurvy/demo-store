/**
 * What an agent reads before paying: every wallpaper as an x402 resource, with the price, the network and the
 * schemes on offer, and the steps in words. Served free at /api/agent and described on the shop's /agents page.
 */
import type { X402Scheme } from "@0xcurvy/payments-sdk/x402/merchant";
import { amountForPrice, PRODUCTS, type Product, productName } from "../catalog/products.js";
import type { ShopSettings } from "../config/settings.js";
import type { TokenInfo } from "../payments/payments.js";

export const AGENT_PATH = "/api/agent";
export const AGENT_WALLPAPERS_PATH = `${AGENT_PATH}/wallpapers`;

export interface AgentResource {
  id: string;
  name: string;
  note: string;
  /** The paid resource: GET it to receive a 402, pay, GET it again with PAYMENT-SIGNATURE to receive the file. */
  url: string;
  mimeType: "image/png";
  width: number;
  height: number;
  /** Gross price in token base units; the shop receives this minus Curvy's fees. */
  amount: string;
  price: string;
}

export interface AgentCatalogue {
  x402Version: 2;
  shop: string;
  /** CAIP-2 network every payment is made on. */
  network: string;
  chainId: number;
  asset: { address: string; symbol: string; decimals: number };
  /** The schemes the shop offers right now, in order of preference. Empty with `unavailable` set. */
  schemes: readonly X402Scheme[];
  unavailable?: string;
  resources: AgentResource[];
  steps: string[];
  docs: string;
}

export function agentResource(
  product: Product,
  settings: ShopSettings,
  token: TokenInfo,
): AgentResource {
  return {
    id: product.id,
    name: productName(product),
    note: product.note,
    url: `${settings.merchantOrigin}${AGENT_WALLPAPERS_PATH}/${product.id}`,
    mimeType: "image/png",
    width: 3840,
    height: 2560,
    amount: amountForPrice(product.price, token.decimals).toString(),
    price: `${product.price} ${token.symbol}`,
  };
}

export function agentCatalogue(
  settings: ShopSettings,
  token: TokenInfo,
  availability: { schemes: readonly X402Scheme[] } | { unavailable: string },
): AgentCatalogue {
  const schemes = "schemes" in availability ? availability.schemes : [];

  return {
    x402Version: 2,
    shop: "Brutalism",
    network: `eip155:${settings.chainId}`,
    chainId: settings.chainId,
    asset: { address: settings.tokenAddress, symbol: token.symbol, decimals: token.decimals },
    schemes,
    ...("unavailable" in availability ? { unavailable: availability.unavailable } : {}),
    resources: PRODUCTS.map((product) => agentResource(product, settings, token)),
    steps: [
      "GET a resource URL. The answer is 402 Payment Required with a PAYMENT-REQUIRED header: base64 JSON whose `accepts` lists one way to pay per scheme, each with a one-time `payTo` address and the `amount`.",
      "Pay one row of `accepts`. `exact`: sign an EIP-3009 TransferWithAuthorization for `amount` to `payTo`; Curvy's facilitator submits it and pays the gas. `curvy-transfer`: send an ERC-20 transfer of exactly `amount` to `payTo` from your own wallet.",
      "GET the same URL again with a PAYMENT-SIGNATURE header: base64 JSON `{ x402Version: 2, accepted: <the row you paid>, payload }`, where payload is `{ signature, authorization }` for exact or `{ txHash }` for curvy-transfer.",
      "The answer is 200 with the 3840 × 2560 PNG as its body and a PAYMENT-RESPONSE header. Save the body. One payment buys one download; a transfer still mining gets a 402 that re-offers the same payTo, so retry with the same header.",
    ],
    docs: `${settings.merchantOrigin}/agents`,
  };
}
