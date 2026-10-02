/** The admin API needs `Authorization: Bearer <ADMIN_TOKEN>`. Without ADMIN_TOKEN it stays closed. */
import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { ShopError } from "../errors.js";

export function requireAdmin(adminToken: string | null): RequestHandler {
  return (request, _response, next) => {
    if (adminToken === null) {
      throw new ShopError(503, "set ADMIN_TOKEN to open the admin page", "ADMIN_DISABLED");
    }

    const expected = Buffer.from(`Bearer ${adminToken}`);
    const actual = Buffer.from(request.headers.authorization ?? "");

    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new ShopError(401, "the admin token is not right", "UNAUTHORIZED");
    }

    next();
  };
}
