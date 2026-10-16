import type { GarmentKind, ShopTarget } from "@/lib/catalog";

// Home page content. To add photos, put files in /public/home/ and set the
// `image` paths below (e.g. "/home/hero-1.jpg"). Empty slots render as blank
// placeholders, so nothing else needs to change.

/** Headline over a hero photo. */
export type HeroCaption = {
  /** One string per line, shown in bold capitals. Line breaks are chosen to fit the photo. */
  lines: string[];
  /** Tablet and desktop text colour, picked from the photo's palette. */
  color: string;
  /** "light" text gets a soft dark side fade and shadow on desktop; "dark" text sits on a bright wall. */
  tone: "light" | "dark";
  /** Where the text sits on tablet and desktop: the calm, empty part of the photo. */
  position: "left-center" | "left-top" | "right-center" | "right-top";
  /** Smaller type for photos with less empty space (1 = standard size). */
  scale?: number;
  /** Phone text colour. On phones the text sits at the bottom of the photo over a fade. */
  mobileColor: string;
  /** "light" text gets a dark fade on phones, "dark" text a white one. */
  mobileTone: "light" | "dark";
};

export type HeroSlide = {
  /** Wide image for tablet and desktop (about 2.1:1, e.g. 2400x1140). */
  image: string | null;
  /** Portrait image for phones (about 3:5, e.g. 1080x1800). Falls back to `image`. */
  mobileImage?: string | null;
  alt: string;
  link: ShopTarget;
  caption?: HeroCaption;
};

export const HERO_SLIDES: HeroSlide[] = [
  {
    image: "/home/hero-3.webp",
    mobileImage: "/home/hero-3-mobile.webp",
    alt: "Model in a black collared sweater and sunglasses on a crosswalk",
    link: { slug: "new-arrivals" },
    caption: {
      lines: ["Gen Z said it,", "we made it."],
      color: "#F5E9D7", // warm cream, from the sweater's collar stripes and the shop light
      tone: "light",
      position: "left-center",
      mobileColor: "#F5E9D7",
      mobileTone: "light",
    },
  },
  {
    image: "/home/hero-4.webp",
    mobileImage: "/home/hero-4-mobile.webp",
    alt: "Model in a white sleeveless tee and light wash baggy jeans",
    link: { slug: "jeans", search: { fit: "baggy" } },
    caption: {
      lines: ["Your daily fit", "just got", "a glow up."],
      color: "#1F3B5F", // deep denim
      tone: "dark",
      position: "left-top",
      mobileColor: "#1F3B5F",
      mobileTone: "dark",
    },
  },
  {
    image: "/home/hero-5.webp",
    mobileImage: "/home/hero-5-mobile.webp",
    alt: "Model in a white polo, blue jeans and dark sunglasses",
    link: { slug: "t-shirts" },
    caption: {
      lines: ["Soft on you,", "sharp on", "style."],
      color: "#E6EEFA", // ice white, from the studio's blue light
      tone: "light",
      position: "left-top",
      mobileColor: "#E6EEFA",
      mobileTone: "light",
    },
  },
  {
    image: "/home/hero-6.webp",
    mobileImage: "/home/hero-6-mobile.webp",
    alt: "Model in a cream striped shirt and blue trousers",
    link: { slug: "shirts" },
    caption: {
      lines: ["Casual,", "but never", "careless."],
      color: "#1E4E54", // deep teal, from the wall
      tone: "dark",
      position: "right-top",
      mobileColor: "#DCEFEC",
      mobileTone: "light",
    },
  },
  {
    image: "/home/hero-1.webp",
    mobileImage: "/home/hero-1-mobile.webp",
    alt: "Model in a black embroidered shirt and black trousers in a dark lounge",
    link: { slug: "party-wear" },
    caption: {
      lines: ["Bold looks,", "easy", "confidence."],
      color: "#EEC47E", // champagne gold, from the lounge lights
      tone: "light",
      position: "right-center",
      // The model's arm leaves a narrow strip of wall, so this line runs a little smaller.
      scale: 0.78,
      mobileColor: "#EEC47E",
      mobileTone: "light",
    },
  },
  {
    image: "/home/hero-2.webp",
    mobileImage: "/home/hero-2-mobile.webp",
    alt: "Model in a navy brocade jacket over a kurta with white trousers",
    link: { slug: "ethnic" },
    caption: {
      lines: ["Heritage,", "well worn."],
      color: "#2C2862", // deep indigo, from the brocade jacket
      tone: "dark",
      position: "left-center",
      mobileColor: "#2C2862",
      mobileTone: "dark",
    },
  },
];

