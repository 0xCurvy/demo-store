import { Sheet } from "@/shared/ui/Sheet";

/** Shown instead of the products until the server's settings are complete. */
export function SetupNeeded({ problems }: { problems: string[] }) {
  return (
    <Sheet offset="red" className="p-6 md:p-8">
      <h2 className="text-2xl font-bold font-stretch-expanded">This shop is not set up yet</h2>
      <p className="mt-2 max-w-prose leading-relaxed text-ink-muted">
        Fill in these values in <code className="font-mono text-ink">.env</code>, then restart the
        server. The README walks through each one.
      </p>

      <ul className="mt-5 space-y-2 border-t-2 border-ink pt-5">
        {problems.map((problem) => (
          <li key={problem} className="font-mono text-sm leading-relaxed break-words">
            {problem}
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
