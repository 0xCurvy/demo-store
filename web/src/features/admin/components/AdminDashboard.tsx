import type { AdminOverview } from "@api";
import { errorMessage } from "@/shared/api/client";
import { formatTime } from "@/shared/lib/format";
import { Button } from "@/shared/ui/Button";
import { Notice } from "@/shared/ui/Notice";
import { useCheckPayments } from "../hooks/useCheckPayments";
import { OrdersTable } from "./OrdersTable";
import { ShopSettings } from "./ShopSettings";
import { Totals } from "./Totals";

type AdminDashboardProps = {
  overview: AdminOverview;
  updatedAt: number;
  token: string;
  onSignOut: () => void;
};

export function AdminDashboard({ overview, updatedAt, token, onSignOut }: AdminDashboardProps) {
  const check = useCheckPayments(token);
  const run = check.data;

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold font-stretch-expanded">Orders</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Updated at {formatTime(new Date(updatedAt))}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-5">
          <Button variant="secondary" busy={check.isPending} onClick={() => check.mutate()}>
            {check.isPending ? "Checking payments…" : "Check payments now"}
          </Button>
          <Button variant="quiet" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </header>

      {run && (
        <Notice title="Payment check finished">
          Checked {run.checked} of {run.openOrders} open orders; {run.paid.length} newly paid,{" "}
          {run.expired} expired, {run.failed} could not reach the chain.
        </Notice>
      )}

      {check.isError && (
        <Notice tone="warning" title="The payment check did not run">
          {errorMessage(check.error)}
        </Notice>
      )}

      <Totals totals={overview.totals} />
      <OrdersTable
        orders={overview.orders}
        paidOnCommit={overview.settings.paidWhen === "committed"}
        nowSeconds={Math.floor(updatedAt / 1_000)}
      />
      <ShopSettings settings={overview.settings} />
    </div>
  );
}
