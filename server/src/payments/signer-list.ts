/**
 * The shop's signer list, served at /.well-known/curvy-payments.json. Curvy checkout reads it from
 * the buyer's browser and shows a payment only if the shop's signature matches a signer listed here.
 */
import type { MerchantKeySet } from "@0xcurvy/payments-sdk";
import { buildMerchantKeySet } from "@0xcurvy/payments-sdk/merchant/keys";
import type { SignerSettings } from "../config/settings.js";

/** How checkout names the shop; it shows the shop's address beside it. */
export const CHECKOUT_NAME = "Brutalism";

/** Shown next to the shop's name in checkout: a square PNG in web/public, served from the shop's own origin. */
export const CHECKOUT_ICON = "/curvy-icon.png";

export function buildSignerList(signer: SignerSettings): MerchantKeySet {
  return buildMerchantKeySet([{ address: signer.signerAddress, notAfter: signer.notAfter }], {
    name: CHECKOUT_NAME,
    icon: CHECKOUT_ICON,
  });
}
