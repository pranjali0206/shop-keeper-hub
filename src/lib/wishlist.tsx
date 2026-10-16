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

const STORAGE_KEY = "sol-wishlist-v1";

type WishlistState = {
  ids: string[];
  has: (productId: string) => boolean;
  toggle: (productId: string) => boolean;
  remove: (productId: string) => void;
};

const WishlistContext = createContext<WishlistState | null>(null);

function read(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

// Works without an account (browser storage). Once signed in, the list is
// merged with the saved one and every change is written to wishlist_items.
export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const idsRef = useRef(ids);
  idsRef.current = ids;

  useEffect(() => {
    setIds(read());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      /* ignore */
    }
  }, [ids, hydrated]);

  useEffect(() => {
    if (!hydrated || !user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("product_id")
        .eq("user_id", user.id);
      if (error || cancelled) return;
      const saved = data.map((r) => r.product_id);
      const missing = idsRef.current.filter((id) => !saved.includes(id));
      if (missing.length) {
        await supabase.from("wishlist_items").upsert(
          missing.map((product_id) => ({ user_id: user.id, product_id })),
          { ignoreDuplicates: true },
        );
      }
      if (!cancelled) setIds((prev) => [...new Set([...prev, ...saved])]);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, hydrated]);

  const remove = useCallback(
    (productId: string) => {
      setIds((prev) => prev.filter((id) => id !== productId));
      if (user)
        void supabase
          .from("wishlist_items")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
    },
    [user],
  );

  const toggle = useCallback(
    (productId: string) => {
      const adding = !idsRef.current.includes(productId);
      if (adding) {
        setIds((prev) => [...prev, productId]);
        if (user)
          void supabase
            .from("wishlist_items")
            .upsert({ user_id: user.id, product_id: productId }, { ignoreDuplicates: true });
      } else {
        remove(productId);
      }
      return adding;
    },
    [user, remove],
  );

  const value = useMemo<WishlistState>(
    () => ({ ids, has: (id) => ids.includes(id), toggle, remove }),
    [ids, toggle, remove],
  );
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return ctx;
}
