import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AdminPageHeader, LoadingRows } from "@/components/admin/AdminUI";
import { useDebounced } from "@/components/store/SearchDialog";
import { EmptyState, ErrorState } from "@/components/common/States";
import { STATUS_PILL } from "@/components/store/OrderParts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatINR } from "@/lib/format";
import { ORDER_STATUSES, PAYMENT_LABELS, statusLabel, type OrderStatus } from "@/lib/orders";
import { cn } from "@/lib/utils";

type Search = { status?: OrderStatus; q?: string; page?: string };
const PER_PAGE = 25;

export const Route = createFileRoute("/admin/orders/")({
  validateSearch: (raw: Record<string, unknown>): Search => {
    const out: Search = {};
    if (ORDER_STATUSES.some((s) => s.value === raw["status"]))
      out.status = raw["status"] as OrderStatus;
    if (typeof raw["q"] === "string" && raw["q"].trim()) out.q = raw["q"].trim().slice(0, 40);
    if (typeof raw["page"] === "string" && /^\d{1,4}$/.test(raw["page"])) out.page = raw["page"];
    return out;
  },
  component: OrdersAdmin,
});

function OrdersAdmin() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [term, setTerm] = useState(search.q ?? "");
  const debounced = useDebounced(term.trim(), 350);
  const page = Number(search.page ?? "0");

  const set = (patch: { [K in keyof Search]?: Search[K] | undefined }) => {
    const next = { ...search, ...patch } as Search;
    (Object.keys(next) as (keyof Search)[]).forEach((k) => {
      if (!next[k]) delete next[k];
    });
    void navigate({ search: next, replace: true });
  };

  useEffect(() => {
    if ((search.q ?? "") !== debounced) set({ q: debounced, page: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admin", "orders", search.status ?? "", search.q ?? "", page],
    placeholderData: keepPreviousData,
    staleTime: 0,
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select(
          "id,order_number,name,phone,total,status,payment_method,payment_status,created_at",
          { count: "exact" },
        )
        .order("created_at", { ascending: false });
      if (search.status) query = query.eq("status", search.status);
      if (search.q) {
        const q = search.q.replace(/[^a-zA-Z0-9 -]/g, "");
        if (q) query = query.or(`order_number.ilike.%${q}%,name.ilike.%${q}%,phone.ilike.%${q}%`);
      }
      const { data, error, count } = await query.range(
        page * PER_PAGE,
        page * PER_PAGE + PER_PAGE - 1,
      );
      if (error) throw error;
      return { rows: data, count: count ?? 0 };
    },
  });

  const pages = data ? Math.max(1, Math.ceil(data.count / PER_PAGE)) : 1;

  return (
    <div>
      <AdminPageHeader
        title="Orders"
        description={
          data
            ? `${data.count} orders${search.status ? ` · ${statusLabel(search.status)}` : ""}`
            : undefined
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-[2fr_1fr]">
        <div>
          <label htmlFor="o-search" className="mb-1 block text-sm font-semibold">
            Search by order number, name or phone
          </label>
          <Input
            id="o-search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="SOL-1001, Ravi, 98765…"
          />
        </div>
        <div>
          <label htmlFor="o-status" className="mb-1 block text-sm font-semibold">
            Status
          </label>
          <select
            id="o-status"
            value={search.status ?? ""}
            onChange={(e) =>
              set({ status: (e.target.value || undefined) as OrderStatus | undefined, page: "" })
            }
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isPending ? (
        <LoadingRows />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.rows.length === 0 ? (
        <EmptyState title={search.q || search.status ? "No orders match" : "No orders yet"}>
          {search.q || search.status
            ? "Try a different search or status."
            : "Orders appear here the moment customers place them."}
        </EmptyState>
      ) : (
        <>
          <div
            className={cn(
              "overflow-x-auto rounded-2xl bg-card shadow-sm",
              isFetching && "opacity-70",
            )}
          >
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th scope="col" className="p-3">
                    Order
                  </th>
                  <th scope="col" className="p-3">
                    Date
                  </th>
                  <th scope="col" className="p-3">
                    Customer
                  </th>
                  <th scope="col" className="p-3">
                    Payment
                  </th>
                  <th scope="col" className="p-3 text-right">
                    Total
                  </th>
                  <th scope="col" className="p-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((o) => (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-accent/50">
                    <td className="p-3">
                      <Link
                        to="/admin/orders/$orderId"
                        params={{ orderId: o.id }}
                        className="inline-flex min-h-11 items-center font-bold text-primary hover:underline"
                      >
                        {o.order_number}
                      </Link>
                    </td>
                    <td className="p-3">
                      {formatDate(o.created_at, { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="p-3">
                      <span className="block font-semibold">{o.name}</span>
                      <span className="block text-muted-foreground">{o.phone}</span>
                    </td>
                    <td className="p-3">
                      {PAYMENT_LABELS[o.payment_method] ?? o.payment_method}
                      <span className="block text-xs text-muted-foreground">
                        {o.payment_status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-semibold">{formatINR(o.total)}</td>
                    <td className="p-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-bold",
                          STATUS_PILL[o.status],
                        )}
                      >
                        {statusLabel(o.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 ? (
            <nav aria-label="Pagination" className="mt-4 flex items-center justify-between">
              <Button
                variant="outline"
                disabled={page === 0}
                onClick={() => set({ page: page - 1 ? String(page - 1) : "" })}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {page + 1} of {pages}
              </span>
              <Button
                variant="outline"
                disabled={page + 1 >= pages}
                onClick={() => set({ page: String(page + 1) })}
              >
                Next
              </Button>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