/** Seconds each hero slide stays up before the carousel moves on. */
export const HERO_AUTOPLAY_SECONDS = 5;

export type CategoryTile = {
  slug: string;
  label: string;
  /** Portrait photo, 3:4 (e.g. 600x800). Without one, a garment drawing shows. */
  image: string | null;
  garment: GarmentKind;
  color: string;
};

/** "Shop by category" strip, in display order. A category's admin-uploaded image wins over `image`. */
export const CATEGORY_STRIP: CategoryTile[] = [
  {
    slug: "jeans",
    label: "Jeans",
    image: "/home/cat-jeans.webp",
    garment: "jeans",
    color: "black",
  },
  {
    slug: "trousers-cargos",
    label: "Trousers & Cargos",
    image: "/home/cat-trousers-cargos.webp",
    garment: "trousers",
    color: "grey",
  },
  {
    slug: "t-shirts",
    label: "T-Shirts",
    image: "/home/cat-t-shirts.webp",
    garment: "tee",
    color: "white",
  },
  {
    slug: "hoodies-jackets",
    label: "Jackets",
    image: "/home/cat-jackets.webp",
    garment: "jacket",
    color: "black",
  },
  {
    slug: "shirts",
    label: "Shirts",
    image: "/home/cat-shirts.webp",
    garment: "shirt",
    color: "white",
  },
  {
    slug: "ethnic",
    label: "Ethnic",
    image: "/home/cat-ethnic.webp",
    garment: "kurta",
    color: "white",
  },
  {
    slug: "party-wear",
    label: "Party Wear",
    image: "/home/cat-party-wear.webp",
    garment: "shirt",
    color: "black",
  },
  {
    slug: "hoodies-jackets",
    label: "Hoodies",
    image: "/home/cat-hoodies.webp",
    garment: "hoodie",
    color: "grey",
  },
];

export const BESTSELLER_BANNER = {
  /** Full designed banner, text included, for tablet and desktop (about 3:1, e.g. 2172x724). */
  bannerImage: "/home/bestsellers-banner.webp" as string | null,
  /** Phones: the models only. The headline and offer below are shown as real text around it. */
  mobileImage: "/home/bestsellers-mobile.webp" as string | null,
  alt: "Three models in linen shirts in cream, navy and olive",
  /** Shown as text on phones (and in the link's label). Keep them matching the banner image. */
  headline: ["Last few", "bestsellers", "left"],
  /** Keep this true to your real offer (it is also printed in the banner image). */
  offer: "Up to 30% off",
  link: { slug: "all", search: { sort: "popular" } } as ShopTarget,
};

export type EditTile = { title: string; tagline: string; image: string | null; link: ShopTarget };

/** Line shown above the shirt types. */
export const SHIRT_QUOTE = {
  eyebrow: "The shirt edit",
  quote: "The right shirt speaks before you do.",
  attribution: "S.O.L",
};

/**
 * Shirt types row (4:5 portrait photos, e.g. 640x800). Linen uses the fabric filter;
 * the others use product tags, so tag matching shirts in the admin
 * (checked, formal, jacquard, striped, printed).
 */
