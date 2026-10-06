/**
 * The background job: checks every open order on chain, so orders complete even when the buyer
 * closes the tab before returning to the shop. Runs every few seconds and on demand from the admin page.
 */
import { describeError, type Log } from "../log.js";
import type { Payments } from "../payments/payments.js";
import type { OrderRepository } from "../storage/order-repository.js";
import type { AgentPayments, SweepSummary } from "../x402/agent-payments.js";
import { expireIfOverdue, isWorthChecking } from "./attempt.js";
import type { Order } from "./order.js";
import { updateOrderStatus } from "./order-status.js";
import type { PaymentChecker } from "./payment-checker.js";

/** Most attempts checked in one run. The ones checked longest ago go first. */
const MAX_CHECKS_PER_RUN = 25;

export interface ReconcileSummary {
  openOrders: number;
  checked: number;
  expired: number;
  failed: number;
  paid: string[];
  /** Another run was still going, so this one did nothing. */
  skipped: boolean;
  /** Agent payments pushed forward in the same run; null when none were due or the merchant is unavailable. */
  agents: SweepSummary | null;
}

export interface ReconcilerDeps {
  repository: OrderRepository;
  payments: Payments;
  checker: PaymentChecker;
  agents?: AgentPayments;
  log: Log;
  now?: () => number;
}

export type Reconciler = ReturnType<typeof createReconciler>;

type DueCheck = { orderId: Order["id"]; index: number; checkedAt: number };

export function createReconciler(deps: ReconcilerDeps) {
  const { repository, payments, checker, agents, log } = deps;
  const now = deps.now ?? Date.now;
  let running = false;

  /** Expire overdue attempts and list the ones worth checking on chain. */
  async function collectDueChecks(summary: ReconcileSummary): Promise<DueCheck[]> {
    const nowSeconds = Math.floor(now() / 1_000);
    const due: DueCheck[] = [];

    for (const order of await repository.open()) {
      summary.openOrders += 1;

      for (const [index, attempt] of order.attempts.entries()) {
        if (expireIfOverdue(structuredClone(attempt), nowSeconds)) {
          const expired = await repository.update(order.id, (current) => {
            const target = current.attempts[index];

            if (!target || !expireIfOverdue(target, nowSeconds)) return false;

            updateOrderStatus(current);

            return true;
          });

          if (expired?.result) summary.expired += 1;

          continue;
        }

        if (isWorthChecking(attempt, nowSeconds)) {
          due.push({ orderId: order.id, index, checkedAt: attempt.checkedAt });
        }
      }
    }

    return due.sort((left, right) => left.checkedAt - right.checkedAt);
  }

  async function checkOpenOrders(): Promise<ReconcileSummary> {
    const summary: ReconcileSummary = {
      openOrders: 0,
      checked: 0,
      expired: 0,
      failed: 0,
      paid: [],
      skipped: running,
      agents: null,
    };

    if (running) return summary;

    running = true;

    try {
      // Agent payments first: each step is quick, and a note that just shielded shows up in the same run.
      if (agents) {
        try {
          summary.agents = await agents.sweep();
        } catch (error) {
          log.warn(`Agent payments were not swept: ${describeError(error)}`);
        }
      }

      const due = await collectDueChecks(summary);

      if (due.length === 0) return summary;

      // Read once, before any scan: every scan below covers at least up to this block.
      const head = await payments.blockNumber();

      for (const { orderId, index } of due.slice(0, MAX_CHECKS_PER_RUN)) {
        summary.checked += 1;

        try {
          await checker.checkAttempt(orderId, index, head);

          const order = await repository.get(orderId);

          const newlyPaid = order?.status === "paid" && !summary.paid.includes(orderId);

          if (newlyPaid) summary.paid.push(orderId);
        } catch (error) {
          summary.failed += 1;

          log.error(
            `Could not check order ${orderId} attempt ${index + 1}: ${describeError(error)}`,
          );
        }
      }

      return summary;
    } finally {
      running = false;
    }
  }

  /** Run `checkOpenOrders` every `seconds`. Returns a function that stops it. */
  function start(seconds: number): () => void {
    const timer = setInterval(() => {
      checkOpenOrders().catch((error) =>
        log.error(`Payment check failed: ${describeError(error)}`),
      );
    }, seconds * 1_000);

    timer.unref();

    return () => clearInterval(timer);
  }

  return { checkOpenOrders, start };
}
