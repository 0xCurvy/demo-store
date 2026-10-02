import type { ComponentProps } from "react";
import { cn } from "@/shared/lib/cn";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "quiet";
  /** Shows the work in progress and blocks a second click. */
  busy?: boolean;
};

const VARIANTS = {
  primary: "bg-ink text-sheet enabled:hover:-translate-0.5 enabled:hover:shadow-print-pink",
  secondary:
    "border-2 border-ink bg-sheet text-ink enabled:hover:-translate-0.5 enabled:hover:shadow-print-ink",
  quiet: "px-0 text-blue-ink underline decoration-2 underline-offset-4 enabled:hover:text-ink",
};

export function Button({
  variant = "primary",
  busy = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-5 font-semibold transition-[translate,box-shadow] duration-150",
        "disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
