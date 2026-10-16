import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { EmptyState, ErrorState } from "@/components/common/States";
import { OrderSummary, OrderTimeline } from "@/components/store/OrderParts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { orderByNumberQuery } from "@/lib/orders";

export const Route = createFileRoute("/_store/account/orders/$orderNumber")({
  ssr: false,
  head: ({ params }) => ({
    meta: [
      { title: `Order ${params.orderNumber} | SOL` },
      { name: "description", content: "Order status and details." },
    ],
  }),
  component: OrderDetail,
});

function OrderDetail() {
  const { orderNumber } = Route.useParams();
  const { user, loading } = useAuth();
  const {
    data: order,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({ ...orderByNumberQuery(orderNumber), enabled: !!user });

  const back = (
    <Link
      to="/account/orders"
      className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold hover:underline"
    >
      <ArrowLeft className="size-4" aria-hidden="true" /> All orders
    </Link>
  );

  if (loading || (user && isPending)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
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
              <Link to="/auth" search={{ redirect: `/account/orders/${orderNumber}` }}>
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
        {back}
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    );
  }
  // Row Level Security returns nothing for someone else's order, so it reads as not found.
  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        {back}
        <EmptyState title="Order not found" className="mt-4">
          There&apos;s no order {orderNumber} on your account.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {back}
      <h1 className="mt-2 text-4xl sm:text-5xl">Order {order.order_number}</h1>
      <div className="mt-8 rounded-2xl bg-card p-6 shadow-sm">
        <OrderTimeline status={order.status} />
      </div>
      <div className="mt-6 rounded-2xl bg-card p-6 shadow-sm">
        <OrderSummary order={order} />
      </div>
    </div>
  );
}
