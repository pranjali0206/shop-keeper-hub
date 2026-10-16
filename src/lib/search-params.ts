import { SORTS, type ShopSearch, type SortValue } from "@/lib/catalog";
import type { CatalogFilters } from "@/lib/data";

const LIST_KEYS = ["size", "color", "fit", "fabric"] as const;
type ListKey = (typeof LIST_KEYS)[number];

const clean = (v: unknown) => {
  if (typeof v !== "string" && typeof v !== "number") return undefined;
  const s = String(v).trim().slice(0, 200);
  return s || undefined;
};

/** validateSearch for catalog routes: keeps only known, string-valued params. */
export function validateShopSearch(raw: Record<string, unknown>): ShopSearch {
  const out: ShopSearch = {};
  for (const key of [...LIST_KEYS, "price", "tag"] as const) {
    const v = clean(raw[key]);
    if (v) out[key] = v;
  }
  const sort = clean(raw["sort"]);
  if (sort && SORTS.some((s) => s.value === sort)) out.sort = sort as SortValue;
  return out;
}

export const splitList = (v: string | undefined) =>
  v
    ? v
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
    : [];

export function filtersFromSearch(search: ShopSearch): CatalogFilters {
  return {
    size: splitList(search.size),
    color: splitList(search.color),
    fit: splitList(search.fit),
    fabric: splitList(search.fabric),
    price: search.price ?? null,
    tag: search.tag ?? null,
    sort: search.sort ?? "newest",
  };
}

/** Return a copy of `search` with `key` set, or removed when value is empty. */
export function withParam(
  search: ShopSearch,
  key: keyof ShopSearch,
  value: string | string[] | null,
): ShopSearch {
  const next: ShopSearch = { ...search };
  const joined = Array.isArray(value) ? value.join(",") : value;
  if (joined) {
    if (key === "sort") next.sort = joined as SortValue;
    else next[key] = joined;
  } else {
    delete next[key];
  }
  return next;
}

export function toggleInList(search: ShopSearch, key: ListKey, value: string): ShopSearch {
  const current = splitList(search[key]);
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  return withParam(search, key, next);
}

export const activeFilterCount = (search: ShopSearch) =>
  LIST_KEYS.reduce((n, k) => n + splitList(search[k]).length, 0) +
  (search.price ? 1 : 0) +
  (search.tag ? 1 : 0);

// Router search serialisation: plain query strings (?fit=baggy&size=32) so shared
// catalog links stay readable and survive a reload unchanged.
export function parseSearch(searchStr: string): Record<string, unknown> {
  const params = new URLSearchParams(searchStr.startsWith("?") ? searchStr.slice(1) : searchStr);
  const out: Record<string, string> = {};
  params.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

export function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, typeof value === "object" ? JSON.stringify(value) : String(value));
  }
  const str = params.toString();
  return str ? `?${str}` : "";
}
