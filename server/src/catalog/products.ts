/**
 * What the shop sells. Prices are in US cents and assume TOKEN_ADDRESS is a USD stablecoin such as
 * USDC. Curvy checkout refuses payments below $0.50, so every price stays comfortably above that.
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  /** Which illustration the shop page draws for it. */
  artwork: "print" | "stickers" | "postcards";
}

export const MINIMUM_PRICE_CENTS = 50;

export const PRODUCTS: readonly Product[] = [
  {
    id: "blue-hour-print",
    name: "Blue hour",
    description: "An A5 art print in blue and pink.",
    priceCents: 400,
    artwork: "print",
  },
  {
    id: "sticker-sheet",
    name: "Sticker sheet",
    description: "Six stickers on one sheet.",
    priceCents: 150,
    artwork: "stickers",
  },
  {
    id: "postcard-set",
    name: "Postcard set",
    description: "Three postcards, printed in yellow and blue.",
    priceCents: 250,
    artwork: "postcards",
  },
];

/**
 * What checkout shows the buyer under the shop's name, e.g. "Blue hour · An A5 art print in blue and pink". The
 * shop signs it into the payment (at most 120 characters, plain text), so checkout and its receipt can say what was
 * bought. Checkout never sees the order itself.
 */
export function paymentDescription(product: Pick<Product, "name" | "description">): string {
  return `${product.name} · ${product.description.replace(/\.$/, "")}`.slice(0, 120);
}

export function findProduct(id: unknown): Product | undefined {
  return PRODUCTS.find((product) => product.id === id);
}

/** The token amount (base units) for a price in cents: cents × 10^(decimals − 2). */
export function amountForPrice(priceCents: number, decimals: number): bigint {
  if (!Number.isSafeInteger(priceCents) || priceCents < MINIMUM_PRICE_CENTS) {
    throw new Error(`a price must be at least ${MINIMUM_PRICE_CENTS} cents`);
  }

  if (!Number.isSafeInteger(decimals) || decimals < 2) {
    throw new Error(`a token with ${decimals} decimals cannot express cents`);
  }

  return BigInt(priceCents) * 10n ** BigInt(decimals - 2);
}
