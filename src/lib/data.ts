import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { NEW_ARRIVAL_DAYS, isVirtualCollection, type SortValue } from "@/lib/catalog";

// Storefront reads. Row Level Security limits anonymous visitors to published
// products, active banners and published Party Packs, so no extra filtering is
// needed for safety; is_published filters below just keep staff previews honest.

export type StoreSettings = Tables<"store_settings">;
export type Category = Tables<"categories">;

export type ProductImage = { url: string; alt: string; sort_order: number };
export type ProductVariant = { size: string; stock: number };

export type ProductCard = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  badges: string[];
  is_bestseller: boolean;
  color: string | null;
  fit: string | null;
  fabric: string | null;
  created_at: string;
  category: { slug: string; name: string } | null;
  product_images: ProductImage[];
  product_variants: ProductVariant[];
};

export type ProductDetail = ProductCard & {
  description: string;
  care: string | null;
  model_height: string | null;
  model_size: string | null;
  tags: string[];
  category_id: string | null;
  category: {
    id: string;
    slug: string;
    name: string;
    parent: { slug: string; name: string } | null;
  } | null;
};

export const CARD_SELECT =
  "id,name,slug,price,compare_at_price,badges,is_bestseller,color,fit,fabric,created_at," +
  "category:categories(slug,name),product_images(url,alt,sort_order),product_variants(size,stock)";

const DETAIL_SELECT =
  "id,name,slug,price,compare_at_price,badges,is_bestseller,color,fit,fabric,created_at,description,care," +
  "model_height,model_size,tags,category_id," +
  "category:categories(id,slug,name,parent:categories!parent_id(slug,name))," +
  "product_images(url,alt,sort_order),product_variants(size,stock)";

function normalizeCard<T extends ProductCard>(p: T): T {
  return {
    ...p,
    price: Number(p.price),
    compare_at_price: p.compare_at_price == null ? null : Number(p.compare_at_price),
    product_images: [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    product_variants: p.product_variants ?? [],
  };
}

export const totalStock = (p: Pick<ProductCard, "product_variants">) =>
  p.product_variants.reduce((sum, v) => sum + v.stock, 0);

/** Badges to show on a card: stored badges plus automatic Low stock. */
export function displayBadges(p: ProductCard): string[] {
  const badges = new Set(p.badges);
  if (p.is_bestseller) badges.add("bestseller");
  const stock = totalStock(p);
  if (stock > 0 && stock < 5) badges.add("low-stock");
  if (p.compare_at_price && p.compare_at_price > p.price) badges.add("sale");
  const order = ["sale", "new", "low-stock", "bestseller"];
  return order.filter((b) => badges.has(b)).slice(0, 2);
}

// ---------------------------------------------------------------------------
// Settings and navigation
// ---------------------------------------------------------------------------
export const settingsQuery = queryOptions({
  queryKey: ["store-settings"],
  queryFn: async (): Promise<StoreSettings | null> => {
    const { data, error } = await supabase.from("store_settings").select("*").maybeSingle();
    if (error) throw error;
    return data;
  },
  staleTime: 5 * 60_000,
});

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order")
      .order("name");
    if (error) throw error;
    return data;
  },
  staleTime: 5 * 60_000,
});

// ---------------------------------------------------------------------------
// Catalog listing
// ---------------------------------------------------------------------------
export type CatalogFilters = {
  size: string[];
  color: string[];
  fit: string[];
  fabric: string[];
  price: string | null;
  tag: string | null;
  sort: SortValue;
};

export const PAGE_SIZE = 12;
const SAFE_VALUE = /^[a-z0-9][a-z0-9 .-]{0,39}$/i;
const safeList = (values: string[]) => values.filter((v) => SAFE_VALUE.test(v));

/** Category ids a collection covers (the category plus its children). */
export function collectionCategoryIds(slug: string, categories: Category[]): string[] | null {
  if (isVirtualCollection(slug)) return null;
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) return [];
  return [cat.id, ...categories.filter((c) => c.parent_id === cat.id).map((c) => c.id)];
}

async function productIdsWithSizes(sizes: string[]) {
  const { data, error } = await supabase
    .from("product_variants")
    .select("product_id")
    .in("size", safeList(sizes))
    .gt("stock", 0);
  if (error) throw error;
  return [...new Set(data.map((r) => r.product_id))];
}

