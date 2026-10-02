/** Two ink layers drifting in and out of registration: the shop is waiting on the chain. */
export function OverprintLoader({ label }: { label: string }) {
  return (
    <svg role="img" aria-label={label} viewBox="0 0 64 48" className="h-12 w-16">
      <circle cx="26" cy="24" r="16" fill="var(--color-blue)" />
      <circle
        cx="36"
        cy="22"
        r="16"
        fill="var(--color-pink)"
        className="animate-register mix-blend-multiply"
      />
    </svg>
  );
}
