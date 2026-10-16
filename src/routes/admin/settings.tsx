import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  AdminPageHeader,
  Field,
  LoadingRows,
  SubmitButton,
  Toggle,
  fieldAria,
} from "@/components/admin/AdminUI";
import { ErrorState } from "@/components/common/States";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { requireOwner } from "@/lib/admin";
import { settingsQuery, type StoreSettings } from "@/lib/data";
import { errorMessage } from "@/lib/format";
import { fieldErrors, settingsSchema } from "@/lib/validation";

export const Route = createFileRoute("/admin/settings")({
  beforeLoad: ({ context }) => requireOwner(context),
  component: SettingsPage,
});

type Values = {
  shop_name: string;
  address: string;
  phone: string;
  opening_hours: string;
  whatsapp: string;
  instagram: string;
  pincode: string;
  free_shipping_min: string;
  shipping_fee: string;
  return_days: string;
  cod_enabled: boolean;
};

const toValues = (s: StoreSettings): Values => ({
  shop_name: s.shop_name,
  address: s.address,
  phone: s.phone,
  opening_hours: s.opening_hours,
  whatsapp: s.whatsapp,
  instagram: s.instagram,
  pincode: s.pincode ?? "",
  free_shipping_min: String(s.free_shipping_min),
  shipping_fee: String(s.shipping_fee),
  return_days: String(s.return_days),
  cod_enabled: s.cod_enabled,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, error, refetch } = useQuery({ ...settingsQuery, staleTime: 0 });
  const [v, setV] = useState<Values | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data && !v) setV(toValues(data));
  }, [data, v]);

  if (isPending) return <LoadingRows rows={6} />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!v)
    return (
      <ErrorState
        title="Store settings are missing"
        error={{ message: "Run the database migration to create the settings row." }}
      />
    );

  const set = <K extends keyof Values>(k: K, value: Values[K]) =>
    setV((prev) => (prev ? { ...prev, [k]: value } : prev));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = settingsSchema.safeParse(v);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      toast.error("Fix the highlighted fields");
      return;
    }
    setErrors({});
    setBusy(true);
    const { error } = await supabase
      .from("store_settings")
      .update({ ...parsed.data, pincode: parsed.data.pincode || null })
      .eq("id", true);
    setBusy(false);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    toast.success("Settings saved");
    void queryClient.invalidateQueries({ queryKey: settingsQuery.queryKey });
  }

  const text = (
    k: Exclude<keyof Values, "cod_enabled">,
    label: string,
    opts: { hint?: string; numeric?: boolean } = {},
  ) => (
    <Field
      id={`st-${k}`}
      label={label}
      error={errors[k]}
      {...(opts.hint ? { hint: opts.hint } : {})}
    >
      <Input
        id={`st-${k}`}
        inputMode={opts.numeric ? "decimal" : undefined}
        value={v[k]}
        onChange={(e) => set(k, e.target.value)}
        {...fieldAria(`st-${k}`, errors[k])}
      />
    </Field>
  );

  return (
    <form onSubmit={save} noValidate>
      <AdminPageHeader
        title="Settings"
        description="Owner only. Changes go live on the store immediately."
        actions={<SubmitButton busy={busy}>Save settings</SubmitButton>}
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <section aria-labelledby="shop-h" className="space-y-4 rounded-2xl bg-card p-5 shadow-sm">
          <h2 id="shop-h" className="text-xl">
            Shop
          </h2>
          {text("shop_name", "Shop name")}
          <Field
            id="st-address"
            label="Address"
            error={errors["address"]}
            hint="Shown in the store locator and used for Get directions."
          >
            <Textarea
              id="st-address"
              rows={3}
              value={v.address}
              onChange={(e) => set("address", e.target.value)}
              {...fieldAria("st-address", errors["address"])}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            {text("pincode", "Shop pincode", { hint: "Used for delivery estimates" })}
            {text("phone", "Phone")}
          </div>
          {text("opening_hours", "Opening hours", { hint: "e.g. Mon to Sun, 11 AM to 9:30 PM" })}
        </section>
        <section aria-labelledby="social-h" className="space-y-4 rounded-2xl bg-card p-5 shadow-sm">
          <h2 id="social-h" className="text-xl">
            Social and chat
          </h2>
          {text("whatsapp", "WhatsApp number", {
            hint: "Digits with country code, e.g. 919876543210. Powers the floating chat button.",
          })}
          {text("instagram", "Instagram link")}
        </section>
        <section aria-labelledby="ship-h" className="space-y-4 rounded-2xl bg-card p-5 shadow-sm">
          <h2 id="ship-h" className="text-xl">
            Shipping and returns
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {text("free_shipping_min", "Free shipping from (₹)", { numeric: true })}
            {text("shipping_fee", "Shipping fee (₹)", { numeric: true })}
            {text("return_days", "Return window (days)", { numeric: true })}
          </div>
        </section>
        <section aria-labelledby="pay-h" className="space-y-4 rounded-2xl bg-card p-5 shadow-sm">
          <h2 id="pay-h" className="text-xl">
            Payments
          </h2>
          <Toggle
            id="st-cod"
            label="Cash on delivery"
            hint="When off, COD is hidden at checkout and refused by the server."
            checked={v.cod_enabled}
            onChange={(c) => set("cod_enabled", c)}
          />
          <p className="text-sm text-muted-foreground">
            Online payments are in demo mode. Connect Razorpay to take real payments.
          </p>
        </section>
      </div>
    </form>
  );
}
