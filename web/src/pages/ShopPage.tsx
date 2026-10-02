import { HowItWorks } from "@/features/shop/components/HowItWorks";
import { NetworkNote } from "@/features/shop/components/NetworkNote";
import { ProductCard } from "@/features/shop/components/ProductCard";
import { SetupNeeded } from "@/shared/ui/SetupNeeded";
import { useBuy } from "@/features/shop/hooks/useBuy";
import { useShop } from "@/features/shop/hooks/useShop";
import { errorMessage } from "@/shared/api/client";
import { Notice } from "@/shared/ui/Notice";
import { OverprintLoader } from "@/shared/ui/OverprintLoader";

const OFFSETS = ["blue", "pink", "yellow"] as const;

export function ShopPage() {
  const shop = useShop();
  const buy = useBuy();
  const opening = buy.isPending || buy.isSuccess;

  return (
    <div className="space-y-16">
      <section className="max-w-3xl">
        <h1 className="text-4xl leading-[1.05] font-extrabold text-balance font-stretch-expanded md:text-6xl">
          Prints, stickers and postcards
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-muted">
          A demo shop for Curvy checkout. Pick something, pay from your wallet on Curvy&apos;s
          checkout page, and come back to watch the shop confirm the payment on chain.
        </p>
      </section>

      {shop.isPending && <OverprintLoader label="Loading the shop" />}

      {shop.isError && (
        <Notice tone="warning" title="The shop did not load">
          {errorMessage(shop.error)} Is the server running?
        </Notice>
      )}

      {shop.data && !shop.data.ready && <SetupNeeded problems={shop.data.problems} />}

      {shop.data?.ready && (
        <section aria-label="Products" className="space-y-8">
          <NetworkNote chainId={shop.data.chainId} token={shop.data.token} />

          {buy.isError && (
            <Notice tone="warning" title="Checkout did not open">
              {errorMessage(buy.error)}
            </Notice>
          )}

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {shop.data.products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                offset={OFFSETS[index % OFFSETS.length] ?? "blue"}
                buying={opening && buy.variables === product.id}
                disabled={opening}
                onBuy={() => buy.mutate(product.id)}
              />
            ))}
          </div>
        </section>
      )}

      <HowItWorks />
    </div>
  );
}
