import type { ComponentProps } from "react";
import { cn } from "@/shared/lib/cn";

type SheetProps = ComponentProps<"section"> & {
  /** The spot colour printed a little off, behind the sheet. */
  offset?: "sky" | "red" | "ochre" | "ink" | "none";
};

/** The offset shadow, and the same colour as `--offset-color` for anything inside that wants to match it. */
const OFFSETS = {
  sky: "shadow-print-sky [--offset-color:var(--color-sky)]",
  red: "shadow-print-red [--offset-color:var(--color-red)]",
  ochre: "shadow-print-ochre [--offset-color:var(--color-ochre)]",
  ink: "shadow-print-ink [--offset-color:var(--color-ink)]",
  none: "",
};

/** A sheet of paper on the table: the shop's one container. */
export function Sheet({ offset = "none", className, ...props }: SheetProps) {
  return (
    <section
      className={cn("rounded-sm border-2 border-ink bg-sheet", OFFSETS[offset], className)}
      {...props}
    />
  );
}
