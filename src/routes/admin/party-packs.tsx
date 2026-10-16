import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AdminPageHeader,
  ConfirmAction,
  Field,
  LoadingRows,
  SubmitButton,
  Toggle,
  fieldAria,
} from "@/components/admin/AdminUI";
import { ProductImage } from "@/components/common/ProductImage";
import { EmptyState, ErrorState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { adminProductsQuery, type AdminProduct } from "@/lib/admin";
import { garmentFor } from "@/lib/catalog";
import { discountPercent, errorMessage, formatINR } from "@/lib/format";
import { bundleSchema, fieldErrors } from "@/lib/validation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/party-packs")({
  component: PartyPacksAdmin,
});

type AdminBundle = {
  id: string;
  name: string;
  description: string;
  price: number;
  is_published: boolean;
  sort_order: number;
  bundle_items: { product_id: string; sort_order: number }[];
};
type Draft = {
  id: string | null;
  name: string;
  description: string;
  price: string;
  is_published: boolean;
  productIds: string[];
};

const bundlesAdminQuery = {
  queryKey: ["admin", "bundles"],
  queryFn: async (): Promise<AdminBundle[]> => {
    const { data, error } = await supabase
      .from("bundles")
      .select("*, bundle_items(product_id,sort_order)")
      .order("sort_order");
    if (error) throw error;
    return (data as unknown as AdminBundle[]).map((b) => ({
      ...b,
      price: Number(b.price),
      bundle_items: [...b.bundle_items].sort((x, y) => x.sort_order - y.sort_order),
    }));
  },
};

