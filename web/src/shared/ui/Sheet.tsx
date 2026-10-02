import type { ComponentProps } from "react";
import { cn } from "@/shared/lib/cn";

type SheetProps = ComponentProps<"section"> & {
  /** The spot colour printed a little off, behind the sheet. */
  offset?: "blue" | "pink" | "yellow" | "ink" | "none";
};

const OFFSETS = {
  blue: "shadow-print-blue",
  pink: "shadow-print-pink",
  yellow: "shadow-print-yellow",
  ink: "shadow-print-ink",
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
