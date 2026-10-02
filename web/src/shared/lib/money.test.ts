import { describe, expect, it } from "vitest";
import { formatPrice, formatToken, formatUnits } from "./money";

const USDC = { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", decimals: 6 };

describe("money", () => {
  it("formats token base units with the token's decimals", () => {
    expect(formatUnits("3950000", 6)).toBe("3.95");
    expect(formatUnits("4000000", 6)).toBe("4.00");
    expect(formatUnits("1234567", 6)).toBe("1.234567");
    expect(formatUnits("7", 6)).toBe("0.000007");
  });

  it("names the token, or says nothing arrived yet", () => {
    expect(formatToken("2500000", USDC)).toBe("2.50 USDC");
    expect(formatToken(null, USDC)).toBe("none yet");
  });

  it("formats prices in dollars", () => {
    expect(formatPrice(150)).toBe("$1.50");
  });
});
