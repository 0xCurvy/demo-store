import { beforeEach, describe, expect, it, vi } from "vitest";

const TX = `0x${"ab".repeat(32)}`;

/** The module reads the fragment once per page load, so each test loads it fresh. */
async function arriveWith(hash: string) {
  window.history.replaceState(null, "", `/checkout/complete${hash}`);
  vi.resetModules();

  return import("./return-fragment");
}

describe("the return link from checkout", () => {
  beforeEach(() => sessionStorage.clear());

  it("reads the transaction hash, keeps it for a reload and clears the address bar", async () => {
    const { takeReturnFragment, storedHint } = await arriveWith(`#txHash=${TX}`);

    expect(takeReturnFragment()).toEqual({ txHash: TX, retry: null });
    expect(window.location.hash).toBe("");
    expect(storedHint()).toBe(TX);
  });

  it("reads a request for a fresh payment", async () => {
    const { takeReturnFragment } = await arriveWith("#retry=123456");

    expect(takeReturnFragment()).toEqual({ txHash: null, retry: "123456" });
  });

  it("ignores anything that is not a transaction hash", async () => {
    const { takeReturnFragment, storedHint } = await arriveWith("#txHash=0x1234");

    expect(takeReturnFragment().txHash).toBeNull();
    expect(storedHint()).toBeNull();
  });

  it("gives the same answer when asked twice", async () => {
    const { takeReturnFragment } = await arriveWith(`#${TX}`);

    expect(takeReturnFragment()).toEqual(takeReturnFragment());
  });
});
