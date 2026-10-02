import type { OrderStatus } from "@api";
import { cn } from "@/shared/lib/cn";
import { STATUS_LABELS, STATUS_TONES } from "@/shared/lib/status";

const TONES = {
  done: "border-green-ink text-green-ink",
  waiting: "border-blue-ink text-blue-ink",
  problem: "border-pink-ink text-pink-ink",
};

export function StatusLabel({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border-2 px-2.5 py-0.5 text-sm font-semibold whitespace-nowrap",
        TONES[STATUS_TONES[status]],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
