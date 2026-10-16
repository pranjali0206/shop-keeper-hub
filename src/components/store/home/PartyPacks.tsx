import { useQuery } from "@tanstack/react-query";
import { PackagePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ProductImage } from "@/components/common/ProductImage";
import { EmptyState, ErrorState } from "@/components/common/States";
import { SizeSelector } from "@/components/store/SizeSelector";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/lib/cart";
import { garmentFor } from "@/lib/catalog";
import { bundlesQuery, totalStock, type Bundle } from "@/lib/data";
import { discountPercent, formatINR } from "@/lib/format";

export function bundleTotals(bundle: Bundle) {
  const full = bundle.items.reduce((sum, p) => sum + p.price, 0);
  return { full, off: discountPercent(bundle.price, full) };
}

function PartyPackDialog({
  bundle,
  open,
  onOpenChange,
}: {
  bundle: Bundle;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const cart = useCart();
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setSizes({});
      setErrors({});
    }
  }, [open]);

  function addAll() {
    const missing: Record<string, string> = {};
    for (const p of bundle.items) if (!sizes[p.id]) missing[p.id] = "Choose a size first";
    if (Object.keys(missing).length) {
      setErrors(missing);
      return;
    }
    const result = cart.addBundle(bundle, sizes);
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }
    onOpenChange(false);
    toast.success(`${bundle.name} added to cart`, {
      action: { label: "View cart", onClick: () => cart.open() },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display pr-8 text-2xl">{bundle.name}</DialogTitle>
          <DialogDescription>
            Pick a size for each piece. All three go in your cart at the pack price.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {bundle.items.map((p) => (
            <div key={p.id} className="flex gap-3">
              <ProductImage
                src={p.product_images[0]?.url}
                alt={p.product_images[0]?.alt || p.name}
                garment={garmentFor(p.category?.slug, p.slug)}
                color={p.color}
                seed={p.slug}
                className="aspect-[4/5] w-16 shrink-0 rounded-lg"
                sizes="64px"
              />
              <div className="min-w-0 flex-1">
                <SizeSelector
                  legend={p.name}
                  name={`pack-${bundle.id}-${p.id}`}
                  variants={p.product_variants}
                  value={sizes[p.id] ?? null}
                  onChange={(s) => {
                    setSizes((prev) => ({ ...prev, [p.id]: s }));
                    setErrors((prev) => {
                      const { [p.id]: _drop, ...rest } = prev;
                      return rest;
                    });
                  }}
                  error={errors[p.id]}
                />
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button size="lg" className="w-full bg-paper text-ink hover:bg-paper/90" onClick={addAll}>
            Add all 3 for {formatINR(bundle.price)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PackCard({ bundle }: { bundle: Bundle }) {
  const [open, setOpen] = useState(false);
  const { full, off } = bundleTotals(bundle);
  const available = bundle.items.length === 3 && bundle.items.every((p) => totalStock(p) > 0);
  return (
    <article className="flex flex-col rounded-3xl border border-noir-line bg-noir-soft p-4">
      <div className="grid grid-cols-3 gap-2">
        {bundle.items.map((p) => (
          <ProductImage
            key={p.id}
            src={p.product_images[0]?.url}
            alt={p.product_images[0]?.alt || p.name}
            garment={garmentFor(p.category?.slug, p.slug)}
            color={p.color}
            seed={p.slug}
            className="aspect-[3/4] rounded-xl"
            sizes="(min-width: 1024px) 10vw, 30vw"
          />
        ))}
      </div>
      <h3 className="mt-4 text-2xl">{bundle.name}</h3>
      <p className="mt-1 flex-1 text-sm text-on-noir-muted">{bundle.description}</p>
      <p className="mt-4 flex flex-wrap items-baseline gap-x-3">
        <span className="text-2xl font-bold">
          <span className="sr-only">Pack price </span>
          {formatINR(bundle.price)}
        </span>
        {off > 0 ? (
          <>
            <s className="text-on-noir-muted">
              <span className="sr-only">bought separately </span>
              {formatINR(full)}
            </s>
            <span className="rounded-full bg-paper px-2 py-0.5 text-sm font-bold text-ink">
              {off}% off
            </span>
          </>
        ) : null}
      </p>
      <Button
        size="lg"
        onClick={() => setOpen(true)}
        disabled={!available}
        className="mt-4 w-full rounded-full bg-paper font-bold text-ink hover:bg-paper/90"
      >
        <PackagePlus className="size-5" aria-hidden="true" />{" "}
        {available ? "Add full look" : "Sold out"}
      </Button>
      <PartyPackDialog bundle={bundle} open={open} onOpenChange={setOpen} />
    </article>
  );
}

export function PartyPacks() {
  const { data, isPending, isError, error, refetch } = useQuery(bundlesQuery);
  return (
    <section aria-labelledby="packs-title" className="surface-noir py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-paper">Party Packs</p>
            <h2 id="packs-title" className="mt-2 text-4xl sm:text-5xl">
              One tap. Full look.
            </h2>
          </div>
          <p className="max-w-sm text-on-noir-muted">
            Three pieces styled together, priced lower than buying them solo.
          </p>
        </div>
        {isPending ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-96 rounded-3xl bg-noir-soft" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Party Packs didn't load"
            error={error}
            onRetry={() => void refetch()}
          />
        ) : data.length === 0 ? (
          <EmptyState title="Packs are being styled">
            New Party Packs drop soon. Check back this week.
          </EmptyState>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {data.map((b) => (
              <PackCard key={b.id} bundle={b} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