export async function fetchCatalogPage(args: {
  slug: string;
  categoryIds: string[] | null;
  filters: CatalogFilters;
  page: number;
}): Promise<{ items: ProductCard[]; count: number }> {
  const { slug, categoryIds, filters, page } = args;
  let query = supabase
    .from("products")
    .select(CARD_SELECT, { count: "exact" })
    .eq("is_published", true);

  if (categoryIds) {
    if (categoryIds.length === 0) return { items: [], count: 0 };
    query = query.in("category_id", categoryIds);
  }
  if (slug === "new-arrivals") {
    query = query.gte(
      "created_at",
      new Date(Date.now() - NEW_ARRIVAL_DAYS * 86_400_000).toISOString(),
    );
  }
  if (slug === "sale") query = query.not("compare_at_price", "is", null);

  const colors = safeList(filters.color);
  if (colors.length) query = query.in("color", colors);
  const fabrics = safeList(filters.fabric);
  if (fabrics.length) query = query.in("fabric", fabrics);
  const fits = safeList(filters.fit);
  if (fits.length) query = query.or(`fit.in.(${fits.join(",")}),tags.ov.{${fits.join(",")}}`);
  if (filters.tag && SAFE_VALUE.test(filters.tag)) query = query.contains("tags", [filters.tag]);
  if (filters.price) {
    const [min, max] = filters.price.split("-");
    if (min) query = query.gte("price", Number(min));
    if (max) query = query.lte("price", Number(max));
  }
  if (filters.size.length) {
    const ids = await productIdsWithSizes(filters.size);
    if (ids.length === 0) return { items: [], count: 0 };
    query = query.in("id", ids);
  }

  switch (filters.sort) {
    case "price-asc":
      query = query.order("price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price", { ascending: false });
      break;
    case "popular":
      query = query
        .order("sales_count", { ascending: false })
        .order("is_bestseller", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }
  query = query.order("id");

  const from = page * PAGE_SIZE;
  const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) throw error;
  return { items: (data as unknown as ProductCard[]).map(normalizeCard), count: count ?? 0 };
}

export type Facets = { sizes: string[]; colors: string[]; fits: string[]; fabrics: string[] };

export async function fetchFacets(slug: string, categoryIds: string[] | null): Promise<Facets> {
  let query = supabase
    .from("products")
    .select("color,fabric,fit,tags,product_variants(size)")
    .eq("is_published", true);
  if (categoryIds) {
    if (categoryIds.length === 0) return { sizes: [], colors: [], fits: [], fabrics: [] };
    query = query.in("category_id", categoryIds);
  }
  if (slug === "sale") query = query.not("compare_at_price", "is", null);
  if (slug === "new-arrivals") {
    query = query.gte(
      "created_at",
      new Date(Date.now() - NEW_ARRIVAL_DAYS * 86_400_000).toISOString(),
    );
  }
  const { data, error } = await query;
  if (error) throw error;
  const rows = data as unknown as {
    color: string | null;
    fabric: string | null;
    fit: string | null;
    tags: string[];
    product_variants: { size: string }[];
  }[];
  const uniq = (xs: (string | null | undefined)[]) =>
    [...new Set(xs.filter((x): x is string => !!x))].sort();
  return {
    sizes: uniq(rows.flatMap((r) => r.product_variants.map((v) => v.size))),
    colors: uniq(rows.map((r) => r.color)),
    fits: uniq(rows.flatMap((r) => [r.fit, ...r.tags])),
    fabrics: uniq(rows.map((r) => r.fabric)),
  };
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
export const bestsellersQuery = queryOptions({
  queryKey: ["products", "bestsellers"],
  queryFn: async (): Promise<ProductCard[]> => {
    const { data, error } = await supabase
      .from("products")
      .select(CARD_SELECT)
      .eq("is_published", true)
      .eq("is_bestseller", true)
      .order("sales_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8);
    if (error) throw error;
    return (data as unknown as ProductCard[]).map(normalizeCard);
  },
});

export const productQuery = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: async (): Promise<ProductDetail | null> => {
      const { data, error } = await supabase
        .from("products")
        .select(DETAIL_SELECT)
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      return data ? normalizeCard(data as unknown as ProductDetail) : null;
    },
  });

