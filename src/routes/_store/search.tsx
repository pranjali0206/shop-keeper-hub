import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";

import { EmptyState, ErrorState, ProductGridSkeleton } from "@/components/common/States";
import { ProductGrid } from "@/components/store/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchProducts } from "@/lib/data";
import { plural } from "@/lib/format";

export const Route = createFileRoute("/_store/search")({
  validateSearch: (raw: Record<string, unknown>): { q?: string } => {
    const q = typeof raw["q"] === "string" ? raw["q"].trim().slice(0, 60) : "";
    return q ? { q } : {};
  },
  head: () => ({
    meta: [
      { title: "Search | SOL" },
      { name: "description", content: "Search the S.O.L catalog." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q = "" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [term, setTerm] = useState(q);
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["search-page", q],
    queryFn: () => searchProducts(q, 48),
    enabled: q.length >= 2,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl sm:text-6xl">{q ? `Results for “${q}”` : "Search"}</h1>
      <form
        role="search"
        className="mt-6 flex max-w-xl gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void navigate({ search: term.trim() ? { q: term.trim() } : {} });
        }}
      >
        <label htmlFor="search-page-input" className="sr-only">
          Search products
        </label>
        <Input
          id="search-page-input"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search jeans, kurtas, hoodies…"
        />
        <Button type="submit">
          <Search className="size-4" aria-hidden="true" /> Search
        </Button>
      </form>
      <div className="mt-8">
        {q.length < 2 ? (
          <EmptyState title="What are you looking for?">Type at least two letters.</EmptyState>
        ) : isPending ? (
          <ProductGridSkeleton count={8} />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : data.length === 0 ? (
          <EmptyState title="No matches">Try a broader word like “shirt” or “black”.</EmptyState>
        ) : (
          <>
            <p className="mb-4 text-sm font-semibold" aria-live="polite">
              {plural(data.length, "result")}
            </p>
            <ProductGrid products={data} />
          </>
        )}
      </div>
    </div>
  );
}
