/**
 * Agent payments in D1: the SDK's payment record as JSON, with the status beside it so `claim` can be one
 * conditional UPDATE. Several Worker instances share this store, so that atomic move is what keeps a challenge
 * from being settled twice.
 */
import type {
  X402Payment,
  X402PaymentStatus,
  X402PaymentStore,
} from "@0xcurvy/payments-sdk/x402/merchant";

export class D1X402Store implements X402PaymentStore {
  constructor(private readonly db: D1Database) {}

  async get(payTo: string): Promise<X402Payment | undefined> {
    const row = await this.db
      .prepare("SELECT data FROM agent_payments WHERE pay_to = ?")
      .bind(payTo.toLowerCase())
      .first<{ data: string }>();

    return row ? (JSON.parse(row.data) as X402Payment) : undefined;
  }

  async put(payment: X402Payment): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO agent_payments (pay_to, status, created_at, data) VALUES (?, ?, ?, ?) " +
          "ON CONFLICT (pay_to) DO UPDATE SET status = excluded.status, data = excluded.data",
      )
      .bind(payment.payTo.toLowerCase(), payment.status, payment.createdAt, JSON.stringify(payment))
      .run();
  }

  async list(): Promise<X402Payment[]> {
    const { results } = await this.db
      .prepare("SELECT data FROM agent_payments ORDER BY created_at DESC")
      .all<{ data: string }>();

    return results.map((row) => JSON.parse(row.data) as X402Payment);
  }

  async claim(payTo: string, from: X402PaymentStatus, to: X402PaymentStatus): Promise<boolean> {
    const written = await this.db
      .prepare(
        "UPDATE agent_payments SET status = ?, data = json_set(data, '$.status', ?) WHERE pay_to = ? AND status = ?",
      )
      .bind(to, to, payTo.toLowerCase(), from)
      .run();

    return written.meta.changes === 1;
  }
}
