import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Minus, PackageCheck, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { ProductImage } from "@/components/common/ProductImage";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCart, type CartLine } from "@/lib/cart";
import { settingsQuery } from "@/lib/data";
import { formatINR } from "@/lib/format";
import { freeShippingProgress } from "@/lib/pricing";

export function FreeShippingBar({ subtotal }: { subtotal: number }) {
  const { data: settings } = useQuery(settingsQuery);
  const min = Number(settings?.free_shipping_min ?? 999);
  const { remaining, percent, unlocked } = freeShippingProgress(subtotal, min);
  return (
    <div className="rounded-xl bg-muted p-3">
      <p className="mb-2 text-sm font-semibold" aria-live="polite">
        {unlocked ? "You have free shipping" : `Add ${formatINR(remaining)} more for free shipping`}
      </p>
      <Progress value={percent} aria-label="Progress toward free shipping" className="h-2" />
    </div>
  );
}

export function QtyStepper({ line }: { line: CartLine }) {
  const cart = useCart();
  const limit = line.maxQty || 1;
  return (
    <div
      className="inline-flex items-center rounded-full border"
      role="group"
      aria-label={`Quantity for ${line.name}`}
    >
      <button
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-full disabled:opacity-40"
        onClick={() => cart.setQty(line.key, line.qty - 1)}
        disabled={line.qty <= 1}
        aria-label="Decrease quantity"
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <span className="w-6 text-center text-sm font-bold" aria-live="polite">
        {line.qty}
      </span>
      <button
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-full disabled:opacity-40"
        onClick={() => cart.setQty(line.key, line.qty + 1)}
        disabled={line.qty >= limit}
        aria-label="Increase quantity"
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function LineRow({
  line,
  inGroup,
  onNavigate,
}: {
  line: CartLine;
  inGroup: boolean;
  onNavigate: () => void;
}) {
  const cart = useCart();
  return (
    <div className="flex gap-3">
      <ProductImage
        src={line.image}
        alt={line.imageAlt}
        garment={line.garment}
        color={line.color}
        seed={line.slug}
        className="aspect-[4/5] w-20 shrink-0 rounded-lg"
        sizes="80px"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          to="/product/$slug"
          params={{ slug: line.slug }}
          onClick={onNavigate}
          className="text-sm font-semibold hover:underline"
        >
          {line.name}
        </Link>
        <p className="text-sm text-muted-foreground">Size {line.size}</p>
        {!inGroup ? (
          <>
            <p className="text-sm font-bold">{formatINR(line.price * line.qty)}</p>
            <div className="mt-1 flex items-center justify-between">
              <QtyStepper line={line} />
              <button
                type="button"
                onClick={() => cart.remove(line.key)}
                className="inline-flex size-11 items-center justify-center rounded-full hover:bg-accent"
                aria-label={`Remove ${line.name} from cart`}
              >
                <Trash2 className="size-5" aria-hidden="true" />
              </button>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            <s>{formatINR(line.price)}</s> in this pack
          </p>
        )}
      </div>
    </div>
  );
}

/** Groups lines so a Party Pack shows as one block with one price and stepper. */
export function groupCartLines(lines: CartLine[]) {
  const groups: { key: string; lines: CartLine[] }[] = [];
  for (const line of lines) {
    const k = line.groupKey ?? line.key;
    const g = groups.find((x) => x.key === k);
    if (g) g.lines.push(line);
    else groups.push({ key: k, lines: [line] });
  }
  return groups;
}

export function CartLines({ onNavigate = () => undefined }: { onNavigate?: () => void }) {
  const cart = useCart();
  return (
    <ul className="space-y-5">
      {groupCartLines(cart.lines).map((g) => {
        const first = g.lines[0];
        if (!first) return null;
        if (!first.groupKey) {
          return (
            <li key={g.key}>
              <LineRow line={first} inGroup={false} onNavigate={onNavigate} />
            </li>
          );
        }
        return (
          <li key={g.key} className="rounded-xl border-2 border-foreground p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-bold">
                <PackageCheck className="size-4" aria-hidden="true" /> Party Pack:{" "}
                {first.bundleName}
              </p>
              <p className="text-sm font-bold">{formatINR((first.bundlePrice ?? 0) * first.qty)}</p>
            </div>
            <div className="space-y-3">
              {g.lines.map((l) => (
                <LineRow key={l.key} line={l} inGroup onNavigate={onNavigate} />
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <QtyStepper line={first} />
              <button
                type="button"
                onClick={() => cart.remove(first.key)}
                className="inline-flex h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold hover:bg-accent"
              >
                <Trash2 className="size-4" aria-hidden="true" /> Remove pack
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function CartDrawer() {
  const cart = useCart();
  const close = () => cart.close();
  return (
    <Sheet open={cart.isOpen} onOpenChange={cart.setOpen}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b p-4 text-left">
          <SheetTitle className="font-display text-xl">Your cart</SheetTitle>
          <SheetDescription>
            {cart.count === 0
              ? "Nothing here yet."
              : `${cart.count} ${cart.count === 1 ? "item" : "items"}`}
          </SheetDescription>
        </SheetHeader>

        {cart.lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <ShoppingBag className="size-10 text-muted-foreground" aria-hidden="true" />
            <p className="font-display text-xl">Your cart is empty</p>
            <p className="text-sm text-muted-foreground">Fresh fits are one tap away.</p>
            <Button asChild onClick={close}>
              <Link to="/shop/$slug" params={{ slug: "new-arrivals" }} search={{}}>
                Shop new drop
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="border-b p-4">
              <FreeShippingBar subtotal={cart.subtotal} />
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <CartLines onNavigate={close} />
            </div>
            <div className="space-y-3 border-t p-4">
              <div className="flex items-center justify-between text-base">
                <span className="font-semibold">Subtotal</span>
                <span className="font-bold">{formatINR(cart.subtotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Shipping and final total are confirmed at checkout.
              </p>
              <Button asChild size="lg" className="w-full">
                <Link to="/checkout" onClick={close}>
                  Go to checkout
                </Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
