import { Check, X } from "lucide-react";

import { formatDate, formatINR } from "@/lib/format";
import {
  PAYMENT_LABELS,
  PAYMENT_STATUS_LABELS,
  statusLabel,
  type OrderWithItems,
} from "@/lib/orders";
import { cn } from "@/lib/utils";

const FLOW = ["pending", "confirmed", "shipped", "delivered"] as const;

export const STATUS_PILL: Record<string, string> = {
  pending: "bg-muted text-foreground ring-1 ring-border",
  confirmed: "bg-primary text-primary-foreground",
  shipped: "bg-primary text-primary-foreground",
  delivered: "bg-success text-white dark:text-ink",
  cancelled: "bg-destructive text-destructive-foreground",
};

export function OrderTimeline({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-3 rounded-xl border-2 border-destructive p-4">
        <span className="grid size-9 place-items-center rounded-full bg-destructive text-destructive-foreground">
          <X className="size-5" aria-hidden="true" />
        </span>
        <p className="font-semibold">This order was cancelled.</p>
      </div>
    );
  }
  const current = Math.max(0, FLOW.indexOf(status as (typeof FLOW)[number]));
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Order status">
      {FLOW.map((step, i) => {
        const done = i <= current;
        return (
          <li
            key={step}
            className="flex flex-col items-center gap-2 text-center"
            aria-current={i === current ? "step" : undefined}
          >
            <span className="flex w-full items-center">
              <span
                className={cn(
                  "h-1 flex-1 rounded",
                  i === 0 ? "invisible" : done ? "bg-primary" : "bg-border",
                )}
              />
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full border-2 text-sm font-bold",
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                {done ? <Check className="size-5" aria-hidden="true" /> : i + 1}
              </span>
              <span
                className={cn(
                  "h-1 flex-1 rounded",
                  i === FLOW.length - 1 ? "invisible" : i < current ? "bg-primary" : "bg-border",
                )}
              />
            </span>
            <span
              className={cn("text-xs font-semibold sm:text-sm", !done && "text-muted-foreground")}
            >
              {statusLabel(step)}
              <span className="sr-only">
                {done ? (i === current ? " (current)" : " (done)") : " (upcoming)"}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderSummary({ order }: { order: OrderWithItems }) {
  const bundles = new Map<string, OrderWithItems["order_items"]>();
  const singles: OrderWithItems["order_items"] = [];
  for (const item of order.order_items) {
    if (item.bundle_id) bundles.set(item.bundle_id, [...(bundles.get(item.bundle_id) ?? []), item]);
    else singles.push(item);
  }
  return (
    <div className="space-y-6">
      <div className="grid gap-4 text-sm sm:grid-cols-3">
        <div>
          <p className="font-semibold">Placed</p>
          <p className="text-muted-foreground">
            {formatDate(order.created_at, { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <div>
          <p className="font-semibold">Payment</p>
          <p className="text-muted-foreground">
            {PAYMENT_LABELS[order.payment_method] ?? order.payment_method} ·{" "}
            {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}
          </p>
        </div>
        <div>
          <p className="font-semibold">Deliver to</p>
          <p className="text-muted-foreground">
            {order.name}, {order.address} {order.pincode}
          </p>
        </div>
      </div>
      <table className="w-full text-sm">
        <caption className="sr-only">Items in order {order.order_number}</caption>
        <thead>
          <tr className="border-b text-left">
            <th scope="col" className="py-2">
              Item
            </th>
            <th scope="col" className="py-2">
              Size
            </th>
            <th scope="col" className="py-2 text-right">
              Qty
            </th>
            <th scope="col" className="py-2 text-right">
              Price
            </th>
          </tr>
        </thead>
        <tbody>
          {singles.map((i) => (
            <tr key={i.id} className="border-b">
              <td className="py-2 pr-2">{i.name}</td>
              <td className="py-2">{i.size}</td>
              <td className="py-2 text-right">{i.qty}</td>
              <td className="py-2 text-right">{formatINR(i.unit_price * i.qty)}</td>
            </tr>
          ))}
          {[...bundles.entries()].map(([id, items]) => (
            <tr key={id} className="border-b align-top">
              <td className="py-2 pr-2" colSpan={2}>
                <span className="font-semibold">Party Pack: {items[0]?.bundle_name}</span>
                <span className="block text-muted-foreground">
                  {items.map((i) => `${i.name} (${i.size})`).join(", ")}
                </span>
              </td>
              <td className="py-2 text-right">{items[0]?.qty}</td>
              <td className="py-2 text-right">
                {formatINR(items.reduce((s, i) => s + i.unit_price * i.qty, 0))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="ml-auto max-w-xs space-y-1 text-sm">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{formatINR(order.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Shipping</dt>
          <dd>{order.shipping === 0 ? "Free" : formatINR(order.shipping)}</dd>
        </div>
        <div className="flex justify-between border-t pt-1 text-base font-bold">
          <dt>Total</dt>
          <dd>{formatINR(order.total)}</dd>
        </div>
      </dl>
    </div>
  );
}
