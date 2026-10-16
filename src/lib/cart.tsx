import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { garmentFor, type GarmentKind } from "@/lib/catalog";
import { CARD_SELECT, type Bundle, type ProductCard } from "@/lib/data";
import { cartSubtotal } from "@/lib/pricing";

export const MAX_LINE_QTY = 10;
const STORAGE_KEY = "sol-cart-v1";

export type CartLine = {
  key: string;
  productId: string;
  slug: string;
  name: string;
  size: string;
  qty: number;
  price: number;
  image: string | null;
  imageAlt: string;
  garment: GarmentKind;
  color: string | null;
  maxQty: number;
  bundleId: string | null;
  bundleName: string | null;
  bundlePrice: number | null;
  groupKey: string | null;
};

type AddResult = { ok: true } | { ok: false; reason: string };

type CartState = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  hydrated: boolean;
  /** User id whose saved cart has been merged in (null when signed out or still merging). */
  syncedFor: string | null;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  setOpen: (open: boolean) => void;
  addItem: (product: ProductCard, size: string, qty?: number) => AddResult;
  addBundle: (bundle: Bundle, sizes: Record<string, string>) => AddResult;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  /** Refresh prices and stock limits from the database (used by checkout). */
  refreshFromProducts: (
    products: ProductCard[],
    bundles: { id: string; price: number; name: string }[],
  ) => void;
};

const CartContext = createContext<CartState | null>(null);

const lineKey = (groupKey: string | null, productId: string, size: string) =>
  `${groupKey ?? ""}|${productId}|${size}`;

function stockFor(product: ProductCard, size: string) {
  return product.product_variants.find((v) => v.size === size)?.stock ?? 0;
}

export function lineFromProduct(
  product: ProductCard,
  size: string,
  qty: number,
  bundle: { id: string; name: string; price: number; groupKey: string } | null = null,
): CartLine {
  const image = product.product_images[0] ?? null;
  return {
    key: lineKey(bundle?.groupKey ?? null, product.id, size),
    productId: product.id,
    slug: product.slug,
    name: product.name,
    size,
    qty,
    price: product.price,
    image: image?.url ?? null,
    imageAlt: image?.alt || product.name,
    garment: garmentFor(product.category?.slug, product.slug),
    color: product.color,
    maxQty: Math.min(MAX_LINE_QTY, stockFor(product, size)),
    bundleId: bundle?.id ?? null,
    bundleName: bundle?.name ?? null,
    bundlePrice: bundle?.price ?? null,
    groupKey: bundle?.groupKey ?? null,
  };
}

function readStorage(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is CartLine =>
        !!l &&
        typeof l === "object" &&
        typeof (l as CartLine).productId === "string" &&
        typeof (l as CartLine).qty === "number",
    );
  } catch {
    return [];
  }
}

function writeStorage(lines: CartLine[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    /* storage unavailable: cart still works for this visit */
  }
}

/** Merge two carts. Matching lines keep the larger quantity. */
export function mergeLines(local: CartLine[], saved: CartLine[]): CartLine[] {
  const byKey = new Map(local.map((l) => [l.key, l]));
  for (const s of saved) {
    const existing = byKey.get(s.key);
    if (existing) {
      byKey.set(s.key, {
        ...existing,
        qty: Math.min(Math.max(existing.qty, s.qty), s.maxQty || existing.maxQty),
      });
    } else {
      byKey.set(s.key, s);
    }
  }
  return [...byKey.values()];
}

async function loadSavedCart(userId: string): Promise<CartLine[]> {
  const { data, error } = await supabase
    .from("cart_items")
    .select(
      `size,qty,bundle_id,group_key,product:products(${CARD_SELECT}),bundle:bundles(id,name,price)`,
    )
    .eq("user_id", userId);
  if (error) throw error;
  type Row = {
    size: string;
    qty: number;
    bundle_id: string | null;
    group_key: string;
    product: ProductCard | null;
    bundle: { id: string; name: string; price: number } | null;
  };
  return (data as unknown as Row[])
    .filter((r): r is Row & { product: ProductCard } => !!r.product)
    .map((r) => {
      const product = {
        ...r.product,
        price: Number(r.product.price),
        product_images: [...r.product.product_images].sort((a, b) => a.sort_order - b.sort_order),
      };
      const bundle =
        r.bundle && r.group_key
          ? {
              id: r.bundle.id,
              name: r.bundle.name,
              price: Number(r.bundle.price),
              groupKey: r.group_key,
            }
          : null;
      const line = lineFromProduct(product, r.size, r.qty, bundle);
      return { ...line, qty: Math.max(1, Math.min(line.qty, line.maxQty || 1)) };
    });
}

