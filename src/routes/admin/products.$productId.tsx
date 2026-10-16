import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ExternalLink, GripVertical, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AdminPageHeader,
  Field,
  ImageUploadButton,
  LoadingRows,
  SubmitButton,
  Toggle,
  fieldAria,
} from "@/components/admin/AdminUI";
import { EmptyState, ErrorState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { adminProductQuery, type AdminProduct } from "@/lib/admin";
import {
  BADGES,
  COLORS,
  FABRICS,
  FITS,
  slugify,
  sortSizes,
  sizeSetFor,
  titleCase,
} from "@/lib/catalog";
import { categoriesQuery } from "@/lib/data";
import { discountPercent, errorMessage } from "@/lib/format";
import { removeImages } from "@/lib/storage";
import { fieldErrors, productSchema } from "@/lib/validation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/products/$productId")({
  component: ProductEditor,
});

type ImageItem = { key: string; id: string | null; url: string; path: string | null; alt: string };
type FormValues = {
  name: string;
  slug: string;
  description: string;
  category_id: string;
  fit: string;
  fabric: string;
  color: string;
  price: string;
  compare_at_price: string;
  badges: string[];
  tags: string;
  care: string;
  model_height: string;
  model_size: string;
  is_bestseller: boolean;
  is_published: boolean;
};

const EMPTY: FormValues = {
  name: "",
  slug: "",
  description: "",
  category_id: "",
  fit: "regular",
  fabric: "cotton",
  color: "black",
  price: "",
  compare_at_price: "",
  badges: [],
  tags: "",
  care: "",
  model_height: "",
  model_size: "",
  is_bestseller: false,
  is_published: false,
};

function fromProduct(p: AdminProduct): FormValues {
  return {
    name: p.name,
    slug: p.slug,
    description: p.description,
    category_id: p.category_id ?? "",
    fit: p.fit ?? "",
    fabric: p.fabric ?? "",
    color: p.color ?? "",
    price: String(p.price),
    compare_at_price: p.compare_at_price == null ? "" : String(p.compare_at_price),
    badges: p.badges,
    tags: p.tags.join(", "),
    care: p.care ?? "",
    model_height: p.model_height ?? "",
    model_size: p.model_size ?? "",
    is_bestseller: p.is_bestseller,
    is_published: p.is_published,
  };
}

