import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

type NoticeProps = {
  tone?: "info" | "warning";
  title?: string;
  children: ReactNode;
};

export function Notice({ tone = "info", title, children }: NoticeProps) {
  return (
    <div
      role={tone === "warning" ? "alert" : "status"}
      className={cn(
        "border-l-4 bg-sheet px-4 py-3 text-sm leading-relaxed",
        tone === "warning" ? "border-red" : "border-sky",
      )}
    >
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <div className="text-ink-muted">{children}</div>
    </div>
  );
}
