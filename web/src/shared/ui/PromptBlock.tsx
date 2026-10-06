import { useEffect, useState } from "react";
import { cn } from "@/shared/lib/cn";

type PromptBlockProps = {
  /** The line above the box: what this prompt does. */
  title: string;
  /** A tag beside the title, such as "Optional". */
  tag?: string;
  /** Who it is for, shown as the composer's placeholder line. */
  audience: string;
  children: string;
};

/**
 * A prompt the way people meet them every day: a composer box with the text ready to copy and paste into their
 * agent. The whole text goes to the clipboard in one click.
 */
export function PromptBlock({ title, tag, audience, children }: PromptBlockProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timer = setTimeout(() => setCopied(false), 2_000);

    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section aria-label={title} className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-3">
        <h3 className="text-2xl poster-title">{title}</h3>
        {tag && (
          <span className="rounded-sm border border-ink px-2 py-0.5 poster-label text-ink-muted">
            {tag}
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border-2 border-ink bg-ink text-sheet shadow-print-ink">
        <div className="flex items-center justify-between gap-4 border-b border-sheet/15 px-4 py-2.5">
          <p className="poster-label text-sheet/60">{audience}</p>
          <button
            type="button"
            onClick={copy}
            className={cn(
              "cursor-pointer rounded-sm border px-3 py-1 text-xs font-semibold transition-colors",
              copied
                ? "border-green bg-green text-sheet"
                : "border-sheet/40 text-sheet hover:bg-sheet hover:text-ink",
            )}
          >
            {copied ? "Copied" : "Copy prompt"}
          </button>
        </div>
        <pre className="m-0 max-h-[32rem] overflow-auto px-5 py-4 font-mono text-[13px] leading-relaxed whitespace-pre-wrap">
          {children}
        </pre>
        <div className="flex items-center gap-2 border-t border-sheet/15 px-4 py-2.5 text-xs text-sheet/50">
          <span
            aria-hidden="true"
            className="inline-block size-2 animate-settle rounded-full bg-sheet/60"
          />
          Paste into Claude Code, Codex, Cursor or any agent that can run code and reach the
          internet.
        </div>
      </div>
    </section>
  );
}
