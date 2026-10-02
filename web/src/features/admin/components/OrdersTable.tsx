import type { AdminOrderView } from "@api";
import { OrderRow } from "./OrderRow";

const HEADINGS = ["Order", "Status", "Price", "Received", "Created", ""];

type OrdersTableProps = {
  orders: AdminOrderView[];
  /** The shop counts an order paid once Curvy commits it. */
  paidOnCommit: boolean;
  nowSeconds: number;
};

export function OrdersTable({ orders, paidOnCommit, nowSeconds }: OrdersTableProps) {
  if (orders.length === 0) {
    return (
      <p className="text-ink-muted">No orders yet. Buy something in the shop to see it here.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-3xl text-left">
        <thead>
          <tr className="text-sm text-ink-muted">
            {HEADINGS.map((heading) => (
              <th key={heading} scope="col" className="pr-4 pb-2 font-medium">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              paidOnCommit={paidOnCommit}
              nowSeconds={nowSeconds}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