function PackEditor({
  draft,
  products,
  nextOrder,
  onDone,
}: {
  draft: Draft;
  products: AdminProduct[];
  nextOrder: number;
  onDone: (saved: boolean) => void;
}) {
  const [v, setV] = useState(draft);
  const [q, setQ] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const picked = v.productIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is AdminProduct => !!p);
  const full = picked.reduce((s, p) => s + p.price, 0);
  const price = Number(v.price) || 0;
  const off = discountPercent(price, full);
  const list = products.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()));

  function toggle(id: string) {
    setErrors((e) => {
      const { productIds: _drop, ...rest } = e;
      return rest;
    });
    setV((prev) => {
      if (prev.productIds.includes(id))
        return { ...prev, productIds: prev.productIds.filter((x) => x !== id) };
      if (prev.productIds.length >= 3) {
        toast.error("A Party Pack has exactly 3 products. Remove one first.");
        return prev;
      }
      return { ...prev, productIds: [...prev.productIds, id] };
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = bundleSchema.safeParse(v);
    const extra: Record<string, string> = {};
    if (parsed.success && full > 0 && parsed.data.price >= full)
      extra["price"] = `Pack price should be below the ${formatINR(full)} total`;
    if (!parsed.success || Object.keys(extra).length) {
      setErrors({ ...(parsed.success ? {} : fieldErrors(parsed.error)), ...extra });
      return;
    }
    setBusy(true);
    try {
      const row = {
        name: parsed.data.name,
        description: parsed.data.description,
        price: parsed.data.price,
        is_published: parsed.data.is_published,
      };
      let id = v.id;
      if (id) {
        const { error } = await supabase.from("bundles").update(row).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("bundles")
          .insert({ ...row, sort_order: nextOrder })
          .select("id")
          .single();
        if (error) throw error;
        id = data.id;
      }
      const del = await supabase.from("bundle_items").delete().eq("bundle_id", id);
      if (del.error) throw del.error;
      const ins = await supabase.from("bundle_items").insert(
        parsed.data.productIds.map((product_id, i) => ({
          bundle_id: id,
          product_id,
          sort_order: i + 1,
        })),
      );
      if (ins.error) throw ins.error;
      toast.success(v.id ? "Party Pack saved" : "Party Pack created");
      onDone(true);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className="space-y-5 rounded-2xl bg-card p-5 shadow-sm">
      <h2 className="text-xl">{v.id ? `Edit ${draft.name}` : "New Party Pack"}</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Field id="pk-name" label="Pack name" error={errors["name"]}>
            <Input
              id="pk-name"
              value={v.name}
              onChange={(e) => setV({ ...v, name: e.target.value })}
              {...fieldAria("pk-name", errors["name"])}
            />
          </Field>
          <Field id="pk-desc" label="Short description" error={errors["description"]}>
            <Textarea
              id="pk-desc"
              rows={2}
              value={v.description}
              onChange={(e) => setV({ ...v, description: e.target.value })}
            />
          </Field>
          <Field id="pk-price" label="Pack price (₹)" error={errors["price"]}>
            <Input
              id="pk-price"
              inputMode="decimal"
              value={v.price}
              onChange={(e) => setV({ ...v, price: e.target.value })}
              {...fieldAria("pk-price", errors["price"])}
            />
          </Field>
          <div className="rounded-xl bg-muted p-4 text-sm" aria-live="polite">
            <p>
              Items bought separately: <strong>{formatINR(full)}</strong>
            </p>
            <p>
              Pack price: <strong>{formatINR(price)}</strong>
            </p>
            <p className="mt-1 text-lg font-bold">{off > 0 ? `${off}% off` : "No discount yet"}</p>
          </div>
          <Toggle
            id="pk-pub"
            label="Published"
            hint="Show on the home page (the first 3 published packs appear)"
            checked={v.is_published}
            onChange={(is_published) => setV({ ...v, is_published })}
          />
        </div>

        <fieldset aria-describedby={errors["productIds"] ? "pk-products-err" : undefined}>
          <legend className="mb-2 text-sm font-semibold">
            Products ({v.productIds.length} of 3 picked)
          </legend>
          {errors["productIds"] ? (
            <p id="pk-products-err" className="mb-2 text-sm font-semibold text-destructive">
              {errors["productIds"]}
            </p>
          ) : null}
          <label htmlFor="pk-search" className="sr-only">
            Search products
          </label>
          <Input
            id="pk-search"
            placeholder="Search products"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <ul className="mt-2 max-h-80 space-y-1 overflow-y-auto rounded-lg border p-1">
            {list.map((p) => {
              const on = v.productIds.includes(p.id);
              return (
                <li key={p.id}>
                  <label
                    className={cn(
                      "flex min-h-12 cursor-pointer items-center gap-3 rounded-md px-2",
                      on ? "bg-primary/10" : "hover:bg-accent",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(p.id)}
                      className="size-5 accent-[var(--primary)]"
                    />
                    <ProductImage
                      src={p.product_images[0]?.url}
                      alt=""
                      garment={garmentFor(p.category?.slug, p.slug)}
                      color={p.color}
                      seed={p.slug}
                      className="size-10 shrink-0 rounded"
                      sizes="40px"
                    />
                    <span className="flex-1 text-sm">{p.name}</span>
                    <span className="text-sm">{formatINR(p.price)}</span>
                    {!p.is_published ? (
                      <span className="text-xs text-muted-foreground">Draft</span>
                    ) : null}
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => onDone(false)}>
          Cancel
        </Button>
        <SubmitButton busy={busy}>Save pack</SubmitButton>
      </div>
    </form>
  );
}

function PartyPacksAdmin() {
  const queryClient = useQueryClient();
  const bundles = useQuery({ ...bundlesAdminQuery, staleTime: 0 });
  const products = useQuery(adminProductsQuery);
  const [draft, setDraft] = useState<Draft | null>(null);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "bundles"] });
    void queryClient.invalidateQueries({ queryKey: ["bundles"] });
  };
  const byId = new Map((products.data ?? []).map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Party Packs"
        description="Three products, one price. The first three published packs show on the home page."
        actions={
          !draft ? (
            <Button
              onClick={() =>
                setDraft({
                  id: null,
                  name: "",
                  description: "",
                  price: "",
                  is_published: true,
                  productIds: [],
                })
              }
            >
              <Plus className="size-4" aria-hidden="true" /> New pack
            </Button>
          ) : null
        }
      />
      {draft && products.data ? (
        <PackEditor
          key={draft.id ?? "new"}
          draft={draft}
          products={products.data}
          nextOrder={Math.max(0, ...(bundles.data ?? []).map((b) => b.sort_order)) + 1}
          onDone={(saved) => {
            setDraft(null);
            if (saved) refresh();
          }}
        />
      ) : null}
      {bundles.isPending || products.isPending ? (
        <LoadingRows rows={3} />
      ) : bundles.isError || products.isError ? (
        <ErrorState
          error={bundles.error ?? products.error}
          onRetry={() => void bundles.refetch()}
        />
      ) : bundles.data.length === 0 ? (
        <EmptyState title="No Party Packs yet">
          Create one to show the Party Packs section on the home page.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {bundles.data.map((b) => {
            const items = b.bundle_items
              .map((i) => byId.get(i.product_id))
              .filter((p): p is AdminProduct => !!p);
            const full = items.reduce((s, p) => s + p.price, 0);
            return (
              <li key={b.id} className="rounded-2xl bg-card p-4 shadow-sm">
                <div className="grid grid-cols-3 gap-2">
                  {items.map((p) => (
                    <ProductImage
                      key={p.id}
                      src={p.product_images[0]?.url}
                      alt={p.name}
                      garment={garmentFor(p.category?.slug, p.slug)}
                      color={p.color}
                      seed={p.slug}
                      className="aspect-[3/4] rounded-lg"
                      sizes="120px"
                    />
                  ))}
                </div>
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-xl">{b.name}</p>
                    <p className="text-sm">
                      {formatINR(b.price)}{" "}
                      <s className="text-muted-foreground">{formatINR(full)}</s> ·{" "}
                      {discountPercent(b.price, full)}% off
                    </p>
                    {items.length !== 3 ? (
                      <p className="text-sm font-semibold text-destructive">
                        Needs 3 products (has {items.length})
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-bold",
                      b.is_published ? "bg-success text-white dark:text-ink" : "bg-secondary",
                    )}
                  >
                    {b.is_published ? "Live" : "Hidden"}
                  </span>
                </div>
                <div className="mt-3 flex justify-end gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setDraft({
                        id: b.id,
                        name: b.name,
                        description: b.description,
                        price: String(b.price),
                        is_published: b.is_published,
                        productIds: b.bundle_items.map((i) => i.product_id),
                      })
                    }
                  >
                    <Pencil className="size-4" aria-hidden="true" /> Edit
                  </Button>
                  <ConfirmAction
                    title={`Delete ${b.name}?`}
                    description="Customers with this pack in their cart will be asked to remove it at checkout."
                    onConfirm={async () => {
                      const { error } = await supabase.from("bundles").delete().eq("id", b.id);
                      if (error) throw error;
                      toast.success("Party Pack deleted");
                      refresh();
                    }}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label={`Delete ${b.name}`}>
                        <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                      </Button>
                    }
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
