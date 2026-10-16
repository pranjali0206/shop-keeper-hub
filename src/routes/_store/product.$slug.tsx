import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { Heart, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, ProductGridSkeleton } from "@/components/common/States";
import { ProductGrid } from "@/components/store/ProductCard";
import { Price, ProductBadge } from "@/components/store/Price";
import { ProductGallery } from "@/components/store/ProductGallery";
import { SizeGuideDialog } from "@/components/store/SizeGuide";
import { SizeSelector } from "@/components/store/SizeSelector";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/lib/cart";
import { fitLabel, garmentFor, isWaistSize, titleCase } from "@/lib/catalog";
import {
  completeTheLookQuery,
  displayBadges,
  productQuery,
  settingsQuery,
  totalStock,
  type ProductDetail,
} from "@/lib/data";
import { formatDate, formatINR } from "@/lib/format";
import { deliveryEstimate } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { pincodeSchema } from "@/lib/validation";
import { useWishlist } from "@/lib/wishlist";

export const Route = createFileRoute("/_store/product/$slug")({
  loader: async ({ context, params }) => {
    const product = await context.queryClient.ensureQueryData(productQuery(params.slug));
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.product;
    return {
      meta: [
        { title: p ? `${p.name} | SOL` : "Product | SOL" },
        {
          name: "description",
          content: p
            ? `${p.name} for ${formatINR(p.price)}. ${p.description}`.slice(0, 160)
            : "Shop menswear at S.O.L.",
        },
        ...(p ? [{ property: "og:title", content: p.name }] : []),
      ],
    };
  },
  component: ProductPage,
});

function DeliveryCheck() {
  const { data: settings } = useQuery(settingsQuery);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  function check(e: React.FormEvent) {
    e.preventDefault();
    const parsed = pincodeSchema.safeParse(pin);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid 6-digit pincode");
      setResult(null);
      return;
    }
    setError(null);
    const est = deliveryEstimate(parsed.data, settings?.pincode);
    const fmt = (d: Date) => formatDate(d, { weekday: "short", day: "numeric", month: "short" });
    setResult(
      `Delivery to ${parsed.data} between ${fmt(est.earliest)} and ${fmt(est.latest)} (${est.minDays} to ${est.maxDays} days).` +
        (settings?.cod_enabled ? " Cash on delivery available." : ""),
    );
  }

  return (
    <form onSubmit={check} noValidate className="rounded-xl border p-4">
      <label htmlFor="pdp-pincode" className="flex items-center gap-2 text-sm font-semibold">
        <Truck className="size-4" aria-hidden="true" /> Check delivery
      </label>
      <div className="mt-2 flex gap-2">
        <Input
          id="pdp-pincode"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          placeholder="6-digit pincode"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          aria-invalid={!!error}
          aria-describedby="pdp-pincode-msg"
        />
        <Button type="submit" variant="outline">
          Check
        </Button>
      </div>
      <p
        id="pdp-pincode-msg"
        aria-live="polite"
        className={cn(
          "mt-2 text-sm",
          error ? "font-semibold text-destructive" : "text-muted-foreground",
        )}
      >
        {error ?? result ?? ""}
      </p>
    </form>
  );
}

