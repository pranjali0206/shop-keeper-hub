// Fixed catalog vocabulary shared by the storefront, filters and admin forms.

export const VIRTUAL_COLLECTIONS = {
  all: { name: "All products", description: "Every fit in the S.O.L lineup." },
  "new-arrivals": {
    name: "New Arrivals",
    description: "Fresh off the rack. New drops every Friday.",
  },
  sale: { name: "Sale", description: "Same fits, smaller prices. Grab them before they go." },
} as const;
export type VirtualCollection = keyof typeof VIRTUAL_COLLECTIONS;
export const isVirtualCollection = (slug: string): slug is VirtualCollection =>
  slug in VIRTUAL_COLLECTIONS;

/** How many days a product counts as a "new arrival". */
export const NEW_ARRIVAL_DAYS = 60;

export const FITS = [
  { value: "oversized", label: "Oversized" },
  { value: "baggy", label: "Baggy" },
  { value: "slim", label: "Slim" },
  { value: "regular", label: "Regular" },
  { value: "straight", label: "Straight" },
  { value: "ripped", label: "Ripped" },
  { value: "college", label: "College" },
  { value: "office-casual", label: "Office casual" },
] as const;

/** The "Shop by fit" chips on the home page. College and Office casual match product tags too. */
export const FIT_CHIPS = [
  "oversized",
  "baggy",
  "slim",
  "regular",
  "college",
  "office-casual",
] as const;

export const fitLabel = (value: string | null | undefined) =>
  FITS.find((f) => f.value === value)?.label ?? titleCase(value ?? "");

export const BADGES = [
  { value: "new", label: "New" },
  { value: "bestseller", label: "Bestseller" },
  { value: "low-stock", label: "Low stock" },
  { value: "sale", label: "Sale" },
] as const;
export type BadgeValue = (typeof BADGES)[number]["value"];
export const badgeLabel = (value: string) =>
  value === "sold-out"
    ? "Sold out"
    : (BADGES.find((b) => b.value === value)?.label ?? titleCase(value));

export const COLORS: Record<string, { label: string; swatch: string }> = {
  black: { label: "Black", swatch: "#111111" },
  white: { label: "White", swatch: "#F7F7F2" },
  grey: { label: "Grey", swatch: "#8A8D93" },
  navy: { label: "Navy", swatch: "#1B2350" },
  blue: { label: "Blue", swatch: "#2F4F9E" },
  "light-blue": { label: "Light blue", swatch: "#9DBBE0" },
  red: { label: "Red", swatch: "#B3322B" },
  maroon: { label: "Maroon", swatch: "#6B1D2A" },
  brown: { label: "Brown", swatch: "#7A5236" },
  yellow: { label: "Yellow", swatch: "#E3B23C" },
  green: { label: "Green", swatch: "#8FA58A" },
  beige: { label: "Beige", swatch: "#D8C7A6" },
  olive: { label: "Olive", swatch: "#5E6B3A" },
  pink: { label: "Pink", swatch: "#E5A6B4" },
};
export const colorLabel = (value: string | null | undefined) =>
  value ? (COLORS[value]?.label ?? titleCase(value)) : "";
export const colorSwatch = (value: string | null | undefined) =>
  value ? (COLORS[value]?.swatch ?? "#9AA0A6") : "#9AA0A6";

export const FABRICS = [
  "cotton",
  "linen",
  "denim",
  "corduroy",
  "silk",
  "satin",
  "polyester",
  "viscose",
  "fleece",
  "wool",
  "leather",
] as const;

export const APPAREL_SIZES = ["S", "M", "L", "XL", "XXL"] as const;
export const WAIST_SIZES = ["28", "30", "32", "34", "36", "38"] as const;
export const FOOTWEAR_SIZES = ["UK6", "UK7", "UK8", "UK9", "UK10", "UK11"] as const;
export const ONE_SIZE = ["One size"] as const;
const SIZE_ORDER: string[] = [...APPAREL_SIZES, ...WAIST_SIZES, ...FOOTWEAR_SIZES, ...ONE_SIZE];

export const sortSizes = <T extends { size: string }>(rows: T[]) =>
  [...rows].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a.size);
    const ib = SIZE_ORDER.indexOf(b.size);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

/** Size set an admin fills stock for, based on the product's category. */
export function sizeSetFor(categorySlug: string | null | undefined): readonly string[] {
  switch (categorySlug) {
    case "jeans":
    case "trousers-cargos":
      return WAIST_SIZES;
    case "footwear":
      return FOOTWEAR_SIZES;
    case "accessories":
      return ONE_SIZE;
    default:
      return APPAREL_SIZES;
  }
}

export const isWaistSize = (size: string) => (WAIST_SIZES as readonly string[]).includes(size);

