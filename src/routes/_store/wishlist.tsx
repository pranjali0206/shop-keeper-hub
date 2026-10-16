import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Heart } from "lucide-react";

import { EmptyState, ErrorState, ProductGridSkeleton } from "@/components/common/States";
import { ProductGrid } from "@/components/store/ProductCard";
import { Button } from "@/components/ui/button";
import { productsByIdsQuery } from "@/lib/data";
import { plural } from "@/lib/format";
import { useWishlist } from "@/lib/wishlist";

export const Route = createFileRoute("/_store/wishlist")({
  head: () => ({
    meta: [
      { title: "Wishlist | SOL" },
      { name: "description", content: "The fits you saved for later." },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const { ids } = useWishlist();
  const { data, isPending, isError, error, refetch } = useQuery({
    ...productsByIdsQuery(ids),
    enabled: ids.length > 0,
  });
  // Keep the saved order, newest first.
  const products = data ? [...ids].reverse().flatMap((id) => data.filter((p) => p.id === id)) : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl sm:text-6xl">Wishlist</h1>
      <p className="mt-2 text-muted-foreground">
        {ids.length ? plural(ids.length, "saved fit") : "Save the fits you want to come back to."}
      </p>
      <div className="mt-8">
        {ids.length === 0 ? (
          <EmptyState
            title="Nothing saved yet"
            icon={<Heart className="size-8 text-muted-foreground" aria-hidden="true" />}
            action={
              <Button asChild>
                <Link to="/shop/$slug" params={{ slug: "new-arrivals" }} search={{}}>
                  Browse the new drop
                </Link>
              </Button>
            }
          >
            Tap the heart on any product to keep it here.
          </EmptyState>
        ) : isPending ? (
          <ProductGridSkeleton count={Math.min(ids.length, 8)} />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : products.length === 0 ? (
          <EmptyState title="Your saved fits sold out">
            They are no longer available. Find something new.
          </EmptyState>
        ) : (
          <ProductGrid products={products} />
        )}
      </div>
    </div>
  );
}