async function saveCart(userId: string, lines: CartLine[]) {
  const del = await supabase.from("cart_items").delete().eq("user_id", userId);
  if (del.error) throw del.error;
  if (lines.length === 0) return;
  const ins = await supabase.from("cart_items").insert(
    lines.map((l) => ({
      user_id: userId,
      product_id: l.productId,
      size: l.size,
      qty: Math.max(1, Math.min(MAX_LINE_QTY, l.qty)),
      bundle_id: l.bundleId,
      group_key: l.groupKey ?? "",
    })),
  );
  if (ins.error) throw ins.error;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  const syncedUser = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linesRef = useRef(lines);
  linesRef.current = lines;

  useEffect(() => {
    setLines(readStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) writeStorage(lines);
  }, [lines, hydrated]);

  // On sign-in, merge the browser cart with the saved one, then keep them in sync.
  useEffect(() => {
    if (!hydrated) return;
    const uid = user?.id ?? null;
    if (!uid) {
      syncedUser.current = null;
      setSyncedFor(null);
      return;
    }
    if (syncedUser.current === uid) return;
    let cancelled = false;
    loadSavedCart(uid)
      .then(async (saved) => {
        if (cancelled) return;
        const merged = mergeLines(linesRef.current, saved);
        setLines(merged);
        syncedUser.current = uid;
        setSyncedFor(uid);
        await saveCart(uid, merged);
      })
      .catch(() => {
        // Saved cart unavailable: keep the browser cart and still sync from now on.
        syncedUser.current = uid;
        setSyncedFor(uid);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, hydrated]);

  useEffect(() => {
    const uid = syncedUser.current;
    if (!hydrated || !uid || uid !== user?.id) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveCart(uid, lines).catch(() => undefined);
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [lines, hydrated, user?.id]);

  const addItem = useCallback((product: ProductCard, size: string, qty = 1): AddResult => {
    const stock = stockFor(product, size);
    if (stock <= 0) return { ok: false, reason: `${size} is sold out` };
    const line = lineFromProduct(product, size, qty);
    const existing = linesRef.current.find((l) => l.key === line.key);
    const nextQty = (existing?.qty ?? 0) + qty;
    if (nextQty > line.maxQty) {
      return { ok: false, reason: `Only ${line.maxQty} left in ${size}` };
    }
    setLines((prev) =>
      existing
        ? prev.map((l) =>
            l.key === line.key ? { ...l, qty: nextQty, maxQty: line.maxQty, price: line.price } : l,
          )
        : [...prev, line],
    );
    return { ok: true };
  }, []);

  const addBundle = useCallback((bundle: Bundle, sizes: Record<string, string>): AddResult => {
    const missing = bundle.items.find((p) => !sizes[p.id]);
    if (missing) return { ok: false, reason: `Choose a size for ${missing.name}` };
    const soldOut = bundle.items.find((p) => stockFor(p, sizes[p.id] ?? "") <= 0);
    if (soldOut)
      return { ok: false, reason: `${soldOut.name} is sold out in ${sizes[soldOut.id]}` };
    const groupKey = `${bundle.id}:${bundle.items.map((p) => sizes[p.id]).join("-")}`;
    const meta = { id: bundle.id, name: bundle.name, price: bundle.price, groupKey };
    const newLines = bundle.items.map((p) => lineFromProduct(p, sizes[p.id] ?? "", 1, meta));
    const existing = linesRef.current.filter((l) => l.groupKey === groupKey);
    if (existing.length) {
      const nextQty = (existing[0]?.qty ?? 0) + 1;
      const limit = Math.min(...newLines.map((l) => l.maxQty));
      if (nextQty > limit)
        return { ok: false, reason: `Only ${limit} of this pack left in these sizes` };
      setLines((prev) => prev.map((l) => (l.groupKey === groupKey ? { ...l, qty: nextQty } : l)));
    } else {
      setLines((prev) => [...prev, ...newLines]);
    }
    return { ok: true };
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setLines((prev) => {
      const target = prev.find((l) => l.key === key);
      if (!target) return prev;
      const group = target.groupKey;
      const members = group ? prev.filter((l) => l.groupKey === group) : [target];
      const limit = Math.min(...members.map((l) => l.maxQty || MAX_LINE_QTY));
      const next = Math.max(1, Math.min(qty, limit));
      return prev.map((l) =>
        (group ? l.groupKey === group : l.key === key) ? { ...l, qty: next } : l,
      );
    });
  }, []);

  const remove = useCallback((key: string) => {
    setLines((prev) => {
      const target = prev.find((l) => l.key === key);
      if (!target) return prev;
      return target.groupKey
        ? prev.filter((l) => l.groupKey !== target.groupKey)
        : prev.filter((l) => l.key !== key);
    });
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const refreshFromProducts = useCallback(
    (products: ProductCard[], bundles: { id: string; price: number; name: string }[]) => {
      const byId = new Map(products.map((p) => [p.id, p]));
      const bundleById = new Map(bundles.map((b) => [b.id, b]));
      setLines((prev) => {
        let changed = false;
        const next = prev.map((l) => {
          const p = byId.get(l.productId);
          if (!p) return l;
          const maxQty = Math.min(MAX_LINE_QTY, stockFor(p, l.size));
          const b = l.bundleId ? bundleById.get(l.bundleId) : null;
          const bundlePrice = b ? b.price : l.bundlePrice;
          if (
            p.price !== l.price ||
            maxQty !== l.maxQty ||
            bundlePrice !== l.bundlePrice ||
            p.name !== l.name
          ) {
            changed = true;
            return { ...l, price: p.price, name: p.name, maxQty, bundlePrice };
          }
          return l;
        });
        return changed ? next : prev;
      });
    },
    [],
  );

  const value = useMemo<CartState>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal: cartSubtotal(lines),
      hydrated,
      syncedFor,
      isOpen,
      open: () => setOpen(true),
      close: () => setOpen(false),
      setOpen,
      addItem,
      addBundle,
      setQty,
      remove,
      clear,
      refreshFromProducts,
    }),
    [
      lines,
      hydrated,
      syncedFor,
      isOpen,
      addItem,
      addBundle,
      setQty,
      remove,
      clear,
      refreshFromProducts,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
