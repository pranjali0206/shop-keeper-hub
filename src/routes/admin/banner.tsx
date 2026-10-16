import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, MapPin, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { toast } from "sonner";

import {
  AdminPageHeader,
  ConfirmAction,
  Field,
  ImageUploadButton,
  LoadingRows,
  SubmitButton,
  Toggle,
  fieldAria,
} from "@/components/admin/AdminUI";
import { EmptyState, ErrorState } from "@/components/common/States";
import { FestivePlaceholder } from "@/components/store/home/FestiveHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { adminProductsQuery } from "@/lib/admin";
import { errorMessage } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/banner")({
  component: BannerAdmin,
});

type Pin = { key: string; product_id: string; x: number; y: number };
type BannerRow = {
  id: string;
  title: string;
  image_url: string | null;
  cta_label: string;
  cta_link: string;
  is_active: boolean;
  banner_hotspots: {
    id: string;
    product_id: string;
    number: number;
    x_percent: number;
    y_percent: number;
  }[];
};

const bannersQuery = {
  queryKey: ["admin", "banners"],
  queryFn: async (): Promise<BannerRow[]> => {
    const { data, error } = await supabase
      .from("banners")
      .select("*, banner_hotspots(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as unknown as BannerRow[];
  },
};

const clamp = (n: number) => Math.round(Math.min(98, Math.max(2, n)) * 100) / 100;
let pinSeq = 0;
const pinKey = () => `pin-${Date.now()}-${pinSeq++}`;

function BannerEditor({ banner, onSaved }: { banner: BannerRow; onSaved: () => void }) {
  const products = useQuery(adminProductsQuery);
  const [v, setV] = useState({
    title: banner.title,
    cta_label: banner.cta_label,
    cta_link: banner.cta_link,
    is_active: banner.is_active,
    image_url: banner.image_url,
  });
  const [pins, setPins] = useState<Pin[]>(
    [...banner.banner_hotspots]
      .sort((a, b) => a.number - b.number)
      .map((h) => ({
        key: h.id,
        product_id: h.product_id,
        x: Number(h.x_percent),
        y: Number(h.y_percent),
      })),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<string | null>(null);

  const pct = (e: { clientX: number; clientY: number }) => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return { x: 50, y: 50 };
    return {
      x: clamp(((e.clientX - r.left) / r.width) * 100),
      y: clamp(((e.clientY - r.top) / r.height) * 100),
    };
  };

  const addPin = (x: number, y: number) => {
    if (pins.length >= 20) {
      toast.error("Up to 20 pins per banner");
      return;
    }
    const key = pinKey();
    setPins((prev) => [...prev, { key, product_id: "", x, y }]);
    setSelected(key);
    requestAnimationFrame(() => document.getElementById(`pin-product-${key}`)?.focus());
  };

  const movePin = (key: string, x: number, y: number) =>
    setPins((prev) => prev.map((p) => (p.key === key ? { ...p, x: clamp(x), y: clamp(y) } : p)));
  const removePin = (key: string) => setPins((prev) => prev.filter((p) => p.key !== key));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!v.title.trim()) errs["title"] = "Add a title";
    if (!v.cta_label.trim()) errs["cta_label"] = "Add a button label";
    if (!/^\/[a-z0-9\-/?=&,]*$/i.test(v.cta_link.trim()))
      errs["cta_link"] = "Use a store path like /shop/ethnic";
    pins.forEach((p, i) => {
      if (!p.product_id) errs[`pin-${p.key}`] = `Pin ${i + 1} needs a product`;
    });
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error("Fix the highlighted fields");
      return;
    }
    setBusy(true);
    try {
      if (v.is_active) {
        // Only one festive banner shows at a time.
        const off = await supabase
          .from("banners")
          .update({ is_active: false })
          .neq("id", banner.id)
          .eq("is_active", true);
        if (off.error) throw off.error;
      }
      const up = await supabase
        .from("banners")
        .update({
          title: v.title.trim(),
          cta_label: v.cta_label.trim(),
          cta_link: v.cta_link.trim(),
          is_active: v.is_active,
          image_url: v.image_url,
        })
        .eq("id", banner.id);
      if (up.error) throw up.error;
      const del = await supabase.from("banner_hotspots").delete().eq("banner_id", banner.id);
      if (del.error) throw del.error;
      if (pins.length) {
        const ins = await supabase.from("banner_hotspots").insert(
          pins.map((p, i) => ({
            banner_id: banner.id,
            product_id: p.product_id,
            number: i + 1,
            x_percent: p.x,
            y_percent: p.y,
          })),
        );
        if (ins.error) throw ins.error;
      }
      toast.success(v.is_active ? "Banner saved and live" : "Banner saved (not live)");
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const onPinPointerDown = (e: ReactPointerEvent<HTMLButtonElement>, key: string) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = key;
    setSelected(key);
  };
  const onPinPointerMove = (e: ReactPointerEvent<HTMLButtonElement>, key: string) => {
    if (dragging.current !== key) return;
    const { x, y } = pct(e);
    movePin(key, x, y);
  };

  const productName = (id: string) =>
    products.data?.find((p) => p.id === id)?.name ?? "Choose a product";

  return (
    <form onSubmit={save} noValidate className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section aria-labelledby="canvas-h" className="space-y-3 rounded-2xl bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="canvas-h" className="text-xl">
              Image and pins
            </h2>
            <div className="flex flex-wrap gap-2">
              <ImageUploadButton
                folder="banners"
                label={v.image_url ? "Replace image" : "Upload image"}
                onUploaded={([f]) => f && setV((p) => ({ ...p, image_url: f.url }))}
              />
              <Button type="button" variant="outline" onClick={() => addPin(50, 50)}>
                <Plus className="size-4" aria-hidden="true" /> Add pin
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Click the image to drop a pin. Drag pins to move them, or focus a pin and use the arrow
            keys (Shift for bigger steps). Wide images (16:9) work best.
          </p>
          {/* Placement surface for pointer users; "Add pin" and arrow keys cover keyboard users. */}
          <div
            ref={canvasRef}
            onClick={(e) => {
              const { x, y } = pct(e);
              addPin(x, y);
            }}
            className="relative aspect-[16/9] cursor-crosshair touch-none overflow-hidden rounded-xl"
          >
            {v.image_url ? (
              <img
                src={v.image_url}
                alt=""
                className="pointer-events-none h-full w-full select-none object-cover"
                draggable={false}
              />
            ) : (
              <FestivePlaceholder label="Banner placeholder" />
            )}
            {pins.map((p, i) => (
              <button
                key={p.key}
                type="button"
                aria-label={`Pin ${i + 1}: ${productName(p.product_id)}. Use arrow keys to move.`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(p.key);
                }}
                onPointerDown={(e) => onPinPointerDown(e, p.key)}
                onPointerMove={(e) => onPinPointerMove(e, p.key)}
                onPointerUp={() => (dragging.current = null)}
                onKeyDown={(e) => {
                  const step = e.shiftKey ? 5 : 1;
                  const moves: Record<string, [number, number]> = {
                    ArrowLeft: [-step, 0],
                    ArrowRight: [step, 0],
                    ArrowUp: [0, -step],
                    ArrowDown: [0, step],
                  };
                  const m = moves[e.key];
                  if (m) {
                    e.preventDefault();
                    movePin(p.key, p.x + m[0], p.y + m[1]);
                  } else if (e.key === "Delete" || e.key === "Backspace") {
                    e.preventDefault();
                    removePin(p.key);
                  }
                }}
                className="absolute grid size-11 -translate-x-1/2 -translate-y-1/2 cursor-grab place-items-center rounded-full active:cursor-grabbing"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              >
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-full border-2 bg-paper text-sm font-bold text-ink shadow-lg",
                    selected === p.key ? "border-blue ring-4 ring-blue/40" : "border-ink",
                  )}
                >
                  {i + 1}
                </span>
              </button>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section
            aria-labelledby="details-h"
            className="space-y-4 rounded-2xl bg-card p-5 shadow-sm"
          >
            <h2 id="details-h" className="text-xl">
              Details
            </h2>
            <Field id="bn-title" label="Title" error={errors["title"]}>
              <Input
                id="bn-title"
                value={v.title}
                onChange={(e) => setV({ ...v, title: e.target.value })}
                {...fieldAria("bn-title", errors["title"])}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field id="bn-label" label="Button label" error={errors["cta_label"]}>
                <Input
                  id="bn-label"
                  value={v.cta_label}
                  onChange={(e) => setV({ ...v, cta_label: e.target.value })}
                  {...fieldAria("bn-label", errors["cta_label"])}
                />
              </Field>
              <Field id="bn-link" label="Button link" error={errors["cta_link"]}>
                <Input
                  id="bn-link"
                  value={v.cta_link}
                  onChange={(e) => setV({ ...v, cta_link: e.target.value })}
                  {...fieldAria("bn-link", errors["cta_link"])}
                />
              </Field>
            </div>
            <Toggle
              id="bn-active"
              label="Active"
              hint="Show on the home page. Activating this hides any other banner."
              checked={v.is_active}
              onChange={(is_active) => setV({ ...v, is_active })}
            />
          </section>

          <section aria-labelledby="pins-h" className="space-y-3 rounded-2xl bg-card p-5 shadow-sm">
            <h2 id="pins-h" className="text-xl">
              Pins ({pins.length})
            </h2>
            {pins.length === 0 ? (
              <EmptyState
                title="No pins yet"
                icon={<MapPin className="size-8 text-muted-foreground" aria-hidden="true" />}
              >
                Click the image to add one.
              </EmptyState>
            ) : (
              <ol className="space-y-2">
                {pins.map((p, i) => (
                  <li
                    key={p.key}
                    className={cn("rounded-lg border p-2", selected === p.key && "border-primary")}
                  >
                    <div className="flex items-center gap-2">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-paper text-sm font-bold text-ink">
                        {i + 1}
                      </span>
                      <label htmlFor={`pin-product-${p.key}`} className="sr-only">
                        Product for pin {i + 1}
                      </label>
                      <select
                        id={`pin-product-${p.key}`}
                        value={p.product_id}
                        onFocus={() => setSelected(p.key)}
                        onChange={(e) =>
                          setPins((prev) =>
                            prev.map((x) =>
                              x.key === p.key ? { ...x, product_id: e.target.value } : x,
                            ),
                          )
                        }
                        aria-invalid={!!errors[`pin-${p.key}`]}
                        className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="">Choose a product</option>
                        {(products.data ?? []).map((prod) => (
                          <option key={prod.id} value={prod.id}>
                            {prod.name}
                            {prod.is_published ? "" : " (draft)"}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove pin ${i + 1}`}
                        onClick={() => removePin(p.key)}
                      >
                        <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                      </Button>
                    </div>
                    {errors[`pin-${p.key}`] ? (
                      <p className="mt-1 text-sm font-semibold text-destructive">
                        {errors[`pin-${p.key}`]}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Position {Math.round(p.x)}% across, {Math.round(p.y)}% down
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>

      <section aria-labelledby="preview-h" className="rounded-2xl bg-card p-5 shadow-sm">
        <h2 id="preview-h" className="mb-1 text-xl">
          Live preview
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          How the section looks to customers{v.is_active ? "" : " once activated"}.
        </p>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <p className="font-display text-3xl">{v.title || "Banner title"}</p>
          <span className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 font-bold text-primary-foreground">
            {v.cta_label || "Button"} <ArrowRight className="size-4" aria-hidden="true" />
          </span>
        </div>
        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl" aria-hidden="true">
          {v.image_url ? (
            <img src={v.image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <FestivePlaceholder label="" />
          )}
          {pins.map((p, i) => (
            <span
              key={p.key}
              className="absolute grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-ink bg-paper text-sm font-bold text-ink shadow-lg"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              {i + 1}
            </span>
          ))}
        </div>
      </section>

      <div className="sticky bottom-4 flex justify-end">
        <SubmitButton busy={busy} size="lg" className="shadow-xl">
          Save banner
        </SubmitButton>
      </div>
    </form>
  );
}

function BannerAdmin() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, error, refetch } = useQuery({ ...bannersQuery, staleTime: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!selectedId && data?.length)
      setSelectedId(data.find((b) => b.is_active)?.id ?? data[0]?.id ?? null);
  }, [data, selectedId]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "banners"] });
    void queryClient.invalidateQueries({ queryKey: ["banner"] });
  };
  const current = data?.find((b) => b.id === selectedId) ?? null;

  async function create() {
    setCreating(true);
    const { data: row, error } = await supabase
      .from("banners")
      .insert({
        title: "New festive banner",
        cta_label: "Shop ethnic edit",
        cta_link: "/shop/ethnic",
        is_active: false,
      })
      .select("id")
      .single();
    setCreating(false);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    toast.success("Banner created");
    setSelectedId(row.id);
    refresh();
  }

  return (
    <div>
      <AdminPageHeader
        title="Festive banner"
        description="The pinned banner on the home page."
        actions={
          <>
            {data && data.length > 1 ? (
              <div>
                <label htmlFor="bn-pick" className="sr-only">
                  Choose banner
                </label>
                <select
                  id="bn-pick"
                  value={selectedId ?? ""}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {data.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                      {b.is_active ? " (live)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <Button variant="outline" onClick={() => void create()} disabled={creating}>
              <Plus className="size-4" aria-hidden="true" /> New banner
            </Button>
            {current ? (
              <ConfirmAction
                title={`Delete "${current.title}"?`}
                description="The banner and its pins are removed. Uploaded images stay in storage."
                onConfirm={async () => {
                  const { error } = await supabase.from("banners").delete().eq("id", current.id);
                  if (error) throw error;
                  toast.success("Banner deleted");
                  setSelectedId(null);
                  refresh();
                }}
                trigger={
                  <Button variant="ghost" className="text-destructive">
                    <Trash2 className="size-4" aria-hidden="true" /> Delete
                  </Button>
                }
              />
            ) : null}
          </>
        }
      />
      {isPending ? (
        <LoadingRows rows={4} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !current ? (
        <EmptyState
          title="No banner yet"
          action={
            <Button onClick={() => void create()} disabled={creating}>
              Create banner
            </Button>
          }
        />
      ) : (
        <BannerEditor key={current.id} banner={current} onSaved={refresh} />
      )}
    </div>
  );
}
