import { AgentPrompts } from "@/features/agents/components/AgentPrompts";
import { useAgentCatalogue } from "@/features/agents/hooks/useAgentCatalogue";
import { errorMessage } from "@/shared/api/client";
import { formatPrice } from "@/shared/lib/money";
import { Notice } from "@/shared/ui/Notice";
import { Sheet } from "@/shared/ui/Sheet";
import { ShopLoader } from "@/shared/ui/ShopLoader";

/** How an agent buys a wallpaper: two prompts to paste into it, then what happens underneath. */
export function AgentsPage() {
  const catalogue = useAgentCatalogue();
  const data = catalogue.data;
  const first = data?.resources[0];

  return (
    <div className="space-y-16">
      <section>
        <p className="border-b-2 border-ink pb-3 poster-label text-ink-muted">
          Curvy Payments demo
        </p>
        <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-end">
          <h1 className="text-6xl poster-title text-balance md:text-8xl">For agents</h1>
          <p className="max-w-md leading-relaxed text-ink-muted md:pb-3">
            Every wallpaper here is also something your agent can buy on its own. Two prompts below:
            one gives the agent a wallet, one tells it how to buy. Copy, paste, done. The money
            lands in the shop&apos;s private Curvy balance, the same place human checkouts go.
          </p>
        </div>
      </section>

      {catalogue.isPending && <ShopLoader label="Loading the catalogue" />}

      {catalogue.isError && (
        <Notice tone="warning" title="The catalogue did not load">
          {errorMessage(catalogue.error)}
        </Notice>
      )}

      {data && (
        <>
          <Sheet offset="sky" className="p-6 md:p-8">
            <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Price per wallpaper", value: first ? first.price : "" },
                { label: "Network", value: `${data.network} · Arbitrum One` },
                { label: "Token", value: `${data.asset.symbol} · ${data.asset.decimals} decimals` },
                {
                  label: "Schemes offered",
                  value: data.schemes.length ? data.schemes.join(", ") : "none right now",
                },
              ].map((fact) => (
                <div key={fact.label} className="border-t-2 border-ink pt-3">
                  <dt className="poster-label text-ink-muted">{fact.label}</dt>
                  <dd className="mt-1 font-mono text-sm break-all">{fact.value}</dd>
                </div>
              ))}
            </dl>
            {data.unavailable && (
              <div className="mt-6">
                <Notice tone="warning" title="Agent payments are not available right now">
                  {data.unavailable}
                </Notice>
              </div>
            )}
          </Sheet>

          <AgentPrompts catalogue={data} />

          <section className="space-y-6">
            <h2 className="text-4xl poster-title">What happens underneath</h2>
            <ol className="grid gap-6 md:grid-cols-2">
              {data.steps.map((step, index) => (
                <li key={step} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-ink font-bold text-sheet"
                  >
                    {index + 1}
                  </span>
                  <p className="leading-relaxed text-ink-muted">{step}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="space-y-6">
            <h2 className="text-4xl poster-title">The resources</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-2xl text-left text-sm">
                <thead>
                  <tr className="poster-label text-ink-muted">
                    <th className="pr-4 pb-2 font-medium">Wallpaper</th>
                    <th className="pr-4 pb-2 font-medium">Resource</th>
                    <th className="pb-2 text-right font-medium">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {data.resources.map((resource) => (
                    <tr key={resource.id} className="border-t border-line align-top">
                      <td className="py-3 pr-4 font-semibold">{resource.name}</td>
                      <td className="py-3 pr-4 font-mono text-xs break-all">{resource.url}</td>
                      <td className="py-3 text-right tabular-nums">
                        {formatPrice(resource.price.split(" ")[0] ?? "")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <Notice title="What the agent gets, and what it does not">
            One payment buys one download of one wallpaper, delivered as the body of the paid
            response. The shop never sees the agent&apos;s balance or history, and the agent never
            sees the shop&apos;s: Curvy screens the payment, then shields it into the shop&apos;s
            private balance. Pay exactly the amount in the challenge; a payment the broadcaster
            refuses is not returned.
          </Notice>
        </>
      )}
    </div>
  );
}
