import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Lock, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { EmptyState, FieldError } from "@/components/common/States";
import { AuthForms } from "@/components/store/AuthForms";
import { CartLines, FreeShippingBar } from "@/components/store/CartDrawer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { productsByIdsQuery, settingsQuery } from "@/lib/data";
import { errorMessage, formatINR } from "@/lib/format";
import {
  IS_DEMO_PAYMENTS,
  PAYMENT_METHODS,
  collectPayment,
  type PaymentMethod,
} from "@/lib/payment";
import { shippingFor } from "@/lib/pricing";
import { INDIAN_STATES, checkoutSchema, fieldErrors } from "@/lib/validation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_store/checkout")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Checkout | SOL" },
      { name: "description", content: "Complete your S.O.L order." },
    ],
  }),
  component: CheckoutPage,
});

const DRAFT_KEY = "sol-checkout-draft";
type FormState = {
  name: string;
  phone: string;
  pincode: string;
  line: string;
  city: string;
  state: string;
  paymentMethod: PaymentMethod | "";
  saveAddress: boolean;
};
const EMPTY: FormState = {
  name: "",
  phone: "",
  pincode: "",
  line: "",
  city: "",
  state: "",
  paymentMethod: "",
  saveAddress: true,
};
const FIELD_ORDER = ["name", "phone", "pincode", "line", "city", "state", "paymentMethod"] as const;

