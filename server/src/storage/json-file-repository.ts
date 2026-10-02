/**
 * Orders in one JSON file, loaded at startup and rewritten after each change. Enough for a demo
 * with one server process. Without a file path it keeps orders in memory only (used by tests).
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Order } from "../orders/order.js";
import { isOrderOpen } from "../orders/order-status.js";
import type { OrderRepository } from "./order-repository.js";

export class JsonFileRepository implements OrderRepository {
  private readonly orders = new Map<string, Order>();

  constructor(private readonly file: string | null = null) {
    if (file) this.load(file);
  }

  async create(order: Order): Promise<void> {
    if (this.orders.has(order.id)) throw new Error(`order ${order.id} already exists`);

    this.orders.set(order.id, structuredClone(order));
    this.save();
  }

  async get(id: string): Promise<Order | null> {
    const order = this.orders.get(id.toLowerCase());

    return order ? structuredClone(order) : null;
  }

  async update<T>(id: string, change: (order: Order) => T) {
    const stored = this.orders.get(id.toLowerCase());

    if (!stored) return null;

    // Changes run synchronously on a copy, so no other request can interleave with them.
    const order = structuredClone(stored);
    const result = change(order);

    if (JSON.stringify(order) !== JSON.stringify(stored)) {
      this.orders.set(order.id, order);
      this.save();
    }

    return { order: structuredClone(order), result };
  }

  async recent(limit: number): Promise<Order[]> {
    return [...this.orders.values()]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit)
      .map((order) => structuredClone(order));
  }

  async open(): Promise<Order[]> {
    return [...this.orders.values()].filter(isOrderOpen).map((order) => structuredClone(order));
  }

  async byDownloadToken(token: string): Promise<Order | null> {
    for (const order of this.orders.values()) {
      if (order.download?.token === token) return structuredClone(order);
    }

    return null;
  }

  private load(file: string): void {
    try {
      const saved = JSON.parse(readFileSync(file, "utf8")) as { orders: Order[] };

      for (const order of saved.orders) this.orders.set(order.id, order);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  /** Write a temporary file and rename it, so a crash never leaves half a file behind. */
  private save(): void {
    if (!this.file) return;

    mkdirSync(dirname(this.file), { recursive: true });

    const temporary = `${this.file}.tmp`;

    writeFileSync(temporary, JSON.stringify({ orders: [...this.orders.values()] }, null, 2));
    renameSync(temporary, this.file);
  }
}
