/** The one place an order is fulfilled. Here the goods are a file, and the order already holds its one-time link. */
import type { Log } from "../log.js";
import { readRecord } from "./attempt.js";
import type { Order } from "./order.js";

export function fulfilOrder(order: Order, log: Log): void {
  log.info(`Order ${order.id} (${order.productName}) is paid. Download link issued.`);

  for (const attempt of order.attempts) {
    const siblings = readRecord(attempt).verification?.payment?.siblingNoteIds ?? [];

    // Notes under one payment reference share a nullifier, so only one of them can ever be spent.
    if (siblings.length > 0) {
      log.warn(
        `Order ${order.id} attempt ${attempt.number} also received notes ${siblings.join(", ")}. ` +
          "Spend only the recorded note and review this order.",
      );
    }
  }
}
