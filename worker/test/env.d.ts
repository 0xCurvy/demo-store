import type { D1Migration } from "@cloudflare/vitest-pool-workers";
import type { Env as WorkerEnv } from "../src/env.js";

/** `env` from `cloudflare:test` is typed through this global namespace. */
declare global {
  namespace Cloudflare {
    interface Env extends WorkerEnv {
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}