function ProductEditor() {
  const { productId } = Route.useParams();
  const isNew = productId === "new";
  const {
    data: existing,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({ ...adminProductQuery(productId), enabled: !isNew });
  const { data: categories = [] } = useQuery(categoriesQuery);

  if (!isNew && isPending) return <LoadingRows rows={8} />;
  if (!isNew && isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!isNew && !existing) {
    return (
      <EmptyState
        title="Product not found"
        action={
          <Button asChild variant="outline">
            <Link to="/admin/products">Back to products</Link>
          </Button>
        }
      />
    );
  }
  return <ProductForm key={productId} product={existing ?? null} categories={categories} />;
}

function ProductForm({
  product,
  categories,
}: {
  product: AdminProduct | null;
  categories: { id: string; name: string; slug: string; parent_id: string | null }[];
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<FormValues>(product ? fromProduct(product) : EMPTY);
  const [slugTouched, setSlugTouched] = useState(!!product);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<ImageItem[]>(
    (product?.product_images ?? []).map((i) => ({
      key: i.id,
      id: i.id,
      url: i.url,
      path: i.storage_path,
      alt: i.alt,
    })),
  );
  const [removedImages, setRemovedImages] = useState<ImageItem[]>([]);
  const [stock, setStock] = useState<Record<string, string>>(
    Object.fromEntries((product?.product_variants ?? []).map((v) => [v.size, String(v.stock)])),
  );
  const [removedSizes, setRemovedSizes] = useState<string[]>([]);
  const [newSize, setNewSize] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const folder = useMemo(() => `products/${product?.id ?? `new-${Date.now()}`}`, [product?.id]);

  const category = categories.find((c) => c.id === values.category_id);
  const parent = category?.parent_id ? categories.find((c) => c.id === category.parent_id) : null;
  const sizeSet = sizeSetFor(parent?.slug ?? category?.slug);
  const sizes = sortSizes(
    [...new Set([...sizeSet, ...Object.keys(stock)])]
      .filter((s) => !removedSizes.includes(s))
      .map((size) => ({ size })),
  ).map((s) => s.size);

  useEffect(() => {
    if (!slugTouched) setValues((v) => ({ ...v, slug: slugify(v.name) }));
  }, [values.name, slugTouched]);

  const set = <K extends keyof FormValues>(k: K, v: FormValues[K]) =>
    setValues((prev) => ({ ...prev, [k]: v }));
  const err = (k: string) => errors[k];

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    setImages((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      if (item) next.splice(to, 0, item);
      return next;
    });
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const parsed = productSchema.safeParse({
      ...values,
      tags: values.tags
        .split(",")
        .map((t) => slugify(t))
        .filter(Boolean),
      compare_at_price: values.compare_at_price.trim() === "" ? null : values.compare_at_price,
    });
    const stockErrors: Record<string, string> = {};
    for (const size of sizes) {
      const raw = stock[size] ?? "0";
      if (!/^\d{1,5}$/.test(raw.trim() || "0")) stockErrors[`stock.${size}`] = "Whole number";
    }
    if (!parsed.success || Object.keys(stockErrors).length) {
      const all = { ...(parsed.success ? {} : fieldErrors(parsed.error)), ...stockErrors };
      setErrors(all);
      toast.error("Fix the highlighted fields");
      const first = Object.keys(all)[0];
      if (first) document.getElementById(`pf-${first.replace(".", "-")}`)?.focus();
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const v = parsed.data;
      const row = {
        name: v.name,
        slug: v.slug,
        description: v.description,
        category_id: v.category_id,
        fit: v.fit || null,
        fabric: v.fabric || null,
        color: v.color || null,
        price: v.price,
        compare_at_price: v.compare_at_price ?? null,
        badges: v.badges,
        tags: v.tags,
        care: v.care || null,
        model_height: v.model_height || null,
        model_size: v.model_size || null,
        is_bestseller: v.is_bestseller,
        is_published: v.is_published,
      };
      let id = product?.id;
      if (id) {
        const { error } = await supabase.from("products").update(row).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(row).select("id").single();
        if (error) throw error;
        id = data.id;
      }

      const variantRows = sizes.map((size) => ({
        product_id: id,
        size,
        stock: Number((stock[size] ?? "0").trim() || "0"),
      }));
      if (variantRows.length) {
        const { error } = await supabase
          .from("product_variants")
          .upsert(variantRows, { onConflict: "product_id,size" });
        if (error) throw error;
      }
      if (removedSizes.length) {
        const { error } = await supabase
          .from("product_variants")
          .delete()
          .eq("product_id", id)
          .in("size", removedSizes);
        if (error) throw error;
      }

      const removedIds = removedImages.map((i) => i.id).filter((x): x is string => !!x);
      if (removedIds.length) {
        const { error } = await supabase.from("product_images").delete().in("id", removedIds);
        if (error) throw error;
      }
      for (const [index, img] of images.entries()) {
        const alt = img.alt.trim() || v.name;
        if (img.id) {
          const { error } = await supabase
            .from("product_images")
            .update({ sort_order: index, alt })
            .eq("id", img.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("product_images").insert({
            product_id: id,
            url: img.url,
            storage_path: img.path,
            alt,
            sort_order: index,
          });
          if (error) throw error;
        }
      }
      const removedPaths = removedImages.map((i) => i.path).filter((x): x is string => !!x);
      if (removedPaths.length) {
        const { data } = await supabase
          .from("product_images")
          .select("storage_path")
          .in("storage_path", removedPaths);
        const used = new Set((data ?? []).map((r) => r.storage_path));
        await removeImages(removedPaths.filter((p) => !used.has(p)));
      }

      toast.success(product ? "Product saved" : "Product created");
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["product"] });
      void queryClient.invalidateQueries({ queryKey: ["catalog"] });
      if (!product) void navigate({ to: "/admin/products/$productId", params: { productId: id } });
      else {
        setRemovedImages([]);
        setRemovedSizes([]);
      }
    } catch (error) {
      const msg = errorMessage(error);
      toast.error(
        /products_slug_key|duplicate key/.test(msg)
          ? "That URL slug is already used by another product"
          : msg,
      );
      if (/products_slug_key/.test(msg)) setErrors({ slug: "Already used by another product" });
    } finally {
      setSaving(false);
    }
  }

  const off = discountPercent(Number(values.price) || 0, Number(values.compare_at_price) || null);
  const select = "h-11 w-full rounded-md border border-input bg-background px-3 text-sm";

  return (
    <form onSubmit={save} noValidate>
      <AdminPageHeader
        title={product ? product.name : "New product"}
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/admin/products">
                <ArrowLeft className="size-4" aria-hidden="true" /> Products
              </Link>
            </Button>
            {product?.is_published ? (
              <Button asChild variant="outline">
                <Link to="/product/$slug" params={{ slug: product.slug }} target="_blank">
                  <ExternalLink className="size-4" aria-hidden="true" /> View
                </Link>
              </Button>
            ) : null}
            <SubmitButton busy={saving}>{saving ? "Saving…" : "Save product"}</SubmitButton>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="space-y-4 rounded-2xl bg-card p-5 shadow-sm" aria-labelledby="basics">
            <h2 id="basics" className="text-xl">
              Basics
            </h2>
            <Field id="pf-name" label="Name" error={err("name")}>
              <Input
                id="pf-name"
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                {...fieldAria("pf-name", err("name"))}
              />
            </Field>
            <Field
              id="pf-slug"
              label="URL slug"
              error={err("slug")}
              hint={`/product/${values.slug || "…"}`}
            >
              <Input
                id="pf-slug"
                value={values.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", slugify(e.target.value));
                }}
                {...fieldAria("pf-slug", err("slug"))}
              />
            </Field>
            <Field id="pf-description" label="Description" error={err("description")}>
              <Textarea
                id="pf-description"
                rows={4}
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
                {...fieldAria("pf-description", err("description"))}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="pf-category_id" label="Category" error={err("category_id")}>
                <select
                  id="pf-category_id"
                  value={values.category_id}
                  onChange={(e) => set("category_id", e.target.value)}
                  className={select}
                  {...fieldAria("pf-category_id", err("category_id"))}
                >
                  <option value="">Choose a category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parent_id ? `— ${c.name}` : c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="pf-fit" label="Fit">
                <select
                  id="pf-fit"
                  value={values.fit}
                  onChange={(e) => set("fit", e.target.value)}
                  className={select}
                >
                  <option value="">None</option>
                  {FITS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="pf-fabric" label="Fabric">
                <select
                  id="pf-fabric"
                  value={values.fabric}
                  onChange={(e) => set("fabric", e.target.value)}
                  className={select}
                >
                  <option value="">None</option>
                  {[...new Set([...FABRICS, ...(values.fabric ? [values.fabric] : [])])].map(
                    (f) => (
                      <option key={f} value={f}>
                        {titleCase(f)}
                      </option>
                    ),
                  )}
                </select>
              </Field>
              <Field id="pf-color" label="Colour">
                <select
                  id="pf-color"
                  value={values.color}
                  onChange={(e) => set("color", e.target.value)}
                  className={select}
                >
                  <option value="">None</option>
                  {[
                    ...new Set([...Object.keys(COLORS), ...(values.color ? [values.color] : [])]),
                  ].map((c) => (
                    <option key={c} value={c}>
                      {COLORS[c]?.label ?? titleCase(c)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field
              id="pf-tags"
              label="Tags"
              hint="Comma separated. Used by menus and filters, e.g. wedding, festive, sangeet, party, college, office-casual"
            >
              <Input
                id="pf-tags"
                value={values.tags}
                onChange={(e) => set("tags", e.target.value)}
              />
            </Field>
          </section>

          <section
            className="space-y-4 rounded-2xl bg-card p-5 shadow-sm"
            aria-labelledby="images-h"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="images-h" className="text-xl">
                Images
              </h2>
              <ImageUploadButton
                folder={folder}
                multiple
                label="Upload images"
                onUploaded={(files) =>
                  setImages((prev) => [
                    ...prev,
                    ...files.map((f) => ({
                      key: f.path,
                      id: null,
                      url: f.url,
                      path: f.path,
                      alt: values.name || f.name,
                    })),
                  ])
                }
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Drag to reorder, or use the arrows. The first image is the cover. JPG, PNG or WebP
              under 5 MB.
            </p>
            {images.length === 0 ? (
              <EmptyState title="No photos yet">
                The store shows a garment illustration until you upload one.
              </EmptyState>
            ) : (
              <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((img, i) => (
                  <li
                    key={img.key}
                    draggable
                    onDragStart={() => setDragIndex(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIndex !== null) moveImage(dragIndex, i);
                      setDragIndex(null);
                    }}
                    className={cn(
                      "rounded-xl border-2 p-2",
                      dragIndex === i ? "border-primary opacity-60" : "border-transparent bg-muted",
                    )}
                  >
                    <div className="relative">
                      <img
                        src={img.url}
                        alt={img.alt}
                        className="aspect-[4/5] w-full rounded-lg object-cover"
                      />
                      {i === 0 ? (
                        <span className="absolute left-1 top-1 rounded bg-paper px-2 py-0.5 text-xs font-bold text-ink">
                          Cover
                        </span>
                      ) : null}
                      <GripVertical
                        className="absolute right-1 top-1 size-5 rounded bg-card/90 text-card-foreground"
                        aria-hidden="true"
                      />
                    </div>
                    <label htmlFor={`alt-${img.key}`} className="mt-2 block text-xs font-semibold">
                      Alt text
                    </label>
                    <Input
                      id={`alt-${img.key}`}
                      value={img.alt}
                      onChange={(e) =>
                        setImages((prev) =>
                          prev.map((x) => (x.key === img.key ? { ...x, alt: e.target.value } : x)),
                        )
                      }
                    />
                    <div className="mt-2 flex justify-between">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Move image ${i + 1} earlier`}
                        disabled={i === 0}
                        onClick={() => moveImage(i, i - 1)}
                      >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove image ${i + 1}`}
                        onClick={() => {
                          setImages((prev) => prev.filter((x) => x.key !== img.key));
                          setRemovedImages((prev) => [...prev, img]);
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Move image ${i + 1} later`}
                        disabled={i === images.length - 1}
                        onClick={() => moveImage(i, i + 1)}
                      >
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section
            className="space-y-4 rounded-2xl bg-card p-5 shadow-sm"
            aria-labelledby="stock-h"
          >
            <h2 id="stock-h" className="text-xl">
              Stock per size
            </h2>
            <p className="text-sm text-muted-foreground">
              Sizes follow the category. Set 0 for sold out; remove a size to hide it.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {sizes.map((size) => (
                <div key={size} className="rounded-lg border p-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor={`pf-stock-${size}`} className="text-sm font-bold">
                      {size}
                    </label>
                    <button
                      type="button"
                      className="inline-flex size-11 items-center justify-center rounded-md hover:bg-accent"
                      aria-label={`Remove size ${size}`}
                      onClick={() => setRemovedSizes((prev) => [...prev, size])}
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                  <Input
                    id={`pf-stock-${size}`}
                    inputMode="numeric"
                    value={stock[size] ?? "0"}
                    onChange={(e) =>
                      setStock((prev) => ({
                        ...prev,
                        [size]: e.target.value.replace(/\D/g, "").slice(0, 5),
                      }))
                    }
                    {...fieldAria(`pf-stock-${size}`, err(`stock.${size}`))}
                  />
                  {err(`stock.${size}`) ? (
                    <p className="mt-1 text-xs font-semibold text-destructive">
                      {err(`stock.${size}`)}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <Field id="pf-newsize" label="Add a size" className="flex-1">
                <Input
                  id="pf-newsize"
                  value={newSize}
                  maxLength={12}
                  onChange={(e) => setNewSize(e.target.value.toUpperCase())}
                  placeholder="e.g. 40 or UK12"
                />
              </Field>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const s = newSize.trim();
                  if (!s) return;
                  setStock((prev) => ({ ...prev, [s]: prev[s] ?? "0" }));
                  setRemovedSizes((prev) => prev.filter((x) => x !== s));
                  setNewSize("");
                }}
              >
                Add size
              </Button>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section
            className="space-y-4 rounded-2xl bg-card p-5 shadow-sm"
            aria-labelledby="pricing"
          >
            <h2 id="pricing" className="text-xl">
              Pricing
            </h2>
            <Field id="pf-price" label="Price (₹)" error={err("price")}>
              <Input
                id="pf-price"
                inputMode="decimal"
                value={values.price}
                onChange={(e) => set("price", e.target.value)}
                {...fieldAria("pf-price", err("price"))}
              />
            </Field>
            <Field
              id="pf-compare_at_price"
              label="Compare-at price (₹)"
              error={err("compare_at_price")}
              hint={off ? `Shows as ${off}% off` : "Optional. Original price, shown crossed out."}
            >
              <Input
                id="pf-compare_at_price"
                inputMode="decimal"
                value={values.compare_at_price}
                onChange={(e) => set("compare_at_price", e.target.value)}
                {...fieldAria("pf-compare_at_price", err("compare_at_price"))}
              />
            </Field>
          </section>

          <section className="space-y-3 rounded-2xl bg-card p-5 shadow-sm" aria-labelledby="vis">
            <h2 id="vis" className="text-xl">
              Visibility
            </h2>
            <Toggle
              id="pf-published"
              label="Published"
              hint="Visible in the store"
              checked={values.is_published}
              onChange={(v) => set("is_published", v)}
            />
            <Toggle
              id="pf-bestseller"
              label="Bestseller"
              hint="Shows in the home page Bestsellers"
              checked={values.is_bestseller}
              onChange={(v) => set("is_bestseller", v)}
            />
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Badges</legend>
              <div className="grid grid-cols-2 gap-2">
                {BADGES.map((b) => (
                  <label
                    key={b.value}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3"
                  >
                    <input
                      type="checkbox"
                      checked={values.badges.includes(b.value)}
                      onChange={(e) =>
                        set(
                          "badges",
                          e.target.checked
                            ? [...values.badges, b.value]
                            : values.badges.filter((x) => x !== b.value),
                        )
                      }
                      className="size-5 accent-[var(--primary)]"
                    />
                    <span className="text-sm">{b.label}</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Low stock and Sale also appear automatically when stock drops under 5 or a
                compare-at price is set.
              </p>
            </fieldset>
          </section>

          <section className="space-y-4 rounded-2xl bg-card p-5 shadow-sm" aria-labelledby="extra">
            <h2 id="extra" className="text-xl">
              Product page extras
            </h2>
            <Field id="pf-care" label="Care">
              <Textarea
                id="pf-care"
                rows={2}
                value={values.care}
                onChange={(e) => set("care", e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field id="pf-model_height" label="Model height">
                <Input
                  id="pf-model_height"
                  value={values.model_height}
                  onChange={(e) => set("model_height", e.target.value)}
                  placeholder={`6'0"`}
                />
              </Field>
              <Field id="pf-model_size" label="Size worn">
                <Input
                  id="pf-model_size"
                  value={values.model_size}
                  onChange={(e) => set("model_size", e.target.value)}
                  placeholder="M"
                />
              </Field>
            </div>
          </section>
        </div>
      </div>
    </form>
  );
}
