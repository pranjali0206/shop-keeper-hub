import { queryOptions } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

/** For owner-only admin routes: staff are sent back to the dashboard. */
export function requireOwner(context: { isOwner?: boolean }) {
  if (!context.isOwner) throw redirect({ to: "/admin" });
}

export type AdminProduct = Tables<"products"> & {
  category: { id: string; name: string; slug: string } | null;
  product_images: Tables<"product_images">[];
  product_variants: Tables<"product_variants">[];
};

const ADMIN_PRODUCT_SELECT =
  "*, category:categories(id,name,slug), product_images(*), product_variants(*)";

function normalize(p: AdminProduct): AdminProduct {
  return {
    ...p,
    price: Number(p.price),
    compare_at_price: p.compare_at_price == null ? null : Number(p.compare_at_price),
    product_images: [...p.product_images].sort((a, b) => a.sort_order - b.sort_order),
  };
}

export const adminProductsQuery = queryOptions({
  queryKey: ["admin", "products"],
  queryFn: async (): Promise<AdminProduct[]> => {
    const { data, error } = await supabase
      .from("products")
      .select(ADMIN_PRODUCT_SELECT)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as unknown as AdminProduct[]).map(normalize);
  },
  staleTime: 0,
});

export const adminProductQuery = (id: string) =>
  queryOptions({
    queryKey: ["admin", "product", id],
    queryFn: async (): Promise<AdminProduct | null> => {
      const { data, error } = await supabase
        .from("products")
        .select(ADMIN_PRODUCT_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? normalize(data as unknown as AdminProduct) : null;
    },
    staleTime: 0,
  });

export const productStock = (p: { product_variants: { stock: number }[] }) =>
  p.product_variants.reduce((s, v) => s + v.stock, 0);

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfMonth() {
  const d = startOfToday();
  d.setDate(1);
  return d;
}