export const SHIRT_EDITS: EditTile[] = [
  {
    title: "Checked",
    tagline: "Easy plaid for every weekend.",
    image: "/home/shirt-checked.webp",
    link: { slug: "shirts", search: { tag: "checked" } },
  },
  {
    title: "Linen",
    tagline: "Breathable. Effortless. Summer-ready.",
    image: "/home/shirt-linen.webp",
    link: { slug: "shirts", search: { fabric: "linen" } },
  },
  {
    title: "Formal",
    tagline: "For days that mean business.",
    image: "/home/shirt-formal.webp",
    link: { slug: "shirts", search: { tag: "formal" } },
  },
  {
    title: "Jacquard",
    tagline: "Woven patterns. Rich texture.",
    image: "/home/shirt-jacquard.webp",
    link: { slug: "shirts", search: { tag: "jacquard" } },
  },
  {
    title: "Striped",
    tagline: "Clean lines. Sharp finish.",
    image: "/home/shirt-striped.webp",
    link: { slug: "shirts", search: { tag: "striped" } },
  },
  {
    title: "Printed",
    tagline: "Bold prints for off-duty days.",
    image: "/home/shirt-printed.webp",
    link: { slug: "shirts", search: { tag: "printed" } },
  },
];

/** Line shown above the jeans fits. */
export const JEANS_QUOTE = {
  eyebrow: "The denim edit",
  quote: "Good denim only gets better with time.",
  attribution: "S.O.L",
};

/**
 * Jeans row after the ethnic banner (4:5 portrait photos, e.g. 640x800).
 * Fits use the fit filter, washes use the colour filter. A tile without an image shows plain black.
 */
export const JEANS_EDITS: EditTile[] = [
  {
    title: "Baggy",
    tagline: "Wide legs. Easy attitude.",
    image: "/home/jeans-baggy.webp",
    link: { slug: "jeans", search: { fit: "baggy" } },
  },
  {
    title: "Straight",
    tagline: "The everyday classic.",
    image: "/home/jeans-straight.webp",
    link: { slug: "jeans", search: { fit: "straight" } },
  },
  {
    title: "Slim",
    tagline: "Sharp, close and clean.",
    image: "/home/jeans-slim.webp",
    link: { slug: "jeans", search: { fit: "slim" } },
  },
  {
    title: "Ripped",
    tagline: "Lived-in from day one.",
    image: "/home/jeans-ripped.webp",
    link: { slug: "jeans", search: { fit: "ripped" } },
  },
  {
    title: "Black wash",
    tagline: "Goes with everything.",
    image: "/home/jeans-black-wash.webp",
    link: { slug: "jeans", search: { color: "black" } },
  },
  {
    title: "Light wash",
    tagline: "Sun-faded and summer-ready.",
    image: "/home/jeans-light-wash.webp",
    link: { slug: "jeans", search: { color: "light-blue" } },
  },
];

export const TRENDING_TABS: { label: string; link: ShopTarget }[] = [
  { label: "All", link: { slug: "all", search: { sort: "popular" } } },
  { label: "Shirts", link: { slug: "shirts" } },
  { label: "T-Shirts", link: { slug: "t-shirts" } },
  { label: "Jeans", link: { slug: "jeans" } },
  { label: "Trousers", link: { slug: "trousers-cargos" } },
  { label: "Jackets", link: { slug: "hoodies-jackets" } },
  { label: "Ethnic", link: { slug: "ethnic" } },
  { label: "Footwear", link: { slug: "footwear" } },
];

/** Welcome band under the hero. The last line is shown a little bolder. */
export const WELCOME = {
  heading: "Welcome to S.O.L",
  lines: [
    "Soul of Lifestyle is menswear made with intention.",
    "Sharp shirts, easy denim, refined ethnic wear and the essentials you reach for every day.",
  ],
  closing: "Wear it like you mean it.",
};

/** Ethnic banner after the shirt edit. Text sits on the empty wall on desktop, below the photo on smaller screens. */
export const ETHNIC_BANNER = {
  /** Full photo, about 2.5:1 (e.g. 1978x795). */
  image: "/home/ethnic-banner.webp" as string | null,
  /** The models only, for phones and tablets. */
  mobileImage: "/home/ethnic-mobile.webp" as string | null,
  eyebrow: "The ethnic edit",
  heading: "Festive, refined.",
  text: "Kurtas, sets and Nehru jackets made for every celebration.",
  cta: "Shop ethnic",
  link: { slug: "ethnic" } as ShopTarget,
};
