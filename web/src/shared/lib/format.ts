/** Small display helpers. */

/** 0x1234…cdef: enough to recognise a hash, short enough for a table. */
export function shortHex(value: string, keep = 6): string {
  return value.length > keep * 2 + 3 ? `${value.slice(0, keep)}…${value.slice(-4)}` : value;
}

export function formatDateTime(iso: string | null): string {
  if (iso === null) return "not yet";

  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeStyle: "medium" }).format(date);
}
