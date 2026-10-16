import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { ProductImage } from "@/components/common/ProductImage";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { garmentFor } from "@/lib/catalog";
import { searchProducts } from "@/lib/data";
import { formatINR } from "@/lib/format";

export function useDebounced<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [term, setTerm] = useState("");
  const debounced = useDebounced(term.trim());
  const navigate = useNavigate();
  const {
    data = [],
    isFetching,
    isError,
  } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => searchProducts(debounced),
    enabled: open && debounced.length >= 2,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!open) setTerm("");
  }, [open]);

  const showResults = debounced.length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[10%] max-w-xl translate-y-0 gap-0 p-0">
        <DialogTitle className="sr-only">Search products</DialogTitle>
        <DialogDescription className="sr-only">
          Type at least two letters to see suggestions.
        </DialogDescription>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (term.trim().length < 2) return;
            onOpenChange(false);
            void navigate({ to: "/search", search: { q: term.trim() } });
          }}
          className="flex items-center gap-2 border-b p-3 pr-14"
        >
          <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="site-search" className="sr-only">
            Search products
          </label>
          <Input
            id="site-search"
            autoFocus
            autoComplete="off"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search jeans, kurtas, hoodies…"
            className="border-0 text-base shadow-none"
          />
        </form>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          <p className="sr-only" aria-live="polite">
            {showResults && !isFetching ? `${data.length} suggestions` : ""}
          </p>
          {!showResults ? (
            <p className="p-4 text-sm text-muted-foreground">Try “baggy”, “kurta” or “black”.</p>
          ) : isError ? (
            <p className="p-4 text-sm text-destructive">Search is unavailable right now.</p>
          ) : data.length === 0 && !isFetching ? (
            <p className="p-4 text-sm text-muted-foreground">
              No matches for “{debounced}”. Try another word.
            </p>
          ) : (
            <ul>
              {data.map((p) => (
                <li key={p.id}>
                  <Link
                    to="/product/$slug"
                    params={{ slug: p.slug }}
                    onClick={() => onOpenChange(false)}
                    className="flex min-h-14 items-center gap-3 rounded-lg p-2 hover:bg-accent"
                  >
                    <ProductImage
                      src={p.product_images[0]?.url}
                      alt=""
                      garment={garmentFor(p.category?.slug, p.slug)}
                      color={p.color}
                      seed={p.slug}
                      className="size-12 shrink-0 rounded-md"
                      sizes="48px"
                    />
                    <span className="flex-1 text-sm font-semibold">{p.name}</span>
                    <span className="text-sm">{formatINR(p.price)}</span>
                  </Link>
                </li>
              ))}
              {data.length > 0 ? (
                <li>
                  <Link
                    to="/search"
                    search={{ q: debounced }}
                    onClick={() => onOpenChange(false)}
                    className="flex min-h-11 items-center justify-center rounded-lg text-sm font-bold text-primary hover:underline"
                  >
                    See all results
                  </Link>
                </li>
              ) : null}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
