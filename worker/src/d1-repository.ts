/**
 * Orders in D1: the same JSON the Node server kept in its file, one row per order, with the columns the shop
 * queries by kept alongside. Writes are optimistic: an update re-reads the row, applies the change, and writes
 * back only if nobody else wrote in between, trying again otherwise. Several Worker instances may serve the
 * same order at once; this keeps two checks from overwriting each other, as the file store's single process did.
 */
import type { Order } from "../../server/src/orders/order.js";
import { isOrderOpen } from "../../server/src/orders/order-status.js";
import type { OrderRepository } from "../../server/src/storage/order-repository.js";

type Row = { data: string; version: number };

const MAX_WRITE_ATTEMPTS = 5;

export class D1OrderRepository implements OrderRepository {
  constructor(private readonly db: D1Database) {}

  async create(order: Order): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO orders (id, status, open, created_at, download_token, version, data) VALUES (?, ?, ?, ?, ?, 1, ?)",
      )
      .bind(
        order.id,
        order.status,
        isOrderOpen(order) ? 1 : 0,
        order.createdAt,
        order.download?.token ?? null,
        JSON.stringify(order),
      )
      .run();
  }

  async get(id: string): Promise<Order | null> {
    const row = await this.db
      .prepare("SELECT data FROM orders WHERE id = ?")
      .bind(id.toLowerCase())
      .first<{ data: string }>();

    return row ? (JSON.parse(row.data) as Order) : null;
  }

  async update<T>(id: string, change: (order: Order) => T) {
    for (let attempt = 1; attempt <= MAX_WRITE_ATTEMPTS; attempt += 1) {
      const row = await this.db
        .prepare("SELECT data, version FROM orders WHERE id = ?")
        .bind(id.toLowerCase())
        .first<Row>();

      if (!row) return null;

      const order = JSON.parse(row.data) as Order;
      const result = change(order);
      const data = JSON.stringify(order);

      if (data === row.data) return { order, result };

      const written = await this.db
        .prepare(
          "UPDATE orders SET data = ?, status = ?, open = ?, download_token = ?, version = version + 1 WHERE id = ? AND version = ?",
        )
        .bind(
          data,
          order.status,
          isOrderOpen(order) ? 1 : 0,
          order.download?.token ?? null,
          order.id,
          row.version,
        )
        .run();

      if (written.meta.changes === 1) return { order, result };
    }

    throw new Error(`order ${id} kept changing while it was being updated; try again`);
  }

  async recent(limit: number): Promise<Order[]> {
    const { results } = await this.db
      .prepare("SELECT data FROM orders ORDER BY created_at DESC LIMIT ?")
      .bind(limit)
      .all<{ data: string }>();

    return results.map((row) => JSON.parse(row.data) as Order);
  }

  async open(): Promise<Order[]> {
    const { results } = await this.db
      .prepare("SELECT data FROM orders WHERE open = 1 ORDER BY created_at")
      .all<{ data: string }>();

    return results.map((row) => JSON.parse(row.data) as Order);
  }

  async byDownloadToken(token: string): Promise<Order | null> {
    const row = await this.db
      .prepare("SELECT data FROM orders WHERE download_token = ?")
      .bind(token)
      .first<{ data: string }>();

    return row ? (JSON.parse(row.data) as Order) : null;
  }
}
