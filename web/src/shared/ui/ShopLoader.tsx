/** A slab lifting off its footing and settling back: the shop is waiting on the chain. */
export function ShopLoader({ label }: { label: string }) {
  return (
    <svg role="img" aria-label={label} viewBox="0 0 64 48" className="h-12 w-16">
      <rect x="10" y="30" width="44" height="10" fill="var(--color-ink)" />
      <rect
        x="18"
        y="8"
        width="28"
        height="22"
        fill="var(--color-red)"
        className="animate-settle mix-blend-multiply"
      />
      <rect
        x="22"
        y="14"
        width="20"
        height="16"
        fill="var(--color-sky)"
        className="mix-blend-multiply"
      />
    </svg>
  );
}