export const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "popular", label: "Popularity" },
] as const;
export type SortValue = (typeof SORTS)[number]["value"];

export const PRICE_RANGES = [
  { value: "0-999", label: "Under ₹1,000", min: 0, max: 999 },
  { value: "1000-1999", label: "₹1,000 to ₹1,999", min: 1000, max: 1999 },
  { value: "2000-2999", label: "₹2,000 to ₹2,999", min: 2000, max: 2999 },
  { value: "3000-", label: "₹3,000 and up", min: 3000, max: null },
] as const;

export const SIZE_GUIDE_TOPS = [
  { size: "S", chest: 38, length: 27, shoulder: 17 },
  { size: "M", chest: 40, length: 28, shoulder: 17.5 },
  { size: "L", chest: 42, length: 29, shoulder: 18 },
  { size: "XL", chest: 44, length: 30, shoulder: 18.5 },
  { size: "XXL", chest: 46, length: 31, shoulder: 19 },
];

export const SIZE_GUIDE_BOTTOMS = [
  { size: "28", waist: 28, hip: 36, length: 40 },
  { size: "30", waist: 30, hip: 38, length: 40.5 },
  { size: "32", waist: 32, hip: 40, length: 41 },
  { size: "34", waist: 34, hip: 42, length: 41.5 },
  { size: "36", waist: 36, hip: 44, length: 42 },
  { size: "38", waist: 38, hip: 46, length: 42 },
];

/** Mega menus keyed by category slug. Links use catalog filters so they stay shareable. */
/** Catalog URL search params. Lists are comma-separated so links stay short and shareable. */
export type ShopSearch = {
  size?: string;
  color?: string;
  fit?: string;
  fabric?: string;
  price?: string;
  tag?: string;
  sort?: SortValue;
};
export type ShopTarget = { slug: string; search?: ShopSearch };
export type MegaColumn = { title: string; links: ({ label: string } & ShopTarget)[] };
export type MegaMenu = {
  columns: MegaColumn[];
  promo: { title: string; text: string } & ShopTarget;
};

export const MEGA_MENUS: Record<string, MegaMenu> = {
  jeans: {
    columns: [
      {
        title: "Shop by fit",
        links: [
          { label: "Baggy", slug: "jeans", search: { fit: "baggy" } },
          { label: "Slim", slug: "jeans", search: { fit: "slim" } },
          { label: "Straight", slug: "jeans", search: { fit: "straight" } },
          { label: "Ripped", slug: "jeans", search: { fit: "ripped" } },
        ],
      },
      {
        title: "Shop by wash",
        links: [
          { label: "Black", slug: "jeans", search: { color: "black" } },
          { label: "Light blue", slug: "jeans", search: { color: "light-blue" } },
          { label: "Grey", slug: "jeans", search: { color: "grey" } },
          { label: "All jeans", slug: "jeans" },
        ],
      },
    ],
    promo: {
      title: "Baggy is back",
      text: "Wide legs, clean breaks.",
      slug: "jeans",
      search: { fit: "baggy" },
    },
  },
  ethnic: {
    columns: [
      {
        title: "Kurtas",
        links: [
          { label: "Short kurtas", slug: "short-kurtas" },
          { label: "Nehru jackets", slug: "nehru-jackets" },
          { label: "Kurta sets", slug: "kurta-sets" },
        ],
      },
      {
        title: "Occasion",
        links: [
          { label: "Wedding", slug: "ethnic", search: { tag: "wedding" } },
          { label: "Festive", slug: "ethnic", search: { tag: "festive" } },
          { label: "Sangeet", slug: "ethnic", search: { tag: "sangeet" } },
        ],
      },
    ],
    promo: { title: "The festive edit", text: "Kurtas that steal the photo.", slug: "ethnic" },
  },
};

/** Garment silhouette used for image placeholders until real photos are uploaded. */
export type GarmentKind =
  "shirt" | "tee" | "jeans" | "trousers" | "kurta" | "jacket" | "hoodie" | "shoe" | "cap";

export function garmentFor(categorySlug: string | null | undefined, productSlug = ""): GarmentKind {
  if (/hoodie/.test(productSlug)) return "hoodie";
  if (/jacket|bomber/.test(productSlug)) return "jacket";
  if (/trouser|pant|cargo/.test(productSlug)) return "trousers";
  switch (categorySlug) {
    case "t-shirts":
      return "tee";
    case "jeans":
      return "jeans";
    case "trousers-cargos":
      return "trousers";
    case "ethnic":
    case "short-kurtas":
    case "kurta-sets":
      return "kurta";
    case "nehru-jackets":
      return "jacket";
    case "hoodies-jackets":
      return "hoodie";
    case "footwear":
      return "shoe";
    case "accessories":
      return "cap";
    default:
      return "shirt";
  }
}

export function titleCase(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
