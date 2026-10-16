import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useState, type ComponentPropsWithRef } from "react";

import { GarmentIllustration } from "@/components/common/GarmentIllustration";
import { InternalLink } from "@/components/common/InternalLink";
import { ProductImage } from "@/components/common/ProductImage";
import { ErrorState } from "@/components/common/States";
import { Price } from "@/components/store/Price";
import { QuickAddDialog } from "@/components/store/QuickAddDialog";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { garmentFor } from "@/lib/catalog";
import { activeBannerQuery, totalStock, type Hotspot } from "@/lib/data";

/** Placeholder art for the festive banner until a photo is uploaded. */
export function FestivePlaceholder({ label }: { label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="relative h-full w-full bg-[linear-gradient(120deg,#0A0A0A,#262626_50%,#404040)]"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.14),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.1),transparent_30%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-[8%] bottom-0 top-[12%] grid grid-cols-4 gap-[3%]"
      >
        {(["black", "grey", "white", "black"] as const).map((c, i) => (
          <div key={i} className="overflow-hidden rounded-t-full opacity-95">
            <GarmentIllustration
              kind={i === 1 ? "jacket" : "kurta"}
              color={c}
              seed={`festive-${i}`}
              label=""
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function PinCard({ hotspot, onAdd }: { hotspot: Hotspot; onAdd: () => void }) {
  const p = hotspot.product;
  const soldOut = totalStock(p) === 0;
  return (
    <div className="flex gap-3">
      <ProductImage
        src={p.product_images[0]?.url}
        alt={p.product_images[0]?.alt || p.name}
        garment={garmentFor(p.category?.slug, p.slug)}
        color={p.color}
        seed={p.slug}
        className="aspect-[4/5] w-20 shrink-0 rounded-lg"
        sizes="80px"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="font-semibold leading-snug">{p.name}</p>
        <Price price={p.price} compareAt={p.compare_at_price} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={onAdd} disabled={soldOut}>
            {soldOut ? "Sold out" : "Add to cart"}
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/product/$slug" params={{ slug: p.slug }}>
              View product
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function PinButton({
  hotspot,
  active,
  ...props
}: { hotspot: Hotspot; active: boolean } & ComponentPropsWithRef<"button">) {
  return (
    <button
      type="button"
      {...props}
      aria-expanded={active}
      aria-haspopup="dialog"
      aria-label={`Pin ${hotspot.number}: ${hotspot.product.name}`}
      className="group absolute grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full"
      style={{ left: `${hotspot.x_percent}%`, top: `${hotspot.y_percent}%` }}
    >
      <span
        className="absolute inset-0 rounded-full bg-paper/50 motion-safe:animate-ping"
        aria-hidden="true"
      />
      <span className="relative grid size-9 place-items-center rounded-full border-2 border-ink bg-paper text-sm font-bold text-ink shadow-lg transition group-hover:scale-110">
        {hotspot.number}
      </span>
    </button>
  );
}

export function FestiveHero() {
  const { data: banner, isPending, isError, error, refetch } = useQuery(activeBannerQuery);
  const isMobile = useIsMobile();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [quickAddId, setQuickAddId] = useState<string | null>(null);

  if (isPending) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <Skeleton className="aspect-[16/9] w-full rounded-3xl" />
      </section>
    );
  }
  if (isError) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <ErrorState
          title="The festive edit didn't load"
          error={error}
          onRetry={() => void refetch()}
        />
      </section>
    );
  }
  if (!banner) return null;

  const active = banner.hotspots.find((h) => h.id === activeId) ?? null;
  const quickAdd = banner.hotspots.find((h) => h.id === quickAddId)?.product ?? null;
  const openQuickAdd = (h: Hotspot) => {
    setActiveId(null);
    setQuickAddId(h.id);
  };

  return (
    <section
      aria-labelledby="festive-title"
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-primary">Tap the pins</p>
          <h2 id="festive-title" className="mt-2 text-4xl sm:text-5xl">
            {banner.title}
          </h2>
        </div>
        <InternalLink
          href={banner.cta_link}
          className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground hover:bg-primary/90"
        >
          {banner.cta_label} <ArrowRight className="size-5" aria-hidden="true" />
        </InternalLink>
      </div>

      <div className="relative aspect-[16/9] overflow-hidden rounded-3xl">
        {banner.image_url ? (
          <img
            src={banner.image_url}
            alt={banner.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <FestivePlaceholder label={`${banner.title}: kurtas and Nehru jackets`} />
        )}

        {banner.hotspots.map((h) =>
          isMobile ? (
            <PinButton
              key={h.id}
              hotspot={h}
              active={activeId === h.id}
              onClick={() => setActiveId(h.id)}
            />
          ) : (
            <Popover
              key={h.id}
              open={activeId === h.id}
              onOpenChange={(o) => setActiveId(o ? h.id : null)}
            >
              <PopoverTrigger asChild>
                <PinButton hotspot={h} active={activeId === h.id} />
              </PopoverTrigger>
              <PopoverContent className="w-80" aria-label={h.product.name}>
                <PinCard hotspot={h} onAdd={() => openQuickAdd(h)} />
              </PopoverContent>
            </Popover>
          ),
        )}
      </div>

      {isMobile ? (
        <Sheet open={!!active} onOpenChange={(o) => !o && setActiveId(null)}>
          <SheetContent side="bottom" className="rounded-t-3xl">
            <SheetHeader className="text-left">
              <SheetTitle>Pin {active?.number}</SheetTitle>
              <SheetDescription className="sr-only">Product details for this pin</SheetDescription>
            </SheetHeader>
            {active ? <PinCard hotspot={active} onAdd={() => openQuickAdd(active)} /> : null}
          </SheetContent>
        </Sheet>
      ) : null}

      <QuickAddDialog
        product={quickAdd}
        open={!!quickAdd}
        onOpenChange={(o) => !o && setQuickAddId(null)}
      />
    </section>
  );
}
