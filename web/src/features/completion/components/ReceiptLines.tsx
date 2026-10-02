import type { ReactNode } from "react";

export type ReceiptLine = { label: string; value: ReactNode };

/** Label and value pairs, set like the lines of a paper receipt. */
export function ReceiptLines({ lines }: { lines: ReceiptLine[] }) {
  return (
    <dl className="divide-y divide-dashed divide-line">
      {lines.map((line) => (
        <div key={line.label} className="flex items-baseline justify-between gap-6 py-3">
          <dt className="text-ink-muted">{line.label}</dt>
          <dd className="min-w-0 text-right font-semibold break-words tabular-nums">
            {line.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
