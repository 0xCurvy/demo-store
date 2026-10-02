/**
 * The Worker: the shop's API on `fetch`, and the background payment check on the cron trigger, which replaces
 * the Node server's in-process timer.
 */
import { describeError } from "../../server/src/log.js";
import { createApp } from "./app.js";
import type { Env } from "./env.js";
import { rustCoreReady } from "./rust-core.js";
import { shopFor } from "./shop.js";

const apps = new WeakMap<Env, ReturnType<typeof createApp>>();

function appFor(env: Env) {
  let app = apps.get(env);

  if (!app) {
    app = createApp(shopFor(env));
    apps.set(env, app);
  }

  return app;
}

export default {
  fetch(request, env, ctx) {
    return appFor(env).fetch(request, env, ctx);
  },

  async scheduled(_event, env, ctx) {
    const { state, log } = shopFor(env);

    if (!state.ok) {
      log.warn(`Payment check skipped: the shop is not set up (${state.problems.join("; ")})`);

      return;
    }

    ctx.waitUntil(
      rustCoreReady()
        .then(() => state.value.reconciler.checkOpenOrders())
        .then((summary) => {
          if (summary.checked > 0 || summary.expired > 0) {
            log.info(
              `Payment check: ${summary.checked} of ${summary.openOrders} open orders checked, ` +
                `${summary.paid.length} newly paid, ${summary.expired} expired, ${summary.failed} failed`,
            );
          }
        })
        .catch((error) => log.error(`Payment check failed: ${describeError(error)}`)),
    );
  },
} satisfies ExportedHandler<Env>;
