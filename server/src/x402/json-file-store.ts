/**
 * Agent payments in one JSON file, the Node server's store (the Worker keeps them in D1). `claim` is the atomic
 * status move the SDK uses so one challenge settles once; in a single process a plain check-and-set is atomic.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type {
  X402Payment,
  X402PaymentStatus,
  X402PaymentStore,
} from "@0xcurvy/payments-sdk/x402/merchant";

export class JsonFileX402Store implements X402PaymentStore {
  private readonly payments = new Map<string, X402Payment>();

  constructor(private readonly file: string | null = null) {
    if (file) this.load(file);
  }

  get(payTo: string): X402Payment | undefined {
    const payment = this.payments.get(payTo.toLowerCase());

    return payment ? structuredClone(payment) : undefined;
  }

  put(payment: X402Payment): void {
    this.payments.set(payment.payTo.toLowerCase(), structuredClone(payment));
    this.save();
  }

  list(): X402Payment[] {
    return [...this.payments.values()].map((payment) => structuredClone(payment));
  }

  claim(payTo: string, from: X402PaymentStatus, to: X402PaymentStatus): boolean {
    const payment = this.payments.get(payTo.toLowerCase());

    if (!payment || payment.status !== from) return false;

    payment.status = to;
    this.save();

    return true;
  }

  private load(file: string): void {
    try {
      const saved = JSON.parse(readFileSync(file, "utf8")) as { payments: X402Payment[] };

      for (const payment of saved.payments) this.payments.set(payment.payTo.toLowerCase(), payment);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  /** Write a temporary file and rename it, so a crash never leaves half a file behind. */
  private save(): void {
    if (!this.file) return;

    mkdirSync(dirname(this.file), { recursive: true });

    const temporary = `${this.file}.tmp`;

    writeFileSync(temporary, JSON.stringify({ payments: [...this.payments.values()] }, null, 2));
    renameSync(temporary, this.file);
  }
}
