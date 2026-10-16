import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Phone, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminPageHeader, LoadingRows } from "@/components/admin/AdminUI";
import { EmptyState, ErrorState } from "@/components/common/States";
import { OrderSummary, OrderTimeline } from "@/components/store/OrderParts";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { settingsQuery } from "@/lib/data";
import { errorMessage, formatDate } from "@/lib/format";
import {
  ORDER_STATUSES,
  PAYMENT_LABELS,
  PAYMENT_STATUS_LABELS,
  type OrderStatus,
  type OrderWithItems,
} from "@/lib/orders";

export const Route = createFileRoute("/admin/orders/$orderId")({
  component: OrderAdminDetail,
});

function PackingSlip({ order }: { order: OrderWithItems }) {
  const { data: settings } = useQuery(settingsQuery);
  return (
    <div className="hidden text-black print:block">
      <div className="flex items-start justify-between border-b-2 border-black pb-4">
        <div>
          <p className="font-display text-3xl tracking-[0.18em]">S.O.L</p>
          <p className="text-sm">{settings?.shop_name}</p>
          <p className="text-sm">{settings?.address}</p>
          <p className="text-sm">{settings?.phone}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold">Packing slip</p>
          <p className="text-lg font-bold">{order.order_number}</p>
          <p className="text-sm">{formatDate(order.created_at)}</p>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm font-bold uppercase">Ship to</p>
        <p className="text-lg font-semibold">{order.name}</p>
        <p>{order.address}</p>
        <p>PIN {order.pincode}</p>
        <p>Phone {order.phone}</p>
      </div>
      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-black text-left">
            <th className="py-2">Item</th>
            <th className="py-2">Size</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Packed</th>
          </tr>
        </thead>
        <tbody>
          {order.order_items.map((i) => (
            <tr key={i.id} className="border-b border-black/40">
              <td className="py-2">
                {i.name}
                {i.bundle_name ? (
                  <span className="block text-xs">Party Pack: {i.bundle_name}</span>
                ) : null}
              </td>
              <td className="py-2">{i.size}</td>
              <td className="py-2 text-right">{i.qty}</td>
              <td className="py-2 text-right">☐</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-6 text-sm">
        Payment: {PAYMENT_LABELS[order.payment_method]} ·{" "}
        {order.payment_method === "cod"
          ? `Collect ₹${order.total} on delivery`
          : PAYMENT_STATUS_LABELS[order.payment_status]}
      </p>
      <p className="mt-8 text-center text-sm">Thanks for shopping with S.O.L. Soul of Lifestyle.</p>
    </div>
  );
}

function OrderAdminDetail() {
  const { orderId } = Route.useParams();
  const queryClient = useQueryClient();
  const {
    data: order,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin", "order", orderId],
    staleTime: 0,
    queryFn: async (): Promise<OrderWithItems | null> => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as unknown as OrderWithItems;
      return {
        ...row,
        subtotal: Number(row.subtotal),
        shipping: Number(row.shipping),
        total: Number(row.total),
        order_items: row.order_items.map((i) => ({ ...i, unit_price: Number(i.unit_price) })),
      };
    },
  });
  const [status, setStatus] = useState<OrderStatus>("pending");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (order) setStatus(order.status as OrderStatus);
  }, [order]);

  if (isPending) return <LoadingRows rows={6} />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!order) {
    return (
      <EmptyState
        title="Order not found"
        action={
          <Button asChild variant="outline">
            <Link to="/admin/orders">Back to orders</Link>
          </Button>
        }
      />
    );
  }

  async function updateStatus() {
    if (!order || status === order.status) return;
    setSaving(true);
    const { error } = await supabase.from("orders").update({ status }).eq("id", order.id);
    setSaving(false);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    toast.success(`Order ${order.order_number} marked ${status}`);
    void queryClient.invalidateQueries({ queryKey: ["admin"] });
  }

  return (
    <div>
      <div className="print:hidden">
        <AdminPageHeader
          title={`Order ${order.order_number}`}
          description={formatDate(order.created_at, { dateStyle: "full", timeStyle: "short" })}
          actions={
            <>
              <Button asChild variant="outline">
                <Link to="/admin/orders">
                  <ArrowLeft className="size-4" aria-hidden="true" /> Orders
                </Link>
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="size-4" aria-hidden="true" /> Print packing slip
              </Button>
            </>
          }
        />
        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="space-y-6">
            <section aria-labelledby="timeline-h" className="rounded-2xl bg-card p-5 shadow-sm">
              <h2 id="timeline-h" className="mb-4 text-xl">
                Status
              </h2>
              <OrderTimeline status={order.status} />
              <div className="mt-5 flex flex-wrap items-end gap-2">
                <div className="flex-1">
                  <label htmlFor="o-status-update" className="mb-1 block text-sm font-semibold">
                    Update status
                  </label>
                  <select
                    id="o-status-update"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as OrderStatus)}
                    className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  onClick={() => void updateStatus()}
                  disabled={saving || status === order.status}
                >
                  {saving ? "Saving…" : "Save status"}
                </Button>
              </div>
              {status === "cancelled" && order.status !== "cancelled" ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Cancelling does not restock items automatically. Adjust stock in Products if
                  needed.
                </p>
              ) : null}
            </section>
            <section aria-labelledby="items-h" className="rounded-2xl bg-card p-5 shadow-sm">
              <h2 id="items-h" className="mb-4 text-xl">
                Items
              </h2>
              <OrderSummary order={order} />
            </section>
          </div>
          <section
            aria-labelledby="cust-h"
            className="h-fit space-y-3 rounded-2xl bg-card p-5 text-sm shadow-sm"
          >
            <h2 id="cust-h" className="text-xl">
              Customer
            </h2>
            <p className="text-base font-semibold">{order.name}</p>
            <p>
              <a
                href={`tel:+91${order.phone}`}
                className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline"
              >
                <Phone className="size-4" aria-hidden="true" /> +91 {order.phone}
              </a>
            </p>
            <div>
              <p className="font-semibold">Address</p>
              <p>{order.address}</p>
              <p>PIN {order.pincode}</p>
            </div>
            <div>
              <p className="font-semibold">Payment</p>
              <p>
                {PAYMENT_LABELS[order.payment_method] ?? order.payment_method} ·{" "}
                {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}
              </p>
            </div>
          </section>
        </div>
      </div>
      <PackingSlip order={order} />
    </div>
  );
}
