import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Clock, IndianRupee, ShoppingCart } from "lucide-react";

import { AdminPageHeader, LoadingRows } from "@/components/admin/AdminUI";
import { EmptyState, ErrorState } from "@/components/common/States";
import { STATUS_PILL } from "@/components/store/OrderParts";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, startOfToday } from "@/lib/admin";
import { formatDate, formatINR } from "@/lib/format";
import { statusLabel } from "@/lib/orders";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

const LOW_STOCK = 5;

function useDashboard() {
  return useQuery({
    queryKey: ["admin", "dashboard"],
    staleTime: 0,
    queryFn: async () => {
      const [month, pending, low, recent] = await Promise.all([
        supabase
          .from("orders")
          .select("id,total,status,created_at")
          .gte("created_at", startOfMonth().toISOString()),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("product_variants")
          .select("id,size,stock,product:products(id,name)")
          .lt("stock", LOW_STOCK)
          .order("stock")
          .limit(30),
        supabase
          .from("orders")
          .select("id,order_number,name,total,status,created_at")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      for (const r of [month, pending, low, recent]) if (r.error) throw r.error;
      const today = startOfToday().getTime();
      const live = (month.data ?? []).filter((o) => o.status !== "cancelled");
      const todays = live.filter((o) => new Date(o.created_at).getTime() >= today);
      return {
        ordersToday: (month.data ?? []).filter((o) => new Date(o.created_at).getTime() >= today)
          .length,
        revenueToday: todays.reduce((s, o) => s + Number(o.total), 0),
        revenueMonth: live.reduce((s, o) => s + Number(o.total), 0),
        pending: pending.count ?? 0,
        lowStock: (low.data ?? []) as unknown as {
          id: string;
          size: string;
          stock: number;
          product: { id: string; name: string } | null;
        }[],
        recent: recent.data ?? [],
      };
    },
  });
}

function Stat({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: string;
  icon: typeof Clock;
  href?: "/admin/orders";
}) {
  const body = (
    <>
      <span className="flex items-center justify-between text-sm font-semibold text-muted-foreground">
        {label} <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="mt-2 block font-display text-3xl">{value}</span>
    </>
  );
  return href ? (
    <Link
      to={href}
      search={{ status: "pending" }}
      className="block rounded-2xl bg-card p-5 shadow-sm hover:ring-2 hover:ring-primary"
    >
      {body}
    </Link>
  ) : (
    <div className="rounded-2xl bg-card p-5 shadow-sm">{body}</div>
  );
}

function Dashboard() {
  const { data, isPending, isError, error, refetch } = useDashboard();
  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        description={formatDate(new Date(), { dateStyle: "full" })}
      />
      {isPending ? (
        <LoadingRows rows={4} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Orders today" value={String(data.ordersToday)} icon={ShoppingCart} />
            <Stat label="Revenue today" value={formatINR(data.revenueToday)} icon={IndianRupee} />
            <Stat
              label="Revenue this month"
              value={formatINR(data.revenueMonth)}
              icon={IndianRupee}
            />
            <Stat
              label="Pending orders"
              value={String(data.pending)}
              icon={Clock}
              href="/admin/orders"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Revenue excludes cancelled orders. Demo payments are counted as order value.
          </p>

          <div className="grid gap-6 xl:grid-cols-2">
            <section aria-labelledby="low-title" className="rounded-2xl bg-card p-5 shadow-sm">
              <h2 id="low-title" className="mb-4 flex items-center gap-2 text-xl">
                <AlertTriangle className="size-5 text-destructive" aria-hidden="true" /> Low stock
                (under {LOW_STOCK})
              </h2>
              {data.lowStock.length === 0 ? (
                <EmptyState title="All sizes are well stocked" />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th scope="col" className="py-2">
                        Product
                      </th>
                      <th scope="col" className="py-2">
                        Size
                      </th>
                      <th scope="col" className="py-2 text-right">
                        Stock
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lowStock.map((v) => (
                      <tr key={v.id} className="border-b last:border-0">
                        <td className="py-2">
                          {v.product ? (
                            <Link
                              to="/admin/products/$productId"
                              params={{ productId: v.product.id }}
                              className="font-semibold hover:underline"
                            >
                              {v.product.name}
                            </Link>
                          ) : (
                            "Unknown"
                          )}
                        </td>
                        <td className="py-2">{v.size}</td>
                        <td
                          className={cn(
                            "py-2 text-right font-bold",
                            v.stock === 0 && "text-destructive",
                          )}
                        >
                          {v.stock === 0 ? "Sold out" : v.stock}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section aria-labelledby="recent-title" className="rounded-2xl bg-card p-5 shadow-sm">
              <h2 id="recent-title" className="mb-4 text-xl">
                Latest orders
              </h2>
              {data.recent.length === 0 ? (
                <EmptyState title="No orders yet">
                  They'll show up here as soon as they land.
                </EmptyState>
              ) : (
                <ul className="divide-y">
                  {data.recent.map((o) => (
                    <li key={o.id}>
                      <Link
                        to="/admin/orders/$orderId"
                        params={{ orderId: o.id }}
                        className="flex min-h-14 items-center justify-between gap-3 py-2 hover:underline"
                      >
                        <span>
                          <span className="block font-semibold">{o.order_number}</span>
                          <span className="block text-xs text-muted-foreground">
                            {o.name} ·{" "}
                            {formatDate(o.created_at, { dateStyle: "medium", timeStyle: "short" })}
                          </span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-bold",
                              STATUS_PILL[o.status],
                            )}
                          >
                            {statusLabel(o.status)}
                          </span>
                          <span className="font-bold">{formatINR(o.total)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
