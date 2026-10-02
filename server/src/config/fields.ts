/**
 * One zod schema per kind of environment value. Each message completes the sentence
 * "<VARIABLE> …", so a problem reads as, for example, "CHAIN_ID must be a positive whole number".
 */
import { parseReceivingKeys } from "@0xcurvy/payments-sdk/merchant/keys";
import { type Address, getAddress, type Hex, isAddress } from "viem";
import { privateKeyToAddress } from "viem/accounts";
import { z } from "zod";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Anvil's and Hardhat's default accounts. Their private keys are public, so they never sign. */
const PUBLIC_DEV_ADDRESSES = new Set([
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
]);

function text(hint: string) {
  return z.string({
    error: (issue) => (issue.input === undefined ? `is required: ${hint}` : "must be text"),
  });
}

/** https everywhere, plain http only for a server on this machine. */
function secureEnough(url: URL): boolean {
  return url.protocol === "https:" || (url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname));
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export const positiveInteger = z.coerce
  .number({ error: "must be a positive whole number" })
  .int({ error: "must be a positive whole number" })
  .positive({ error: "must be a positive whole number" });

export const requiredInteger = (hint: string) =>
  text(hint)
    .transform(Number)
    .pipe(
      z
        .number({ error: "must be a positive whole number" })
        .int({ error: "must be a positive whole number" })
        .positive({ error: "must be a positive whole number" }),
    );

/** Your own RPC endpoint. It may carry an API key in its path or query, so it is never printed. */
export const rpcUrl = text("your RPC endpoint for the chain").refine(
  (value) => {
    const url = parseUrl(value);

    return url !== null && secureEnough(url);
  },
  { error: "must be an https URL (http only for a node on this machine)" },
);

export const receivingKeys = text(
  'the "01…" value from the Curvy web app\'s Payments setup',
).refine(
  (value) => {
    try {
      parseReceivingKeys(value);

      return true;
    } catch {
      return false;
    }
  },
  { error: "is not a valid value: copy it again from the Curvy web app's Payments setup" },
);

function signerAddress(value: string): Address | null {
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) return null;

  try {
    return privateKeyToAddress(value as Hex);
  } catch {
    return null;
  }
}

export const signingKey = text("run `pnpm create-signer` and paste the private key")
  .refine((value) => signerAddress(value) !== null, {
    error: "must be a 0x-prefixed 32-byte hex private key",
  })
  .refine((value) => !PUBLIC_DEV_ADDRESSES.has(signerAddress(value) ?? ""), {
    error: "is a public development key: create a new one with `pnpm create-signer`",
  })
  .transform((value) => value as Hex);

export const address = text("a 0x… contract address")
  .refine((value) => isAddress(value), { error: "must be a 0x-prefixed 20-byte address" })
  .transform((value): Address => getAddress(value));

/** A bare origin such as https://shop.example.com: scheme and host, no path or trailing slash. */
export const origin = text("a bare origin, such as https://shop.example.com").refine(
  (value) => {
    const url = parseUrl(value);

    return url !== null && url.origin === value && secureEnough(url);
  },
  {
    error:
      "must be a bare https origin (http only for localhost), such as https://shop.example.com",
  },
);

/** An absolute page URL with its path kept, such as https://app.curvy.dev/checkout. */
export const pageUrl = (hint: string) =>
  text(hint)
    .refine(
      (value) => {
        const url = parseUrl(value);

        return url !== null && secureEnough(url) && !url.username && !/[?#\s]/.test(value);
      },
      { error: "must be an https URL without a query or fragment (http only for localhost)" },
    )
    .transform((value) => new URL(value).href);

/** A comma-separated list, trimmed, with no empty entries. */
export const list = z
  .string()
  .transform((value) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  )
  .refine((items) => items.length > 0, { error: "must list at least one entry" });

export const isoDate = z.iso.datetime({
  offset: true,
  error: "must be an ISO date such as 2027-01-01T00:00:00Z",
});

export const secret = z
  .string()
  .min(16, { error: "must be at least 16 characters (a random string)" });

/** An HTTP header name, such as X-Real-IP. */
export const headerName = z
  .string()
  .regex(/^[A-Za-z0-9-]+$/, { error: "must be a header name, such as X-Real-IP" });
