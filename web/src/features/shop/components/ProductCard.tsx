import type { ProductView } from "@api";
import { formatPrice } from "@/shared/lib/money";
import { Button } from "@/shared/ui/Button";
import { Sheet } from "@/shared/ui/Sheet";
import { ProductArtwork } from "./ProductArtwork";

type ProductCardProps = {
  product: ProductView;
  offset: "blue" | "pink" | "yellow";
  buying: boolean;
  /** Another product's checkout is opening, so this one waits. */
  disabled: boolean;
  onBuy: () => void;
};

export function ProductCard({ product, offset, buying, disabled, onBuy }: ProductCardProps) {
  return (
    <Sheet offset={offset} aria-labelledby={`product-${product.id}`} className="flex flex-col">
      <div className="border-b-2 border-ink">
        <ProductArtwork artwork={product.artwork} />
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <h3 id={`product-${product.id}`} className="text-xl font-bold font-stretch-expanded">
              {product.name}
            </h3>
            <p className="text-lg font-semibold tabular-nums">{formatPrice(product.priceCents)}</p>
          </div>
          <p className="mt-1.5 leading-relaxed text-ink-muted">{product.description}</p>
        </div>

        <Button className="mt-auto w-full" busy={buying} disabled={disabled} onClick={onBuy}>
          {buying ? "Opening checkout…" : "Pay with Curvy"}
        </Button>
      </div>
    </Sheet>
  );
}
