import { Link } from "@tanstack/react-router";
import { Heart, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ProductImage } from "@/components/common/ProductImage";
import { Price, ProductBadge } from "@/components/store/Price";
import { QuickAddDialog } from "@/components/store/QuickAddDialog";
import { garmentFor } from "@/lib/catalog";
import { displayBadges, totalStock, type ProductCard as ProductCardData } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useWishlist } from "@/lib/wishlist";

export function ProductCard({
  product,
  eager = false,
}: {
  product: ProductCardData;
  eager?: boolean;
}) {
  const [quickAdd, setQuickAdd] = useState(false);
  const wishlist = useWishlist();
  const saved = wishlist.has(product.id);
  const soldOut = totalStock(product) === 0;
  const image = product.product_images[0];

  return (
    <article className="group relative flex flex-col">
      <div className="relative">
        <Link
          to="/product/$slug"
          params={{ slug: product.slug }}
          className="block overflow-hidden rounded-xl"
          aria-label={product.name}
          tabIndex={-1}
        >
          <ProductImage
            src={image?.url}
            alt={image?.alt || product.name}
            garment={garmentFor(product.category?.slug, product.slug)}
            color={product.color}
            seed={product.slug}
            eager={eager}
            className="aspect-[4/5] w-full"
            imgClassName="transition-transform duration-500 group-hover:scale-105"
          />
        </Link>

        <div className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-1">
          {soldOut ? <ProductBadge value="sold-out" className="bg-ink text-offwhite" /> : null}
          {!soldOut && displayBadges(product).map((b) => <ProductBadge key={b} value={b} />)}
        </div>

        <button
          type="button"
          onClick={() => {
            const added = wishlist.toggle(product.id);
            toast(added ? "Saved to wishlist" : "Removed from wishlist");
          }}
          aria-pressed={saved}
          aria-label={
            saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`
          }
          className="absolute right-2 top-2 inline-flex size-11 items-center justify-center rounded-full bg-card/90 text-card-foreground shadow-sm transition hover:scale-105"
        >
          <Heart
            className={cn("size-5", saved && "fill-destructive text-destructive")}
            aria-hidden="true"
          />
        </button>

        {!soldOut ? (
          <button
            type="button"
            onClick={() => setQuickAdd(true)}
            aria-label={`Quick add ${product.name}`}
            className={cn(
              "absolute bottom-2 right-2 inline-flex h-11 items-center gap-1 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground shadow-lg transition",
              // Always visible on touch screens; revealed on hover or focus where hover exists.
              "[@media(hover:hover)]:translate-y-2 [@media(hover:hover)]:opacity-0",
              "group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100",
            )}
          >
            <Plus className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Quick add</span>
            <span className="sm:hidden">Add</span>
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-1">
        <h3 className="font-sans text-sm font-semibold leading-snug tracking-normal">
          <Link
            to="/product/$slug"
            params={{ slug: product.slug }}
            className="inline-flex min-h-11 items-center hover:underline"
          >
            {product.name}
          </Link>
        </h3>
        <Price price={product.price} compareAt={product.compare_at_price} />
      </div>

      <QuickAddDialog product={product} open={quickAdd} onOpenChange={setQuickAdd} />
    </article>
  );
}

export function ProductGrid({
  products,
  columns = 4,
  eagerCount = 0,
}: {
  products: ProductCardData[];
  columns?: 3 | 4;
  eagerCount?: number;
}) {
  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-x-4 gap-y-8",
        columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
      )}
    >
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} eager={i < eagerCount} />
        </li>
      ))}
    </ul>
  );
}
