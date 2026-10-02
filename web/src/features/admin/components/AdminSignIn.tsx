import { type FormEvent, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { Sheet } from "@/shared/ui/Sheet";

type AdminSignInProps = {
  /** Why the last token did not work, if it did not. */
  problem: string | null;
  onSignIn: (token: string) => void;
};

export function AdminSignIn({ problem, onSignIn }: AdminSignInProps) {
  const [token, setToken] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    onSignIn(token.trim());
  }

  return (
    <Sheet offset="ink" className="mx-auto max-w-md p-6 md:p-8">
      <h1 className="text-3xl font-extrabold font-stretch-expanded">Orders</h1>
      <p className="mt-2 leading-relaxed text-ink-muted">
        Enter the <code className="font-mono text-ink">ADMIN_TOKEN</code> from the server&apos;s{" "}
        <code className="font-mono text-ink">.env</code> to see the shop&apos;s orders.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="admin-token" className="mb-2 block font-semibold">
            Admin token
          </label>
          <input
            id="admin-token"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={token}
            onChange={(event) => setToken(event.target.value)}
            aria-describedby={problem ? "admin-token-problem" : undefined}
            className="min-h-11 w-full rounded-sm border-2 border-ink bg-sheet px-3 font-mono"
          />
          {problem && (
            <p id="admin-token-problem" role="alert" className="mt-2 text-sm text-red-ink">
              {problem}
            </p>
          )}
        </div>

        <Button type="submit" disabled={!token.trim()}>
          Open orders
        </Button>
      </form>
    </Sheet>
  );
}
