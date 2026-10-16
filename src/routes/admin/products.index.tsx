import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AdminPageHeader, ConfirmAction, LoadingRows } from "@/components/admin/AdminUI";
import { ProductImage } from "@/components/common/ProductImage";
import { EmptyState, ErrorState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { adminProductsQuery, productStock, type AdminProduct } from "@/lib/admin";
import { garmentFor } from "@/lib/catalog";
import { categoriesQuery } from "@/lib/data";
import { errorMessage, formatINR } from "@/lib/format";
import { removeImages } from "@/lib/storage";
import { cn } from "@/lib/utils";

type Search = {
  q?: string;
  category?: string;
  status?: "published" | "draft";
  stock?: "low" | "out";
};

export const Route = createFileRoute("/admin/products/")({
  validateSearch: (raw: Record<string, unknown>): Search => {
    const out: Search = {};
    if (typeof raw["q"] === "string" && raw["q"].trim()) out.q = raw["q"].trim().slice(0, 60);
    if (typeof raw["category"] === "string" && raw["category"]) out.category = raw["category"];
    if (raw["status"] === "published" || raw["status"] === "draft") out.status = raw["status"];
    if (raw["stock"] === "low" || raw["stock"] === "out") out.stock = raw["stock"];
    return out;
  },
  component: ProductsList,
});

async function duplicateProduct(p: AdminProduct) {
  const suffix = Math.random().toString(36).slice(2, 6);
  const { data, error } = await supabase
    .from("products")
    .insert({
      name: `${p.name} (copy)`.slice(0, 120),
      slug: `${p.slug}-copy-${suffix}`.slice(0, 80),
      description: p.description,
      category_id: p.category_id,
      price: p.price,
      compare_at_price: p.compare_at_price,
      fit: p.fit,
      fabric: p.fabric,
      color: p.color,
      badges: p.badges,
      tags: p.tags,
      care: p.care,
      model_height: p.model_height,
      model_size: p.model_size,
      is_bestseller: false,
      is_published: false,
    })
    .select("id")
    .single();
  if (error) throw error;
  // Sizes are copied with zero stock (stock is physical); images point at the same files.
  if (p.product_variants.length) {
    const v = await supabase
      .from("product_variants")
      .insert(p.product_variants.map((x) => ({ product_id: data.id, size: x.size, stock: 0 })));
    if (v.error) throw v.error;
  }
  if (p.product_images.length) {
    const i = await supabase.from("product_images").insert(
      p.product_images.map((x) => ({
        product_id: data.id,
        url: x.url,
        alt: x.alt,
        sort_order: x.sort_order,
        storage_path: null,
      })),
    );
    if (i.error) throw i.error;
  }
  return data.id;
}

async function deleteProduct(p: AdminProduct) {
  const { error } = await supabase.from("products").delete().eq("id", p.id);
  if (error) throw error;
  // Only remove files this product owns and no other product row still uses.
  const paths = p.product_images.map((i) => i.storage_path).filter((x): x is string => !!x);
  if (paths.length) {
    const { data } = await supabase
      .from("product_images")
      .select("storage_path")
      .in("storage_path", paths);
    const stillUsed = new Set((data ?? []).map((r) => r.storage_path));
    await removeImages(paths.filter((x) => !stillUsed.has(x)));
  }
}

function ProductsList() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const { data, isPending, isError, error, refetch } = useQuery(adminProductsQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: packItems = [] } = useQuery({
    queryKey: ["admin", "bundle-product-ids"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bundle_items").select("product_id");
      if (error) throw error;
      return data.map((r) => r.product_id);
    },
  });

  const set = (patch: { [K in keyof Search]?: Search[K] | undefined }) => {
    const next = { ...search, ...patch } as Search;
    (Object.keys(next) as (keyof Search)[]).forEach((k) => {
      if (!next[k]) delete next[k];
    });
    void navigate({ search: next, replace: true });
  };

  const q = search.q?.toLowerCase() ?? "";
  const rows = (data ?? []).filter((p) => {
    if (q && !`${p.name} ${p.slug} ${p.color ?? ""}`.toLowerCase().includes(q)) return false;
    if (search.category && p.category_id !== search.category) return false;
    if (search.status === "published" && !p.is_published) return false;
    if (search.status === "draft" && p.is_published) return false;
    const stock = productStock(p);
    if (search.stock === "out" && stock !== 0) return false;
    if (search.stock === "low" && !p.product_variants.some((v) => v.stock < 5)) return false;
    return true;
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin"] });
    void queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  return (
    <div>
      <AdminPageHeader
        title="Products"
        description={data ? `${data.length} products` : undefined}
        actions={
          <Button asChild>
            <Link to="/admin/products/$productId" params={{ productId: "new" }}>
              <Plus className="size-4" aria-hidden="true" /> Add product
            </Link>
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="p-search" className="mb-1 block text-sm font-semibold">
            Search
          </label>
          <Input
            id="p-search"
            defaultValue={search.q ?? ""}
            placeholder="Name, slug or colour"
            onChange={(e) => set({ q: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="p-cat" className="mb-1 block text-sm font-semibold">
            Category
          </label>
          <select
            id="p-cat"
            value={search.category ?? ""}
            onChange={(e) => set({ category: e.target.value })}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.parent_id ? `— ${c.name}` : c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="p-status" className="mb-1 block text-sm font-semibold">
            Status
          </label>
          <select
            id="p-status"
            value={search.status ?? ""}
            onChange={(e) => set({ status: (e.target.value || undefined) as Search["status"] })}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Any status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <div>
          <label htmlFor="p-stock" className="mb-1 block text-sm font-semibold">
            Stock
          </label>
          <select
            id="p-stock"
            value={search.stock ?? ""}
            onChange={(e) => set({ stock: (e.target.value || undefined) as Search["stock"] })}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Any stock</option>
            <option value="low">Low stock (a size under 5)</option>
            <option value="out">Sold out</option>
          </select>
        </div>
      </div>

      {isPending ? (
        <LoadingRows />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={data.length === 0 ? "No products yet" : "No products match"}
          action={
            data.length === 0 ? (
              <Button asChild>
                <Link to="/admin/products/$productId" params={{ productId: "new" }}>
                  Add your first product
                </Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => void navigate({ search: {}, replace: true })}
              >
                Clear filters
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-card shadow-sm">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left">
                <th scope="col" className="p-3">
                  Product
                </th>
                <th scope="col" className="p-3">
                  Category
                </th>
                <th scope="col" className="p-3 text-right">
                  Price
                </th>
                <th scope="col" className="p-3 text-right">
                  Stock
                </th>
                <th scope="col" className="p-3">
                  Status
                </th>
                <th scope="col" className="p-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const stock = productStock(p);
                const inPack = packItems.includes(p.id);
                return (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <ProductImage
                          src={p.product_images[0]?.url}
                          alt=""
                          garment={garmentFor(p.category?.slug, p.slug)}
                          color={p.color}
                          seed={p.slug}
                          className="size-12 shrink-0 rounded-md"
                          sizes="48px"
                        />
                        <Link
                          to="/admin/products/$productId"
                          params={{ productId: p.id }}
                          className="font-semibold hover:underline"
                        >
                          {p.name}
                        </Link>
                      </div>
                    </td>
                    <td className="p-3">{p.category?.name ?? "None"}</td>
                    <td className="p-3 text-right">{formatINR(p.price)}</td>
                    <td
                      className={cn(
                        "p-3 text-right font-semibold",
                        stock === 0 && "text-destructive",
                      )}
                    >
                      {stock === 0 ? "Sold out" : stock}
                    </td>
                    <td className="p-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-bold",
                          p.is_published ? "bg-success text-white dark:text-ink" : "bg-secondary",
                        )}
                      >
                        {p.is_published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="ghost" size="icon" aria-label={`Edit ${p.name}`}>
                          <Link to="/admin/products/$productId" params={{ productId: p.id }}>
                            <Pencil className="size-4" aria-hidden="true" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Duplicate ${p.name}`}
                          onClick={async () => {
                            try {
                              const id = await duplicateProduct(p);
                              toast.success("Duplicated as a draft");
                              refresh();
                              void navigate({
                                to: "/admin/products/$productId",
                                params: { productId: id },
                              });
                            } catch (err) {
                              toast.error(errorMessage(err));
                            }
                          }}
                        >
                          <Copy className="size-4" aria-hidden="true" />
                        </Button>
                        <ConfirmAction
                          title={`Delete ${p.name}?`}
                          description={
                            <>
                              <p>
                                This removes the product, its sizes and images. Past orders keep
                                their line items.
                              </p>
                              {inPack ? (
                                <p className="mt-2 font-semibold text-destructive">
                                  It is part of a Party Pack, which will lose this item.
                                </p>
                              ) : null}
                            </>
                          }
                          onConfirm={async () => {
                            await deleteProduct(p);
                            toast.success(`${p.name} deleted`);
                            refresh();
                          }}
                          trigger={
                            <Button variant="ghost" size="icon" aria-label={`Delete ${p.name}`}>
                              <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                            </Button>
                          }
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
