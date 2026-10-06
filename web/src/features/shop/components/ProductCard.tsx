import type { ProductView } from "@api";
import { cn } from "@/shared/lib/cn";
import { formatPrice } from "@/shared/lib/money";
import { Button } from "@/shared/ui/Button";
import { Sheet } from "@/shared/ui/Sheet";

type ProductCardProps = {
  product: ProductView;
  seriesSize: number;
  /** Leads the grid: twice as wide, with the caption beside the picture instead of under it. */
  featured?: boolean;
  offset: "sky" | "red" | "ochre";
  buying: boolean;
  /** Another product's checkout is opening, so this one waits. */
  disabled: boolean;
  onBuy: () => void;
};

/** One wallpaper: its thumbnail, then the poster's own caption set in the shop's type, and the price. */
export function ProductCard(props: ProductCardProps) {
  const { product, seriesSize, featured = false, offset, buying, disabled, onBuy } = props;
  const number = String(product.number).padStart(2, "0");

  return (
    <Sheet
      offset={offset}
      aria-labelledby={`product-${product.id}`}
      className={cn(
        "flex flex-col transition-[translate,box-shadow] duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5",
        featured && "sm:col-span-2 lg:flex-row",
      )}
    >
      <div
        className={cn(
          "border-ink",
          featured ? "border-b-2 lg:w-3/5 lg:border-r-2 lg:border-b-0" : "border-b-2",
        )}
      >
        <img
          src={product.thumbnail}
          alt={`${product.city}, ${product.subject}`}
          width={600}
          height={400}
          loading={featured ? "eager" : "lazy"}
          className="block aspect-[3/2] h-full w-full object-cover"
        />
      </div>

      <div className={cn("flex flex-1 flex-col gap-4 p-5", featured && "lg:justify-center lg:p-8")}>
        <div>
          <p className="flex justify-between poster-label text-ink-muted">
            <span>Yugoslavia</span>
            <span>
              {number} / {seriesSize}
            </span>
          </p>
          <h3
            id={`product-${product.id}`}
            className={cn("mt-3 poster-title", featured ? "text-5xl lg:text-6xl" : "text-4xl")}
          >
            {product.city}
          </h3>
          <p className="mt-2 poster-label text-ink">{product.subject}</p>
          <p
            className={cn(
              "mt-3 leading-relaxed text-ink-muted",
              featured ? "text-base" : "text-sm",
            )}
          >
            {product.note}
          </p>
        </div>

        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-4 border-t-2 border-dashed border-line pt-4",
            !featured && "mt-auto",
          )}
        >
          <p className="poster-label text-ink-muted">
            4K · PNG · <span className="text-ink">{formatPrice(product.price)}</span>
          </p>
          <Button className="whitespace-nowrap" busy={buying} disabled={disabled} onClick={onBuy}>
            {buying ? "Opening checkout…" : "Buy 4K wallpaper"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