function CompleteTheLook({ product }: { product: ProductDetail }) {
  const { data, isPending, isError, error, refetch } = useQuery(
    completeTheLookQuery(product.id, product.category_id),
  );
  return (
    <section aria-labelledby="look-title" className="mt-20">
      <h2 id="look-title" className="mb-6 text-3xl sm:text-4xl">
        Complete the look
      </h2>
      {isPending ? (
        <ProductGridSkeleton count={4} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.length === 0 ? (
        <EmptyState title="More pieces dropping soon" />
      ) : (
        <ProductGrid products={data} />
      )}
    </section>
  );
}

function ProductPage() {
  const { slug } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const { data: product } = useQuery({ ...productQuery(slug), initialData: loaderData.product });
  const { data: settings } = useQuery(settingsQuery);
  const cart = useCart();
  const wishlist = useWishlist();
  const navigate = useNavigate();
  const [size, setSize] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState<string | undefined>();

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16">
        <EmptyState title="This product is no longer available" />
      </div>
    );
  }

  const garment = garmentFor(product.category?.slug, product.slug);
  const soldOut = totalStock(product) === 0;
  const selectedStock = size
    ? (product.product_variants.find((v) => v.size === size)?.stock ?? 0)
    : null;
  const bottoms = product.product_variants.some((v) => isWaistSize(v.size));
  const saved = wishlist.has(product.id);
  const category = product.category;

  function add(goToCheckout: boolean) {
    if (!product) return;
    if (!size) {
      setSizeError("Choose a size first");
      document.getElementById("pdp-sizes")?.scrollIntoView({ block: "center" });
      return;
    }
    const result = cart.addItem(product, size);
    if (!result.ok) {
      setSizeError(result.reason);
      return;
    }
    if (goToCheckout) {
      void navigate({ to: "/checkout" });
    } else {
      toast.success(`${product.name} (${size}) added to cart`, {
        action: { label: "View cart", onClick: () => cart.open() },
      });
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link to="/" className="inline-flex min-h-11 items-center hover:underline">
              Home
            </Link>
          </li>
          {category?.parent ? (
            <li className="flex items-center gap-1">
              <span aria-hidden="true">/</span>
              <Link
                to="/shop/$slug"
                params={{ slug: category.parent.slug }}
                search={{}}
                className="inline-flex min-h-11 items-center hover:underline"
              >
                {category.parent.name}
              </Link>
            </li>
          ) : null}
          {category ? (
            <li className="flex items-center gap-1">
              <span aria-hidden="true">/</span>
              <Link
                to="/shop/$slug"
                params={{ slug: category.slug }}
                search={{}}
                className="inline-flex min-h-11 items-center hover:underline"
              >
                {category.name}
              </Link>
            </li>
          ) : null}
          <li className="flex items-center gap-1">
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="font-semibold text-foreground">
              {product.name}
            </span>
          </li>
        </ol>
      </nav>

      <div className="mt-4 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <ProductGallery
          images={product.product_images}
          name={product.name}
          garment={garment}
          color={product.color}
          seed={product.slug}
        />

        <div className="flex flex-col gap-5">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              {soldOut ? (
                <ProductBadge value="sold-out" />
              ) : (
                displayBadges(product).map((b) => <ProductBadge key={b} value={b} />)
              )}
            </div>
            <h1 className="text-4xl sm:text-5xl">{product.name}</h1>
            <Price
              price={product.price}
              compareAt={product.compare_at_price}
              size="lg"
              className="mt-3"
            />
            <p className="mt-1 text-sm text-muted-foreground">Inclusive of all taxes</p>
          </div>

          <div id="pdp-sizes">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {bottoms ? "Waist sizes in inches" : "Pick your size"}
              </span>
              <SizeGuideDialog bottoms={bottoms} />
            </div>
            <SizeSelector
              legend="Size"
              variants={product.product_variants}
              value={size}
              onChange={(s) => {
                setSize(s);
                setSizeError(undefined);
              }}
              error={sizeError}
            />
            {selectedStock !== null && selectedStock > 0 && selectedStock < 5 ? (
              <p className="mt-2 text-sm font-semibold text-destructive">
                Only {selectedStock} left in {size}
              </p>
            ) : null}
            {product.model_height && product.model_size ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Model is {product.model_height} and wears {product.model_size}.
              </p>
            ) : null}
          </div>

          <div className="flex gap-2">
            <Button size="lg" className="flex-1" onClick={() => add(false)} disabled={soldOut}>
              {soldOut ? "Sold out" : "Add to cart"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1 border-2 border-foreground"
              onClick={() => add(true)}
              disabled={soldOut}
            >
              Buy now
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-12 shrink-0 px-0"
              aria-pressed={saved}
              aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
              onClick={() => {
                const added = wishlist.toggle(product.id);
                toast(added ? "Saved to wishlist" : "Removed from wishlist");
              }}
            >
              <Heart
                className={cn("size-5", saved && "fill-destructive text-destructive")}
                aria-hidden="true"
              />
            </Button>
          </div>

          <DeliveryCheck />

          <Accordion type="multiple" defaultValue={["details"]} className="border-t">
            <AccordionItem value="details">
              <AccordionTrigger className="min-h-12 text-base font-semibold">
                Details
              </AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm leading-relaxed">
                <p>{product.description || "Details coming soon."}</p>
                {product.fit ? <p>Fit: {fitLabel(product.fit)}</p> : null}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="fabric">
              <AccordionTrigger className="min-h-12 text-base font-semibold">
                Fabric
              </AccordionTrigger>
              <AccordionContent className="text-sm">
                {product.fabric ? `${titleCase(product.fabric)}.` : "Fabric details coming soon."}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="care">
              <AccordionTrigger className="min-h-12 text-base font-semibold">Care</AccordionTrigger>
              <AccordionContent className="text-sm">
                {product.care || "Machine wash cold. Line dry in shade."}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="shipping">
              <AccordionTrigger className="min-h-12 text-base font-semibold">
                Shipping and returns
              </AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm">
                <p>
                  Free shipping on orders of {formatINR(settings?.free_shipping_min ?? 999)} and
                  above. Otherwise {formatINR(settings?.shipping_fee ?? 79)}.
                </p>
                <p>
                  Easy returns within {settings?.return_days ?? 7} days of delivery, unworn with
                  tags on.
                </p>
                <Link
                  to="/shipping-returns"
                  className="inline-flex min-h-11 items-center font-semibold text-primary underline"
                >
                  Read the full policy
                </Link>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      <CompleteTheLook product={product} />
    </div>
  );
}