function readDraft(): FormState {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<FormState>) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function newToken() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function useSavedAddresses(userId: string | undefined) {
  return useQuery({
    queryKey: ["addresses", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function CheckoutPage() {
  const cart = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: settings } = useQuery(settingsQuery);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const submittingRef = useRef(false);
  const tokenRef = useRef(newToken());
  const pendingRef = useRef<string | null>(null);
  const addresses = useSavedAddresses(user?.id);

  const codEnabled = settings?.cod_enabled ?? true;
  const methods = PAYMENT_METHODS.filter((m) => m.value !== "cod" || codEnabled);
  const subtotal = cart.subtotal;
  const shipping = shippingFor(
    subtotal,
    Number(settings?.free_shipping_min ?? 999),
    Number(settings?.shipping_fee ?? 79),
  );
  const total = subtotal + shipping;

  useEffect(() => setForm(readDraft()), []);
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {
      /* ignore */
    }
  }, [form]);
  useEffect(() => {
    if (!codEnabled && form.paymentMethod === "cod") setForm((f) => ({ ...f, paymentMethod: "" }));
  }, [codEnabled, form.paymentMethod]);

  // Refresh prices and stock limits so the summary matches what the server will charge.
  const productIds = [...new Set(cart.lines.map((l) => l.productId))];
  const bundleIds = [...new Set(cart.lines.map((l) => l.bundleId).filter((x): x is string => !!x))];
  const fresh = useQuery({
    ...productsByIdsQuery(productIds),
    enabled: cart.hydrated && productIds.length > 0,
  });
  const freshBundles = useQuery({
    queryKey: ["bundles", "prices", bundleIds],
    enabled: bundleIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bundles")
        .select("id,name,price")
        .in("id", bundleIds);
      if (error) throw error;
      return data.map((b) => ({ ...b, price: Number(b.price) }));
    },
  });
  const { refreshFromProducts } = cart;
  useEffect(() => {
    if (fresh.data) refreshFromProducts(fresh.data, freshBundles.data ?? []);
  }, [fresh.data, freshBundles.data, refreshFromProducts]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key])
      setErrors((e) => {
        const { [key]: _drop, ...rest } = e;
        return rest;
      });
  };

  async function placeOrder() {
    if (submittingRef.current) return;
    setServerError(null);
    const parsed = checkoutSchema.safeParse(form);
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error);
      setErrors(errs);
      const first = FIELD_ORDER.find((k) => errs[k]);
      if (first) document.getElementById(`co-${first}`)?.focus();
      return;
    }
    const outOfStock = cart.lines.find((l) => l.maxQty <= 0 || l.qty > l.maxQty);
    if (outOfStock) {
      setServerError(
        `${outOfStock.name} in size ${outOfStock.size} is out of stock. Remove it to continue.`,
      );
      return;
    }
    if (!user) {
      pendingRef.current = cart.lines
        .map((l) => `${l.key}:${l.qty}`)
        .sort()
        .join("|");
      setAuthOpen(true);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const v = parsed.data;
      const items = cart.lines.map((l) => ({
        product_id: l.productId,
        size: l.size,
        qty: l.qty,
        bundle_id: l.bundleId,
        group_key: l.groupKey ?? "",
      }));
      const { data, error } = await supabase.rpc("place_order", {
        p_items: items as unknown as Json,
        p_name: v.name,
        p_phone: v.phone,
        p_line: v.line,
        p_city: v.city,
        p_state: v.state,
        p_pincode: v.pincode,
        p_payment_method: v.paymentMethod,
        p_save_address: v.saveAddress,
        p_client_token: tokenRef.current,
      });
      if (error) throw error;
      const order = data[0];
      if (!order) throw new Error("Order could not be created. Try again.");

      const { data: saved } = await supabase
        .from("orders")
        .select("total")
        .eq("id", order.order_id)
        .maybeSingle();
      const payment = await collectPayment({
        orderId: order.order_id,
        orderNumber: order.order_number,
        amount: Number(saved?.total ?? total),
        method: v.paymentMethod,
      });
      if (payment.status === "failed") throw new Error(payment.message);

      cart.clear();
      tokenRef.current = newToken();
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      void navigate({
        to: "/order-confirmed/$orderNumber",
        params: { orderNumber: order.order_number },
      });
    } catch (err) {
      setServerError(errorMessage(err, "Your order didn't go through. Try again."));
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  // After signing in from "Place order", carry on once the saved cart has merged.
  useEffect(() => {
    if (!pendingRef.current || !user || cart.syncedFor !== user.id) return;
    const before = pendingRef.current;
    pendingRef.current = null;
    setAuthOpen(false);
    const after = cart.lines
      .map((l) => `${l.key}:${l.qty}`)
      .sort()
      .join("|");
    if (before === after) {
      void placeOrder();
    } else {
      toast.info("We added items from your saved cart. Check your order and tap Place order.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, cart.syncedFor]);

  if (!cart.hydrated) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-muted-foreground">
        Loading your cart…
      </div>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="Your cart is empty"
          icon={<ShoppingBag className="size-8 text-muted-foreground" aria-hidden="true" />}
          action={
            <Button asChild>
              <Link to="/shop/$slug" params={{ slug: "new-arrivals" }} search={{}}>
                Shop new drop
              </Link>
            </Button>
          }
        >
          Add a fit or two, then come back here.
        </EmptyState>
      </div>
    );
  }

  const field = (key: (typeof FIELD_ORDER)[number], label: string, input: React.ReactNode) => (
    <div>
      <label htmlFor={`co-${key}`} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      {input}
      <FieldError id={`co-${key}-err`} message={errors[key]} />
    </div>
  );
  const aria = (key: string) => ({
    "aria-invalid": !!errors[key],
    "aria-describedby": `co-${key}-err`,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">Checkout</h1>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void placeOrder();
        }}
        className="mt-8 grid gap-10 lg:grid-cols-[1.3fr_1fr]"
      >
        <div className="space-y-8">
          {user && addresses.data && addresses.data.length > 0 ? (
            <section aria-labelledby="saved-title">
              <h2 id="saved-title" className="mb-3 text-xl">
                Saved addresses
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {addresses.data.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          name: a.name,
                          phone: a.phone,
                          pincode: a.pincode,
                          line: a.line,
                          city: a.city,
                          state: a.state,
                          saveAddress: false,
                        }))
                      }
                      className="w-full rounded-xl border-2 p-3 text-left text-sm hover:border-primary"
                    >
                      <span className="block font-semibold">{a.name}</span>
                      <span className="block text-muted-foreground">
                        {a.line}, {a.city} {a.pincode}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="ship-title" className="space-y-4">
            <h2 id="ship-title" className="text-xl">
              Delivery details
            </h2>
            {field(
              "name",
              "Full name",
              <Input
                id="co-name"
                autoComplete="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                {...aria("name")}
              />,
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {field(
                "phone",
                "Mobile number (10 digits)",
                <Input
                  id="co-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  {...aria("phone")}
                />,
              )}
              {field(
                "pincode",
                "Pincode",
                <Input
                  id="co-pincode"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={6}
                  value={form.pincode}
                  onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                  {...aria("pincode")}
                />,
              )}
            </div>
            {field(
              "line",
              "Address (house no., street, area)",
              <Input
                id="co-line"
                autoComplete="street-address"
                value={form.line}
                onChange={(e) => set("line", e.target.value)}
                {...aria("line")}
              />,
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {field(
                "city",
                "City",
                <Input
                  id="co-city"
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  {...aria("city")}
                />,
              )}
              {field(
                "state",
                "State",
                <select
                  id="co-state"
                  autoComplete="address-level1"
                  value={form.state}
                  onChange={(e) => set("state", e.target.value)}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-base md:text-sm"
                  {...aria("state")}
                >
                  <option value="">Choose a state</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>,
              )}
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={form.saveAddress}
                onChange={(e) => set("saveAddress", e.target.checked)}
                className="size-5 accent-[var(--primary)]"
              />
              <span className="text-sm">Save this address for next time</span>
            </label>
          </section>

          <fieldset aria-describedby="co-paymentMethod-err" className="space-y-3">
            <legend className="mb-3 font-display text-xl">Payment</legend>
            {IS_DEMO_PAYMENTS ? (
              <p className="rounded-lg border bg-muted p-3 text-sm text-foreground">
                Demo store: no money is charged and we never ask for card numbers or UPI IDs. Your
                choice is just recorded with the order.
              </p>
            ) : null}
            {methods.map((m, i) => (
              <label
                key={m.value}
                className={cn(
                  "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 p-3",
                  form.paymentMethod === m.value ? "border-primary" : "hover:border-foreground",
                )}
              >
                <input
                  id={i === 0 ? "co-paymentMethod" : undefined}
                  type="radio"
                  name="paymentMethod"
                  value={m.value}
                  checked={form.paymentMethod === m.value}
                  onChange={() => set("paymentMethod", m.value)}
                  className="size-5 accent-[var(--primary)]"
                />
                <span>
                  <span className="block font-semibold">{m.label}</span>
                  <span className="block text-sm text-muted-foreground">{m.hint}</span>
                </span>
              </label>
            ))}
            <FieldError id="co-paymentMethod-err" message={errors["paymentMethod"]} />
          </fieldset>
        </div>

        <aside
          aria-labelledby="summary-title"
          className="h-fit space-y-4 rounded-2xl bg-card p-5 shadow-sm lg:sticky lg:top-24"
        >
          <h2 id="summary-title" className="text-xl">
            Order summary
          </h2>
          <FreeShippingBar subtotal={subtotal} />
          <CartLines />
          <dl className="space-y-2 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="font-semibold">{formatINR(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Shipping</dt>
              <dd className="font-semibold">{shipping === 0 ? "Free" : formatINR(shipping)}</dd>
            </div>
            <div className="flex justify-between border-t pt-2 text-base">
              <dt className="font-bold">Total</dt>
              <dd className="font-bold">{formatINR(total)}</dd>
            </div>
          </dl>
          {serverError ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive p-3 text-sm font-semibold text-destructive"
            >
              {serverError}
            </p>
          ) : null}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={submitting}
            aria-disabled={submitting}
          >
            <Lock className="size-4" aria-hidden="true" />
            {submitting ? "Placing order…" : `Place order · ${formatINR(total)}`}
          </Button>
          {!user ? (
            <p className="text-center text-xs text-muted-foreground">
              You'll sign in or create an account when you place the order.
            </p>
          ) : null}
        </aside>
      </form>

      <Dialog
        open={authOpen}
        onOpenChange={(o) => {
          setAuthOpen(o);
          if (!o) pendingRef.current = null;
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Sign in to place your order</DialogTitle>
            <DialogDescription>Your cart and details stay right here.</DialogDescription>
          </DialogHeader>
          <AuthForms redirectPath="/checkout" idPrefix="checkout-auth" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
