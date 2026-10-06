/**
 * What the shop sells: 4K wallpapers (3840 × 2560) of Yugoslav brutalism, five pieces from a numbered series of
 * ten, each keeping the number printed on it.
 * The shop page shows each one's thumbnail from `web/public/thumbs`; the full file sits in WALLPAPERS_DIR and is
 * only ever sent through a paid order's one-time download link. Prices are US dollar amounts as decimal strings
 * (so $1.337 is exact) and assume the shop prices in a USD stablecoin such as USDC. Curvy checkout refuses payments
 * below $0.50, so every price stays above it.
 */
export interface Product {
  id: string;
  /** Its place in the series of ten. */
  number: number;
  city: string;
  subject: string;
  /** What it is, in a few words. */
  note: string;
  /** In US dollars, as a decimal string: "1.337". */
  price: string;
  /** The 600 × 400 preview, served from the shop's own origin. */
  thumbnail: string;
  /** The 4K file's name inside WALLPAPERS_DIR. Never served directly. */
  file: string;
}

export const MINIMUM_PRICE = "0.50";
export const SERIES_SIZE = 10;
const PRICE = "1.337";

function wallpaper(
  number: number,
  slug: string,
  city: string,
  subject: string,
  note: string,
): Product {
  const id = `${String(number).padStart(2, "0")}-${slug}`;

  return {
    id,
    number,
    city,
    subject,
    note,
    price: PRICE,
    thumbnail: `/thumbs/${id}-thumb.jpg`,
    file: `${id}-4k.png`,
  };
}

export const PRODUCTS: readonly Product[] = [
  wallpaper(1, "beograd-genex", "Belgrade", "Genex Tower", "The Western City Gate, 1980."),
  wallpaper(
    3,
    "tjentiste-sutjeska",
    "Tjentište",
    "Sutjeska monument",
    "The Battle of Sutjeska memorial, 1971.",
  ),
  wallpaper(
    5,
    "petrova-gora-spomenik",
    "Petrova gora",
    "Uprising monument",
    "The Kordun and Banija uprising monument, 1981.",
  ),
  wallpaper(6, "krusevo-ilinden", "Kruševo", "Ilinden monument", "The Makedonium, 1974."),
  wallpaper(8, "split-split-3", "Split", "Split 3", "The Split 3 district, 1970s."),
];

/** How the order and the receipt name a wallpaper: "Belgrade · Genex Tower". */
export function productName(product: Pick<Product, "city" | "subject">): string {
  return `${product.city} · ${product.subject}`;
}

/**
 * What checkout shows the buyer under the shop's name, e.g. "Belgrade · Genex Tower · 4K wallpaper 01/10". The shop
 * signs it into the payment (at most 120 characters, plain text), so checkout and its receipt can say what was
 * bought. Checkout never sees the order itself.
 */
export function paymentDescription(product: Pick<Product, "city" | "subject" | "number">): string {
  const number = String(product.number).padStart(2, "0");

  return `${productName(product)} · 4K wallpaper ${number}/${SERIES_SIZE}`.slice(0, 120);
}

/** The name the buyer's browser saves the file under. */
export function downloadName(product: Pick<Product, "file">): string {
  return `brutalism-store-${product.file}`;
}

export function findProduct(id: unknown): Product | undefined {
  return PRODUCTS.find((product) => product.id === id);
}

/** A dollar price as token base units: "1.337" with 6 decimals → 1337000n. Exact, never through a float. */
export function amountForPrice(price: string, decimals: number): bigint {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(price);

  if (!match)
    throw new Error(`a price must be a decimal dollar amount, not ${JSON.stringify(price)}`);

  const [, whole, fraction = ""] = match;

  if (fraction.length > decimals) {
    throw new Error(`a price of ${price} needs more decimals than the token's ${decimals}`);
  }

  return BigInt(whole + fraction.padEnd(decimals, "0"));
}

/** Curvy checkout refuses payments below $0.50; the shop refuses to list such a price. */
export function assertSellable(price: string, decimals: number): void {
  if (amountForPrice(price, decimals) < amountForPrice(MINIMUM_PRICE, decimals)) {
    throw new Error(`a price must be at least $${MINIMUM_PRICE}`);
  }
}
