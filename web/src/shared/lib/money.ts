/** Prices are in US cents; token amounts are base-unit strings, formatted with the token's decimals. */
import type { TokenView } from "@api";

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

/** 3950000 with 6 decimals → "3.95". Keeps at least two decimals and drops trailing zeros. */
export function formatUnits(amount: string, decimals: number): string {
  const digits = String(BigInt(amount)).padStart(decimals + 1, "0");

  const whole = digits.slice(0, digits.length - decimals);

  const fraction = digits
    .slice(digits.length - decimals)
    .replace(/0+$/, "")
    .padEnd(2, "0");

  return `${whole}.${fraction}`;
}

export function formatToken(amount: string | null, token: TokenView): string {
  return amount === null ? "none yet" : `${formatUnits(amount, token.decimals)} ${token.symbol}`;
}
