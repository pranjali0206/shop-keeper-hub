import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Clock, MapPin, Navigation, Phone } from "lucide-react";
import { useState } from "react";

import { ProductImage } from "@/components/common/ProductImage";
import { EmptyState, ErrorState, ProductGridSkeleton } from "@/components/common/States";
import { ProductGrid } from "@/components/store/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FIT_CHIPS, fitLabel, garmentFor } from "@/lib/catalog";
import { bestsellersQuery, categoriesQuery, settingsQuery } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { deliveryEstimate } from "@/lib/pricing";
import { pincodeSchema } from "@/lib/validation";

const LANES = [
  { slug: "jeans", label: "Jeans", tagline: "Baggy. Slim. Ripped." },
  { slug: "shirts", label: "Shirts", tagline: "Office to after-party." },
  { slug: "ethnic", label: "Ethnic", tagline: "Kurtas with attitude." },
  { slug: "party-wear", label: "Party wear", tagline: "Own the floor." },
];

export function PickYourLane() {
  const { data: categories = [] } = useQuery(categoriesQuery);
  return (
    <section
      aria-labelledby="lanes-title"
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20"
    >
      <h2 id="lanes-title" className="text-4xl sm:text-5xl">
        Pick your lane
      </h2>
      <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {LANES.map((lane) => {
          const cat = categories.find((c) => c.slug === lane.slug);
          return (
            <li key={lane.slug}>
              <Link
                to="/shop/$slug"
                params={{ slug: lane.slug }}
                search={{}}
                className="group relative block overflow-hidden rounded-2xl shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-2xl focus-visible:-translate-y-2 motion-reduce:hover:translate-y-0"
              >
                <ProductImage
                  src={cat?.image_url}
                  alt=""
                  garment={garmentFor(lane.slug)}
                  color={
                    lane.slug === "jeans"
                      ? "black"
                      : lane.slug === "ethnic"
                        ? "grey"
                        : lane.slug === "party-wear"
                          ? "black"
                          : "white"
                  }
                  seed={`lane-${lane.slug}`}
                  className="aspect-[3/4] w-full"
                />
                <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12 text-white">
                  <span>
                    <span className="block font-display text-2xl sm:text-3xl">
                      {cat?.name ?? lane.label}
                    </span>
                    <span className="block text-sm">{lane.tagline}</span>
                  </span>
                  <ArrowUpRight
                    className="size-6 shrink-0 transition group-hover:rotate-45"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Bestsellers() {
  const { data, isPending, isError, error, refetch } = useQuery(bestsellersQuery);
  return (
    <section aria-labelledby="best-title" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <h2 id="best-title" className="text-4xl sm:text-5xl">
          Bestsellers
        </h2>
        <Link
          to="/shop/$slug"
          params={{ slug: "all" }}
          search={{ sort: "popular" }}
          className="inline-flex min-h-11 items-center font-bold text-primary hover:underline"
        >
          Shop all bestsellers
        </Link>
      </div>
      {isPending ? (
        <ProductGridSkeleton count={8} />
      ) : isError ? (
        <ErrorState title="Bestsellers didn't load" error={error} onRetry={() => void refetch()} />
      ) : data.length === 0 ? (
        <EmptyState title="No bestsellers yet">
          The crowd hasn't picked favourites yet. Browse the new drop instead.
        </EmptyState>
      ) : (
        <ProductGrid products={data} />
      )}
    </section>
  );
}

export function ShopByFit() {
  return (
    <section aria-labelledby="fit-title" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h2 id="fit-title" className="text-3xl sm:text-4xl">
        Shop by fit
      </h2>
      <ul className="mt-6 flex flex-wrap gap-3">
        {FIT_CHIPS.map((fit) => (
          <li key={fit}>
            <Link
              to="/shop/$slug"
              params={{ slug: "all" }}
              search={{ fit }}
              className="inline-flex h-12 items-center rounded-full border-2 border-foreground px-6 text-base font-bold transition hover:bg-foreground hover:text-background"
            >
              {fitLabel(fit)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function directionsHref(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

export function StoreLocator() {
  const { data: settings, isError, refetch } = useQuery(settingsQuery);
  const [pincode, setPincode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = pincodeSchema.safeParse(pincode);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid 6-digit pincode");
      setChecked(null);
      return;
    }
    setError(null);
    setChecked(parsed.data);
  }

  const estimate = checked ? deliveryEstimate(checked, settings?.pincode) : null;

  return (
    <section
      id="store-locator"
      aria-labelledby="store-title"
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6"
    >
      <div className="grid gap-8 rounded-3xl bg-card p-6 shadow-sm sm:p-10 md:grid-cols-2">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-primary">
            Try it on in store
          </p>
          <h2 id="store-title" className="mt-2 text-4xl sm:text-5xl">
            Feel the fabric first.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Drop your pincode and we'll show you how to reach us.
          </p>
          <form
            onSubmit={submit}
            noValidate
            className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start"
          >
            <div className="flex-1">
              <label htmlFor="store-pincode" className="mb-1 block text-sm font-semibold">
                Your pincode
              </label>
              <Input
                id="store-pincode"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                aria-invalid={!!error}
                aria-describedby={error ? "store-pincode-error" : undefined}
                placeholder="400050"
              />
              {error ? (
                <p id="store-pincode-error" className="mt-1 text-sm font-semibold text-destructive">
                  {error}
                </p>
              ) : null}
            </div>
            <Button type="submit" size="lg" className="sm:mt-6">
              Find store
            </Button>
          </form>
        </div>

        <div aria-live="polite">
          {isError ? (
            <ErrorState title="Store details didn't load" onRetry={() => void refetch()} />
          ) : checked && settings ? (
            <div className="rounded-2xl border-2 border-primary p-6">
              <p className="text-sm font-semibold text-muted-foreground">
                Nearest S.O.L store to {checked}
              </p>
              <h3 className="mt-1 text-2xl">{settings.shop_name}</h3>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex gap-2">
                  <MapPin className="size-5 shrink-0 text-primary" aria-hidden="true" />
                  <span>{settings.address}</span>
                </li>
                {settings.phone ? (
                  <li className="flex gap-2">
                    <Phone className="size-5 shrink-0 text-primary" aria-hidden="true" />
                    <a href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`} className="underline">
                      {settings.phone}
                    </a>
                  </li>
                ) : null}
                {settings.opening_hours ? (
                  <li className="flex gap-2">
                    <Clock className="size-5 shrink-0 text-primary" aria-hidden="true" />
                    <span>{settings.opening_hours}</span>
                  </li>
                ) : null}
              </ul>
              {estimate ? (
                <p className="mt-4 rounded-lg bg-muted p-3 text-sm">
                  Rather have it delivered? Orders to {checked} usually arrive by{" "}
                  <strong>{formatDate(estimate.latest, { day: "numeric", month: "short" })}</strong>
                  .
                </p>
              ) : null}
              <Button asChild size="lg" className="mt-5 w-full sm:w-auto">
                <a
                  href={directionsHref(settings.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Navigation className="size-5" aria-hidden="true" /> Get directions
                </a>
              </Button>
            </div>
          ) : (
            <div className="flex h-full min-h-48 items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center text-muted-foreground">
              One flagship store. Your pincode, our address, done.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
