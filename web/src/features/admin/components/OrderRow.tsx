import type { AdminOrderView } from "@api";
import { useState } from "react";
import { formatDateTime, shortHex } from "@/shared/lib/format";
import { formatPrice, formatToken } from "@/shared/lib/money";
import { StatusLabel } from "@/shared/ui/StatusLabel";
import { AttemptDetails } from "./AttemptDetails";

const COLUMNS = 6;

/** One order, with its payment attempts behind a Details toggle. */
type OrderRowProps = { order: AdminOrderView; paidOnCommit: boolean; nowSeconds: number };

export function OrderRow({ order, paidOnCommit, nowSeconds }: OrderRowProps) {
  const [open, setOpen] = useState(false);
  const detailsId = `order-${order.id}`;

  return (
    <>
      <tr className="border-t border-line align-top">
        <td className="py-3 pr-4">
          <p className="font-semibold">{order.productName}</p>
          <p className="font-mono text-xs text-ink-muted">{shortHex(order.id)}</p>
          {order.downloadedAt && (
            <p className="mt-1 text-xs text-green-ink">
              Downloaded {formatDateTime(order.downloadedAt)}
            </p>
          )}
        </td>
        <td className="py-3 pr-4">
          <StatusLabel status={order.status} />
        </td>
        <td className="py-3 pr-4 tabular-nums">{formatPrice(order.price)}</td>
        <td className="py-3 pr-4 tabular-nums">{formatToken(order.netReceived, order.token)}</td>
        <td className="py-3 pr-4 whitespace-nowrap">{formatDateTime(order.createdAt)}</td>
        <td className="py-3 text-right">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={detailsId}
            onClick={() => setOpen(!open)}
            className="font-semibold text-sky-ink underline underline-offset-4"
          >
            {open ? "Hide" : "Details"}
          </button>
        </td>
      </tr>

      {open && (
        <tr id={detailsId}>
          <td colSpan={COLUMNS} className="space-y-6 bg-paper px-4 py-5">
            {order.attempts.map((attempt) => (
              <AttemptDetails
                key={attempt.number}
                attempt={attempt}
                chainId={order.chainId}
                nowSeconds={nowSeconds}
                paidOnCommit={paidOnCommit}
                token={order.token}
              />
            ))}
          </td>
        </tr>
      )}
    </>
  );
}
