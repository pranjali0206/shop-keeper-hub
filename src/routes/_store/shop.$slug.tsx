import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState, ErrorState, ProductGridSkeleton } from "@/components/common/States";
import { CatalogFilters } from "@/components/store/CatalogFilters";
import { ProductGrid } from "@/components/store/ProductCard";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  PRICE_RANGES,
  SORTS,
  VIRTUAL_COLLECTIONS,
  colorLabel,
  fitLabel,
  isVirtualCollection,
  titleCase,
  type ShopSearch,
  type SortValue,
} from "@/lib/catalog";
import {
  PAGE_SIZE,
  categoriesQuery,
  collectionCategoryIds,
  fetchCatalogPage,
  fetchFacets,
} from "@/lib/data";
import { plural } from "@/lib/format";
import {
  activeFilterCount,
  filtersFromSearch,
  splitList,
  toggleInList,
  validateShopSearch,
  withParam,
} from "@/lib/search-params";

export const Route = createFileRoute("/_store/shop/$slug")({
  validateSearch: validateShopSearch,
  loader: async ({ context, params }) => {
    if (isVirtualCollection(params.slug)) {
      const v = VIRTUAL_COLLECTIONS[params.slug];
      return { title: v.name, description: v.description, parent: null };
    }
    const categories = await context.queryClient.ensureQueryData(categoriesQuery);
    const cat = categories.find((c) => c.slug === params.slug);
    if (!cat) throw notFound();
    const parent = cat.parent_id ? (categories.find((c) => c.id === cat.parent_id) ?? null) : null;
    return {
      title: cat.name,
      description: `Shop ${cat.name.toLowerCase()} at S.O.L. Fresh fits, free shipping above ₹999.`,
      parent: parent ? { name: parent.name, slug: parent.slug } : null,
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Shop"} | SOL` },
      { name: "description", content: loaderData?.description ?? "Shop menswear at S.O.L." },
    ],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const { title, description, parent } = Route.useLoaderData();
  const navigate = useNavigate({ from: Route.fullPath });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { data: categories } = useQuery(categoriesQuery);

  const categoryIds = useMemo(
    () =>
      categories
        ? collectionCategoryIds(slug, categories)
        : isVirtualCollection(slug)
          ? null
          : undefined,
    [categories, slug],
  );
  const filters = filtersFromSearch(search);
  const ready = categoryIds !== undefined;

  const catalog = useInfiniteQuery({
    queryKey: ["catalog", slug, filters],
    queryFn: ({ pageParam }) =>
      fetchCatalogPage({ slug, categoryIds: categoryIds ?? null, filters, page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) =>
      pages.length * PAGE_SIZE < last.count ? pages.length : undefined,
    enabled: ready,
    placeholderData: keepPreviousData,
  });
  const facets = useQuery({
    queryKey: ["facets", slug],
    queryFn: () => fetchFacets(slug, categoryIds ?? null),
    enabled: ready,
  });

  const setSearch = (next: ShopSearch) => {
    void navigate({ search: next, replace: true, resetScroll: false });
  };

  const items = catalog.data?.pages.flatMap((p) => p.items) ?? [];
  const count = catalog.data?.pages[0]?.count ?? 0;
  const activeCount = activeFilterCount(search);

  const chips: { label: string; next: ShopSearch }[] = [
    ...splitList(search.size).map((v) => ({
      label: `Size ${v}`,
      next: toggleInList(search, "size", v),
    })),
    ...splitList(search.color).map((v) => ({
      label: colorLabel(v),
      next: toggleInList(search, "color", v),
    })),
    ...splitList(search.fit).map((v) => ({
      label: fitLabel(v),
      next: toggleInList(search, "fit", v),
    })),
    ...splitList(search.fabric).map((v) => ({
      label: titleCase(v),
      next: toggleInList(search, "fabric", v),
    })),
    ...(search.price
      ? [
          {
            label: PRICE_RANGES.find((r) => r.value === search.price)?.label ?? search.price,
            next: withParam(search, "price", null),
          },
        ]
      : []),
    ...(search.tag ? [{ label: titleCase(search.tag), next: withParam(search, "tag", null) }] : []),
  ];
  const clearAll: ShopSearch = search.sort ? { sort: search.sort } : {};

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link to="/" className="inline-flex min-h-11 items-center hover:underline">
              Home
            </Link>
          </li>
          {parent ? (
            <li className="flex items-center gap-1">
              <span aria-hidden="true">/</span>
              <Link
                to="/shop/$slug"
                params={{ slug: parent.slug }}
                search={{}}
                className="inline-flex min-h-11 items-center hover:underline"
              >
                {parent.name}
              </Link>
            </li>
          ) : null}
          <li className="flex items-center gap-1">
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="font-semibold text-foreground">
              {title}
            </span>
          </li>
        </ol>
      </nav>

      <header className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-6xl">{title}</h1>
          <p className="mt-2 text-muted-foreground">{description}</p>
        </div>
        <p className="text-sm font-semibold" aria-live="polite">
          {catalog.isPending ? "Loading…" : plural(count, "product")}
        </p>
      </header>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-y py-3">
        <Button variant="outline" className="lg:hidden" onClick={() => setFiltersOpen(true)}>
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filters{activeCount ? ` (${activeCount})` : ""}
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="sort" className="text-sm font-semibold">
            Sort by
          </label>
          <select
            id="sort"
            value={search.sort ?? "newest"}
            onChange={(e) =>
              setSearch(
                withParam(
                  search,
                  "sort",
                  e.target.value === "newest" ? null : (e.target.value as SortValue),
                ),
              )
            }
            className="h-11 rounded-md border border-input bg-background px-3 text-sm"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {chips.length ? (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Active filters">
          {chips.map((c) => (
            <li key={c.label}>
              <button
                type="button"
                onClick={() => setSearch(c.next)}
                className="inline-flex h-11 items-center gap-1 rounded-full bg-secondary px-4 text-sm font-semibold"
                aria-label={`Remove filter ${c.label}`}
              >
                {c.label} <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setSearch(clearAll)}
              className="inline-flex h-11 items-center px-3 text-sm font-bold text-primary underline"
            >
              Clear all
            </button>
          </li>
        </ul>
      ) : null}

      <div className="mt-6 grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <CatalogFilters
            facets={facets.data}
            search={search}
            onChange={setSearch}
            idPrefix="desk"
          />
        </aside>

        <section aria-label="Products">
          {catalog.isPending || !ready ? (
            <ProductGridSkeleton count={6} className="lg:grid-cols-3" />
          ) : catalog.isError ? (
            <ErrorState
              title="Products didn't load"
              error={catalog.error}
              onRetry={() => void catalog.refetch()}
            />
          ) : items.length === 0 ? (
            <EmptyState
              title={activeCount ? "No fits match those filters" : "Nothing here yet"}
              action={
                activeCount ? (
                  <Button variant="outline" onClick={() => setSearch(clearAll)}>
                    Clear filters
                  </Button>
                ) : (
                  <Button asChild>
                    <Link to="/shop/$slug" params={{ slug: "new-arrivals" }} search={{}}>
                      Shop new drop
                    </Link>
                  </Button>
                )
              }
            >
              {activeCount
                ? "Try removing a filter or two."
                : "This drop is still being packed. Check back soon."}
            </EmptyState>
          ) : (
            <>
              <ProductGrid products={items} columns={3} eagerCount={3} />
              <div className="mt-10 flex flex-col items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  Showing {items.length} of {count}
                </p>
                {catalog.hasNextPage ? (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => void catalog.fetchNextPage()}
                    disabled={catalog.isFetchingNextPage}
                  >
                    {catalog.isFetchingNextPage ? "Loading…" : "Load more"}
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </section>
      </div>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="left" className="flex w-[88vw] max-w-sm flex-col p-0">
          <SheetHeader className="border-b p-4 text-left">
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>
              {catalog.isPending ? "Loading…" : `${plural(count, "product")} match`}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4">
            <CatalogFilters
              facets={facets.data}
              search={search}
              onChange={setSearch}
              idPrefix="mobile"
            />
          </div>
          <SheetFooter className="flex-row gap-2 border-t p-4">
            <Button variant="outline" className="flex-1" onClick={() => setSearch(clearAll)}>
              Clear all
            </Button>
            <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
              Show {plural(count, "result")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
