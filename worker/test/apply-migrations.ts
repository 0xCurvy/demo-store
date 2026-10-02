import { applyD1Migrations, env } from "cloudflare:test";
import { beforeEach } from "vitest";

await applyD1Migrations(env.ORDERS, env.TEST_MIGRATIONS);

// Every test starts from an empty shop: no orders, no files.
beforeEach(async () => {
  await env.ORDERS.prepare("DELETE FROM orders").run();

  const files = await env.WALLPAPERS.list();

  await Promise.all(files.objects.map((object) => env.WALLPAPERS.delete(object.key)));
});
