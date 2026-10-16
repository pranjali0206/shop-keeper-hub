import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

import { EmptyState, ErrorState } from "@/components/common/States";
import { OrderSummary } from "@/components/store/OrderParts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { orderByNumberQuery } from "@/lib/orders";

export const Route = createFileRoute("/_store/order-confirmed/$orderNumber")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Order placed | SOL" },
      { name: "description", content: "Your S.O.L order is in." },
    ],
  }),
  component: OrderConfirmed,
});

function OrderConfirmed() {
  const { orderNumber } = Route.useParams();
  const { user, loading } = useAuth();
  const {
    data: order,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({ ...orderByNumberQuery(orderNumber), enabled: !!user });

  if (loading || (user && isPending)) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-12">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState
          title="Sign in to see this order"
          action={
            <Button asChild>
              <Link to="/auth" search={{ redirect: `/order-confirmed/${orderNumber}` }}>
                Sign in
              </Link>
            </Button>
          }
        />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    );
  }
  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState title="Order not found">
          We couldn&apos;t find order {orderNumber} on your account.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-start gap-4">
        <CheckCircle2 className="size-10 shrink-0 text-success" aria-hidden="true" />
        <div>
          <h1 className="text-4xl sm:text-5xl">You&apos;re all set.</h1>
          <p className="mt-2 text-lg">
            Order <strong>{order.order_number}</strong> is in. We&apos;ll confirm it shortly.
          </p>
        </div>
      </div>
      {order.payment_status === "demo" ? (
        <p className="mt-6 rounded-lg border bg-muted p-3 text-sm">
          Demo store: no money was charged for this order.
        </p>
      ) : null}
      <div className="mt-8 rounded-2xl bg-card p-6 shadow-sm">
        <OrderSummary order={order} />
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link to="/account/orders/$orderNumber" params={{ orderNumber: order.order_number }}>
            Track this order
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/shop/$slug" params={{ slug: "new-arrivals" }} search={{}}>
            Keep shopping
          </Link>
        </Button>
      </div>
    </div>
  );
}