export const completeTheLookQuery = (productId: string, categoryId: string | null) =>
  queryOptions({
    queryKey: ["products", "complete-the-look", productId],
    queryFn: async (): Promise<ProductCard[]> => {
      let query = supabase
        .from("products")
        .select(CARD_SELECT)
        .eq("is_published", true)
        .neq("id", productId)
        .order("is_bestseller", { ascending: false })
        .order("sales_count", { ascending: false })
        .limit(12);
      if (categoryId) query = query.neq("category_id", categoryId);
      const { data, error } = await query;
      if (error) throw error;
      // One product per category so the look spans different pieces.
      const seen = new Set<string>();
      const picks: ProductCard[] = [];
      for (const p of (data as unknown as ProductCard[]).map(normalizeCard)) {
        const key = p.category?.slug ?? p.id;
        if (seen.has(key)) continue;
        seen.add(key);
        picks.push(p);
        if (picks.length === 4) break;
      }
      return picks;
    },
  });

export const productsByIdsQuery = (ids: string[]) =>
  queryOptions({
    queryKey: ["products", "by-ids", [...ids].sort()],
    queryFn: async (): Promise<ProductCard[]> => {
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("products")
        .select(CARD_SELECT)
        .in("id", ids)
        .eq("is_published", true);
      if (error) throw error;
      return (data as unknown as ProductCard[]).map(normalizeCard);
    },
  });

export async function searchProducts(term: string, limit = 6): Promise<ProductCard[]> {
  const cleaned = term
    .replace(/[^\p{L}\p{N} -]/gu, " ")
    .trim()
    .slice(0, 40);
  if (cleaned.length < 2) return [];
  const pattern = `%${cleaned.replace(/\s+/g, "%")}%`;
  const { data, error } = await supabase
    .from("products")
    .select(CARD_SELECT)
    .eq("is_published", true)
    .or(`name.ilike.${pattern},color.ilike.${pattern},fit.ilike.${pattern},fabric.ilike.${pattern}`)
    .order("is_bestseller", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as ProductCard[]).map(normalizeCard);
}

// ---------------------------------------------------------------------------
// Party Packs and festive banner
// ---------------------------------------------------------------------------
export type Bundle = {
  id: string;
  name: string;
  description: string;
  price: number;
  sort_order: number;
  items: ProductCard[];
};

export const bundlesQuery = queryOptions({
  queryKey: ["bundles"],
  queryFn: async (): Promise<Bundle[]> => {
    const { data, error } = await supabase
      .from("bundles")
      .select(
        `id,name,description,price,sort_order,bundle_items(sort_order,product:products(${CARD_SELECT}))`,
      )
      .eq("is_published", true)
      .order("sort_order")
      .limit(3);
    if (error) throw error;
    type Row = {
      id: string;
      name: string;
      description: string;
      price: number;
      sort_order: number;
      bundle_items: { sort_order: number; product: ProductCard | null }[];
    };
    return (data as unknown as Row[]).map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      price: Number(b.price),
      sort_order: b.sort_order,
      items: [...b.bundle_items]
        .sort((x, y) => x.sort_order - y.sort_order)
        .map((bi) => bi.product)
        .filter((p): p is ProductCard => !!p)
        .map(normalizeCard),
    }));
  },
});

export type Hotspot = {
  id: string;
  number: number;
  x_percent: number;
  y_percent: number;
  product: ProductCard;
};
export type Banner = {
  id: string;
  title: string;
  image_url: string | null;
  cta_label: string;
  cta_link: string;
  hotspots: Hotspot[];
};

export const activeBannerQuery = queryOptions({
  queryKey: ["banner", "active"],
  queryFn: async (): Promise<Banner | null> => {
    const { data, error } = await supabase
      .from("banners")
      .select(
        `id,title,image_url,cta_label,cta_link,banner_hotspots(id,number,x_percent,y_percent,product:products(${CARD_SELECT}))`,
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    type Row = Omit<Banner, "hotspots"> & {
      banner_hotspots: {
        id: string;
        number: number;
        x_percent: number;
        y_percent: number;
        product: ProductCard | null;
      }[];
    };
    const row = data as unknown as Row;
    return {
      id: row.id,
      title: row.title,
      image_url: row.image_url,
      cta_label: row.cta_label,
      cta_link: row.cta_link,
      hotspots: row.banner_hotspots
        .filter((h): h is typeof h & { product: ProductCard } => !!h.product)
        .map((h) => ({
          ...h,
          x_percent: Number(h.x_percent),
          y_percent: Number(h.y_percent),
          product: normalizeCard(h.product),
        }))
        .sort((a, b) => a.number - b.number),
    };
  },
});
