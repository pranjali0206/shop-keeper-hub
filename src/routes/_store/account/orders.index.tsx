import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { LogOut, Package } from "lucide-react";

import { EmptyState, ErrorState } from "@/components/common/States";
import { AuthForms } from "@/components/store/AuthForms";
import { STATUS_PILL } from "@/components/store/OrderParts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { formatDate, formatINR, plural } from "@/lib/format";
import { myOrdersQuery, statusLabel } from "@/lib/orders";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_store/account/orders/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My orders | SOL" },
      { name: "description", content: "Track your S.O.L orders." },
    ],
  }),
  component: MyOrders,
});

function MyOrders() {
  const { user, loading, signOut } = useAuth();
  const orders = useQuery({ ...myOrdersQuery(user?.id ?? ""), enabled: !!user });

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-4xl">My orders</h1>
        <p className="mt-2 text-muted-foreground">Sign in to see and track your orders.</p>
        <div className="mt-6 rounded-2xl bg-card p-6 shadow-sm">
          <AuthForms redirectPath="/account/orders" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl">My orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">Signed in as {user.email}</p>
        </div>
        <Button variant="outline" onClick={() => void signOut()}>
          <LogOut className="size-4" aria-hidden="true" /> Sign out
        </Button>
      </div>
      <div className="mt-8">
        {orders.isPending ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : orders.isError ? (
          <ErrorState error={orders.error} onRetry={() => void orders.refetch()} />
        ) : orders.data.length === 0 ? (
          <EmptyState
            title="No orders yet"
            icon={<Package className="size-8 text-muted-foreground" aria-hidden="true" />}
            action={
              <Button asChild>
                <Link to="/shop/$slug" params={{ slug: "new-arrivals" }} search={{}}>
                  Shop new drop
                </Link>
              </Button>
            }
          >
            Your first fit is waiting.
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {orders.data.map((o) => (
              <li key={o.id}>
                <Link
                  to="/account/orders/$orderNumber"
                  params={{ orderNumber: o.order_number }}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card p-4 shadow-sm hover:ring-2 hover:ring-primary"
                >
                  <span>
                    <span className="block font-bold">{o.order_number}</span>
                    <span className="block text-sm text-muted-foreground">
                      {formatDate(o.created_at)} ·{" "}
                      {plural(
                        o.order_items.reduce((n, i) => n + i.qty, 0),
                        "item",
                      )}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-bold",
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
      </div>
    </div>
  );
}
