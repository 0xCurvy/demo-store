/**
 * The server starts even when the shop's settings are incomplete, so the setup steps can be checked
 * one at a time. Routes that need the shop ask for it here and get a `SetupError` until it is ready.
 */
import type { Settings } from "../config/settings.js";
import { SetupError } from "../errors.js";
import type { Shop } from "../shop.js";

export type ShopState = Settings<Shop>;

export function requireShop(state: ShopState): Shop {
  if (!state.ok) throw new SetupError(state.problems);

  return state.value;
}
