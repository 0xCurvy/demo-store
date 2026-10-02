import { HowItWorks } from "@/features/shop/components/HowItWorks";
import { NetworkNote } from "@/features/shop/components/NetworkNote";
import { ProductCard } from "@/features/shop/components/ProductCard";
import { SetupNeeded } from "@/shared/ui/SetupNeeded";
import { useBuy } from "@/features/shop/hooks/useBuy";
import { useShop } from "@/features/shop/hooks/useShop";
import { errorMessage } from "@/shared/api/client";
import { Notice } from "@/shared/ui/Notice";
import { ShopLoader } from "@/shared/ui/ShopLoader";

const OFFSETS = ["sky", "red", "ochre"] as const;

export function ShopPage() {
  const shop = useShop();
  const buy = useBuy();
  const opening = buy.isPending || buy.isSuccess;
  const seriesSize = shop.data?.ready ? shop.data.seriesSize : 0;

  return (
    <div className="space-y-16">
      {/* The posters' own header: a tracked label over a rule, then the title set like a city name. */}
      <section>
        <p className="border-b-2 border-ink pb-3 poster-label text-ink-muted">
          Curvy Payments demo
        </p>
        <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-end">
          <h1 className="text-6xl poster-title text-balance md:text-8xl lg:text-9xl">
            Brutalism in 4K
          </h1>
          <p className="max-w-md leading-relaxed text-ink-muted md:pb-3">
            Wallpapers of Yugoslav towers, blocks and spomeniks. You see the thumbnail. Pay from
            your wallet on Curvy&apos;s checkout page, come back, and a link that works once
            downloads the full file. A demo shop for Curvy checkout.
          </p>
        </div>
      </section>

      {shop.isPending && <ShopLoader label="Loading the shop" />}

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

          {/* The first wallpaper leads across the full width; the rest follow two by two. */}
          <div className="grid gap-8 sm:grid-cols-2 lg:gap-10">
            {shop.data.products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                seriesSize={seriesSize}
                featured={index === 0}
                offset={OFFSETS[index % OFFSETS.length] ?? "sky"}
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
