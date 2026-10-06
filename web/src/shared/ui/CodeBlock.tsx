/** A block of code or terminal output, set in the shop's mono face on a dark sheet. */
export function CodeBlock({ title, children }: { title?: string; children: string }) {
  return (
    <figure className="m-0 overflow-hidden rounded-sm border-2 border-ink bg-ink text-sheet">
      {title && (
        <figcaption className="border-b border-sheet/20 px-4 py-2 poster-label text-sheet/70">
          {title}
        </figcaption>
      )}
      <pre className="m-0 overflow-x-auto px-4 py-3 font-mono text-[13px] leading-relaxed">
        <code>{children}</code>
      </pre>
    </figure>
  );
}
