/** A rubber stamp, pressed slightly crooked, in the shop's green ink. */
export function PaidStamp() {
  return (
    <p
      aria-hidden="true"
      className="inline-block -rotate-6 rounded-sm border-4 border-double border-green-ink px-4 py-1 text-3xl font-black text-green-ink font-stretch-expanded"
    >
      Paid
    </p>
  );
}
