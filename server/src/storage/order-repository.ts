/**
 * Where orders live. The demo keeps them in a JSON file (`json-file-repository.ts`); a real shop
 * would put the same methods over its database.
 */
import type { Order } from "../orders/order.js";

export interface OrderRepository {
  create(order: Order): Promise<void>;
  get(id: string): Promise<Order | null>;
  /**
   * Change one order in a single write. `change` edits the order it is given and returns anything
   * the caller wants back. Nothing is written when it changes nothing. Null for an unknown order.
   */
  update<T>(id: string, change: (order: Order) => T): Promise<{ order: Order; result: T } | null>;
  /** The newest orders first. */
  recent(limit: number): Promise<Order[]>;
  /** Orders that are not paid yet and still have an attempt worth checking. */
  open(): Promise<Order[]>;
  /** The order whose download link carries this token. */
  byDownloadToken(token: string): Promise<Order | null>;
}
