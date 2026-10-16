import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
export const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];
export const statusLabel = (s: string) => ORDER_STATUSES.find((x) => x.value === s)?.label ?? s;

export const PAYMENT_LABELS: Record<string, string> = {
  upi: "UPI",
  card: "Card",
  cod: "Cash on delivery",
};
export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  demo: "Demo (not charged)",
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

export type Order = Tables<"orders">;
export type OrderItem = Tables<"order_items">;
export type OrderWithItems = Order & { order_items: OrderItem[] };

const num = (o: Order): Order => ({
  ...o,
  subtotal: Number(o.subtotal),
  shipping: Number(o.shipping),
  total: Number(o.total),
});

/** RLS returns only the signed-in customer's own orders (or all orders for staff). */
export const orderByNumberQuery = (orderNumber: string) =>
  queryOptions({
    queryKey: ["order", orderNumber],
    queryFn: async (): Promise<OrderWithItems | null> => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("order_number", orderNumber)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as unknown as OrderWithItems;
      return {
        ...num(row),
        order_items: row.order_items.map((i) => ({ ...i, unit_price: Number(i.unit_price) })),
      };
    },
  });

export const myOrdersQuery = (userId: string) =>
  queryOptions({
    queryKey: ["my-orders", userId],
    queryFn: async (): Promise<(Order & { order_items: { qty: number }[] })[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(qty)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as (Order & { order_items: { qty: number }[] })[]).map((o) => ({
        ...num(o),
        order_items: o.order_items,
      }));
    },
  });
