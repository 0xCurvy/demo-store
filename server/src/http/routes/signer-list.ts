/**
 * GET /.well-known/curvy-payments.json
 *
 * Curvy checkout fetches this from the buyer's browser and shows a payment only when the shop's
 * signature matches a signer listed here. It needs only MERCHANT_INTENT_SIGNING_KEY, so it works
 * before the rest of the shop is set up.
 */
import type { MerchantKeySet } from "@0xcurvy/payments-sdk";
import { Router } from "express";
import type { Settings } from "../../config/settings.js";
import { SetupError } from "../../errors.js";

const PATH = "/.well-known/curvy-payments.json";

export function signerListRoutes(signerList: Settings<MerchantKeySet>): Router {
  const router = Router();

  router.options(PATH, (_request, response) => {
    response
      .set({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Max-Age": "86400",
      })
      .status(204)
      .end();
  });

  router.get(PATH, (_request, response) => {
    response.set({ "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=60" });

    if (!signerList.ok) throw new SetupError(signerList.problems);

    response.json(signerList.value);
  });

  return router;
}
