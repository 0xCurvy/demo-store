import type { AttemptView, OrderView } from "@api";
import { describe, expect, it } from "vitest";
import { canPayAgain, completionScreen } from "./completion-screen";

const NOW = 1_800_000_000;

function order(status: OrderView["status"], expiry = NOW + 600): OrderView {
  const attempt: AttemptView = {
    number: 1,
    status,
    ephemeralKeyX: "123",
    expiry,
    txHash: null,
    netAmount: null,
    minimumNetAmount: null,
  };

  return {
    id: `0x${"01".repeat(32)}`,
    productName: "Sticker sheet",
    priceCents: 150,
    chainId: 11155111,
    token: { address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", symbol: "USDC", decimals: 6 },
    amount: "1500000",
    status,
    attempts: [attempt],
    createdAt: "2026-09-29T12:00:00.000Z",
    paidAt: null,
  };
}

describe("the completion screen", () => {
  it("waits while the link is open, then says it closed", () => {
    expect(completionScreen(order("processing"), NOW)).toBe("waiting");
    expect(completionScreen(order("processing", NOW - 1), NOW)).toBe("link-closed");
  });

  it("shows each settled status on its own screen", () => {
    expect(completionScreen(order("paid"), NOW)).toBe("paid");
    expect(completionScreen(order("underpaid"), NOW)).toBe("underpaid");
    expect(completionScreen(order("wrong_token"), NOW)).toBe("wrong-token");
    expect(completionScreen(order("expired"), NOW)).toBe("expired");
  });

  it("offers a new payment only while nothing arrived", () => {
    expect(canPayAgain(order("processing"))).toBe(true);
    expect(canPayAgain(order("expired"))).toBe(true);
    expect(canPayAgain(order("confirming"))).toBe(false);
    expect(canPayAgain(order("underpaid"))).toBe(false);
  });
});
