import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { GarmentIllustration } from "@/components/common/GarmentIllustration";
import { Logo } from "@/components/common/Logo";
import type { ShopTarget } from "@/lib/catalog";
import { categoriesQuery } from "@/lib/data";
import {
  type EditTile,
  type HeroCaption,
  BESTSELLER_BANNER,
  CATEGORY_STRIP,
  ETHNIC_BANNER,
  HERO_AUTOPLAY_SECONDS,
  HERO_SLIDES,
  JEANS_EDITS,
  JEANS_QUOTE,
  SHIRT_EDITS,
  SHIRT_QUOTE,
  TRENDING_TABS,
  WELCOME,
} from "@/lib/home-content";
import { cn } from "@/lib/utils";

function ShopTargetLink({
  target,
  className,
  children,
  ...rest
}: {
  target: ShopTarget;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  return (
    <Link
      to="/shop/$slug"
      params={{ slug: target.slug }}
      search={target.search ?? {}}
      className={className}
      {...rest}
    >
      {children}
    </Link>
  );
}

const arrowButton =
  "absolute top-1/2 z-10 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-paper/90 text-ink shadow-md transition hover:bg-paper disabled:opacity-0";

// ---------------------------------------------------------------------------
// Hero carousel
// ---------------------------------------------------------------------------
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

// Tablet/desktop placement of each slide's headline, in the calm part of its photo.
// Side margins are 7% of the slide width; on these 2:1 slides 14% of the height is the
// same distance, so top-aligned text sits as far from the top as from the side.
// Middle-left text also keeps clear of the round "previous" arrow (44px button at 12px).
const CAPTION_POSITION: Record<HeroCaption["position"], string> = {
  "left-center": "md:left-[max(7%,4.75rem)] md:top-1/2 md:-translate-y-1/2 md:text-left",
  "left-top": "md:left-[7%] md:top-[14%] md:text-left",
  "right-center": "md:left-auto md:right-[7%] md:top-1/2 md:-translate-y-1/2 md:text-right",
  "right-top": "md:left-auto md:right-[7%] md:top-[14%] md:text-right",
};

// Written out in full so Tailwind finds both classes when scanning the source.
const TEXT_SHADOW = "[text-shadow:0_2px_18px_rgb(0_0_0/0.35)]";
const MD_TEXT_SHADOW = "md:[text-shadow:0_2px_18px_rgb(0_0_0/0.35)]";

function HeroCaptionOverlay({ caption, active }: { caption: HeroCaption; active: boolean }) {
  const onRight = caption.position.startsWith("right");
  return (
    <>
      {/* Phones: the text sits at the bottom over a fade, dark behind light text and white behind dark text. */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[70%] bg-gradient-to-t via-45% to-transparent md:hidden",
          caption.mobileTone === "light"
            ? "from-black/85 via-black/55"
            : "from-white/90 via-white/60",
        )}
      />
      {/* Tablet/desktop: a soft side fade behind light text. */}
      {caption.tone === "light" ? (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-0 z-[1] hidden w-3/5 from-black/45 via-black/15 to-transparent md:block",
            onRight ? "right-0 bg-gradient-to-l" : "left-0 bg-gradient-to-r",
          )}
        />
      ) : null}
      <span
        className={cn(
          "absolute bottom-[7%] left-[6%] right-[6%] z-[2] md:bottom-auto md:right-auto",
          CAPTION_POSITION[caption.position],
        )}
        style={
          {
            "--hero-fg": caption.color,
            "--hero-fg-mobile": caption.mobileColor,
            "--hero-scale": caption.scale ?? 1,
          } as React.CSSProperties
        }
      >
        <span
          className={cn(
            "block font-display text-[10vw] uppercase leading-[0.95] tracking-[-0.01em] text-[color:var(--hero-fg-mobile)] md:text-[length:calc(3.4vw*var(--hero-scale))] md:text-[color:var(--hero-fg)]",
            caption.mobileTone === "light" && TEXT_SHADOW,
            caption.tone === "light" ? MD_TEXT_SHADOW : "md:[text-shadow:none]",
            // The active slide's headline rises in; others stay hidden in the peek.
            "transition duration-700 ease-out motion-reduce:transition-none",
            active ? "translate-y-0 opacity-100 delay-200" : "translate-y-3 opacity-0",
          )}
        >
          {caption.lines.map((line, n) => (
            <span key={n} className="block">
              {line}
              {n < caption.lines.length - 1 ? " " : null}
            </span>
          ))}
        </span>
      </span>
    </>
  );
}

export function HeroCarousel() {
  const count = HERO_SLIDES.length;
  const [viewportRef, embla] = useEmblaCarousel({ loop: count > 1, align: "start", duration: 30 });
  const [index, setIndex] = useState(0);
  const reducedMotion = usePrefersReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // Auto-advance unless the visitor asked for reduced motion; hover or focus pauses it.
  const playing = !reducedMotion && count > 1;

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => setIndex(embla.selectedScrollSnap());
    embla.on("select", onSelect);
    onSelect();
    return () => {
      embla.off("select", onSelect);
    };
  }, [embla]);

  // Auto-advance. Restarts after every slide change, so manual navigation gets a full interval.
  useEffect(() => {
    if (!embla || !playing || hovered || focused) return;
    const id = window.setTimeout(() => {
      if (document.visibilityState === "visible") embla.scrollNext();
    }, HERO_AUTOPLAY_SECONDS * 1000);
    return () => window.clearTimeout(id);
  }, [embla, playing, hovered, focused, index]);

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured"
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <div ref={viewportRef} className="overflow-hidden">
        <div className="flex">
          {HERO_SLIDES.map((slide, i) => (
            <div
              key={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              className="min-w-0 shrink-0 grow-0 basis-full md:basis-[87%]"
            >
              <ShopTargetLink
                target={slide.link}
                {...(slide.caption ? {} : { "aria-label": slide.alt })}
                className="relative block aspect-[4/5] w-full overflow-hidden bg-muted md:aspect-[2/1] md:border-r md:border-paper"
              >
                {slide.caption ? (
                  <HeroCaptionOverlay caption={slide.caption} active={i === index} />
                ) : null}
                {slide.image || slide.mobileImage ? (
                  <picture>
                    {slide.mobileImage ? (
                      <source media="(max-width: 767px)" srcSet={slide.mobileImage} />
                    ) : null}
                    <img
                      src={slide.image ?? slide.mobileImage ?? ""}
                      alt={slide.alt}
                      // Slides sit off-screen sideways, so load them up front to avoid blank frames.
                      loading="eager"
                      decoding="async"
                      fetchPriority={i === 0 ? "high" : "low"}
                      className="h-full w-full object-cover"
                    />
                  </picture>
                ) : null}
              </ShopTargetLink>
            </div>
          ))}
        </div>
      </div>
      {count > 1 ? (
        <>
          <button
            type="button"
            className={cn(arrowButton, "left-3")}
            onClick={() => embla?.scrollPrev()}
            aria-label="Previous slide"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={cn(arrowButton, "right-3")}
            onClick={() => embla?.scrollNext()}
            aria-label="Next slide"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
          {/* Announce manual changes only, not every automatic one. */}
          <p className="sr-only" aria-live={playing ? "off" : "polite"}>
            Slide {index + 1} of {count}
          </p>
        </>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Welcome band
// ---------------------------------------------------------------------------
export function WelcomeBand() {
  return (
    <section
      aria-labelledby="welcome-title"
      className="bg-graphite px-6 py-16 text-center text-white sm:py-24"
    >
      <Logo onDark tagline className="text-5xl text-white sm:text-6xl" />
      <h1
        id="welcome-title"
        className="mt-8 font-sans text-xl font-medium uppercase tracking-[0.08em] sm:text-2xl"
      >
        {WELCOME.heading}
      </h1>
      <div className="mx-auto mt-6 max-w-3xl space-y-2 text-base font-light leading-relaxed text-[#D4D4D4] sm:text-lg">
        {WELCOME.lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
        <p className="pt-1 font-medium text-white">{WELCOME.closing}</p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Shop by category
// ---------------------------------------------------------------------------
export function SectionTitle({ light, bold, id }: { light: string; bold: string; id: string }) {
  return (
    <div className="px-4 sm:px-12">
      <h2 id={id} className="text-4xl uppercase leading-[1.05] sm:text-5xl">
        <span className="block font-sans font-light tracking-tight">{light}</span>
        <span className="block">{bold}</span>
      </h2>
      <span aria-hidden="true" className="mt-3 block h-0.5 w-64 bg-blue-accent sm:w-80" />
    </div>
  );
}

export function CategoryStrip() {
  const { data: categories = [] } = useQuery(categoriesQuery);
  const scroller = useRef<HTMLUListElement>(null);
  const scrollBy = useCallback((dir: 1 | -1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  }, []);

  return (
    <section aria-labelledby="shop-by-category" className="surface-paper py-10 sm:py-12">
      <SectionTitle id="shop-by-category" light="Shop by" bold="Category" />
      <div className="relative mt-6">
        <ul
          ref={scroller}
          className="flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 pb-2 sm:scroll-px-12 [scrollbar-width:none] sm:px-12 [&::-webkit-scrollbar]:hidden"
        >
          {CATEGORY_STRIP.map((tile) => {
            const uploaded = categories.find((c) => c.slug === tile.slug)?.image_url;
            const src = uploaded ?? tile.image;
            return (
              <li
                key={`${tile.slug}-${tile.label}`}
                className="w-[42%] shrink-0 snap-start sm:w-[28%] lg:w-[18.5%]"
              >
                <ShopTargetLink target={{ slug: tile.slug }} className="group block">
                  <span className="block aspect-[3/4] overflow-hidden bg-muted">
                    {src ? (
                      <img
                        src={src}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <span className="block h-full w-full p-4">
                        <GarmentIllustration
                          cutout
                          kind={tile.garment}
                          color={tile.color}
                          label=""
                          className="transition-transform duration-300 group-hover:scale-105"
                        />
                      </span>
                    )}
                  </span>
                  <span className="mt-3 block text-center text-sm font-semibold uppercase tracking-wide group-hover:underline group-hover:underline-offset-4">
                    {tile.label}
                  </span>
                </ShopTargetLink>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          className={cn(arrowButton, "left-2 hidden border md:inline-flex")}
          onClick={() => scrollBy(-1)}
          aria-label="Scroll categories left"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          className={cn(arrowButton, "right-2 hidden border md:inline-flex")}
          onClick={() => scrollBy(1)}
          aria-label="Scroll categories right"
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-4 px-4 sm:px-12">
        <ShopTargetLink
          target={{ slug: "all" }}
          className="inline-flex min-h-11 items-center text-sm font-semibold uppercase underline underline-offset-4"
        >
          Shop all
        </ShopTargetLink>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Bestsellers banner
// ---------------------------------------------------------------------------
export function BestsellerBanner() {
  const b = BESTSELLER_BANNER;
  const headline = (
    <>
      {b.headline.map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      ))}
    </>
  );
  const shopLink = (
    <span className="mt-4 block font-sans text-sm font-semibold normal-case tracking-normal underline underline-offset-4">
      Shop bestsellers
    </span>
  );

  if (b.bannerImage) {
    return (
      <section aria-label="Bestsellers" className="bg-linen text-ink">
        <ShopTargetLink
          target={b.link}
          aria-label={`${b.headline.join(" ")}. ${b.offer}. Shop bestsellers`}
          className="group block"
        >
          {/* Tablet and desktop: the designed banner, text included. */}
          <img
            src={b.bannerImage}
            alt=""
            width={2172}
            height={724}
            loading="lazy"
            decoding="async"
            className="hidden h-auto w-full md:block"
          />
          {/* Phones: real text around a crop of the models, so the words stay readable. */}
          <span className="block md:hidden">
            <span className="block px-6 pt-10 text-center font-sans text-4xl font-light uppercase leading-[0.95] tracking-tight">
              {headline}
            </span>
            {b.mobileImage ? (
              <img
                src={b.mobileImage}
                alt=""
                width={961}
                height={724}
                loading="lazy"
                decoding="async"
                className="mt-6 h-auto w-full [mask-image:linear-gradient(to_bottom,transparent,black_14%)]"
              />
            ) : null}
            <span className="block px-6 py-8 text-center font-display text-4xl uppercase leading-none">
              {b.offer}
              {shopLink}
            </span>
          </span>
        </ShopTargetLink>
      </section>
    );
  }

  return (
    <section aria-label="Bestsellers">
      <ShopTargetLink
        target={b.link}
        className="group grid min-h-[420px] items-center gap-6 bg-linen px-6 py-10 text-ink md:grid-cols-[1fr_auto_1fr] md:gap-8 md:py-0"
      >
        <span className="min-w-0 text-center font-sans text-4xl font-light uppercase leading-[0.95] tracking-tight sm:text-5xl md:text-right md:text-3xl lg:text-5xl xl:text-6xl">
          {headline}
        </span>
        <span className="mx-auto block h-72 w-56 self-end overflow-hidden md:h-[420px] md:w-56 lg:w-80">
          {b.mobileImage ? (
            <img
              src={b.mobileImage}
              alt={b.alt}
              loading="lazy"
              className="h-full w-full object-cover object-top"
            />
          ) : null}
        </span>
        <span className="min-w-0 text-center font-display text-4xl uppercase leading-none sm:text-5xl md:text-left md:text-3xl lg:text-5xl xl:text-6xl">
          {b.offer}
          {shopLink}
        </span>
      </ShopTargetLink>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Edit showcases (shirt types, jeans fits): a quote, then a row of photo tiles
// ---------------------------------------------------------------------------
type EditQuote = { eyebrow: string; quote: string; attribution: string };

function EditShowcase({
  titleId,
  quote,
  edits,
  noun,
}: {
  titleId: string;
  quote: EditQuote;
  edits: EditTile[];
  /** Product word for labels, e.g. "shirts" -> "Checked shirts". */
  noun: string;
}) {
  const scroller = useRef<HTMLUListElement>(null);
  const scrollBy = useCallback((dir: 1 | -1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  }, []);

  return (
    <section aria-labelledby={titleId} className="surface-paper py-14 sm:py-20">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2
          id={titleId}
          className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground"
        >
          {quote.eyebrow}
        </h2>
        <figure className="mt-5">
          <blockquote className="text-balance font-sans text-3xl font-light leading-tight tracking-tight sm:text-5xl">
            <p>&ldquo;{quote.quote}&rdquo;</p>
          </blockquote>
          <figcaption className="mt-4 text-sm font-semibold uppercase tracking-[0.2em]">
            &mdash; {quote.attribution}
          </figcaption>
        </figure>
      </div>

      <div className="relative mt-10">
        <ul
          ref={scroller}
          className="flex snap-x snap-mandatory scroll-px-4 gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:scroll-px-12 sm:px-12 [&::-webkit-scrollbar]:hidden"
        >
          {edits.map((edit) => (
            <li
              key={edit.title}
              className="w-[78%] shrink-0 snap-start sm:w-[45%] lg:w-[calc((100%-0.5rem)/3)]"
            >
              <ShopTargetLink
                target={edit.link}
                aria-label={`${edit.title} ${noun}. ${edit.tagline}`}
                className="group relative block aspect-[4/5] overflow-hidden bg-noir-soft"
              >
                {edit.image ? (
                  <img
                    src={edit.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : null}
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent"
                />
                <span className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4 text-white">
                  <span className="font-display text-3xl uppercase leading-[0.95] lg:text-4xl">
                    {edit.title}
                  </span>
                  <span className="max-w-[48%] pb-1 text-right text-xs font-semibold uppercase leading-snug">
                    {edit.tagline}
                  </span>
                </span>
              </ShopTargetLink>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className={cn(arrowButton, "left-2 hidden border md:inline-flex")}
          onClick={() => scrollBy(-1)}
          aria-label={`Scroll ${noun} left`}
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          className={cn(arrowButton, "right-2 hidden border md:inline-flex")}
          onClick={() => scrollBy(1)}
          aria-label={`Scroll ${noun} right`}
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

export function ShirtEdits() {
  return (
    <EditShowcase
      titleId="shirt-edit-title"
      quote={SHIRT_QUOTE}
      edits={SHIRT_EDITS}
      noun="shirts"
    />
  );
}

export function JeansEdits() {
  return (
    <EditShowcase titleId="jeans-edit-title" quote={JEANS_QUOTE} edits={JEANS_EDITS} noun="jeans" />
  );
}

// ---------------------------------------------------------------------------
// Ethnic banner
// ---------------------------------------------------------------------------
export function EthnicBanner() {
  const b = ETHNIC_BANNER;
  if (!b.image && !b.mobileImage) return null;
  return (
    <section aria-labelledby="ethnic-banner-title" className="bg-sage text-ink">
      <ShopTargetLink target={b.link} className="group relative block">
        {b.image ? (
          <img
            src={b.image}
            alt="Three models in an ivory chikankari kurta, a teal brocade kurta and a rust printed kurta with dupatta"
            width={1978}
            height={795}
            loading="lazy"
            decoding="async"
            className="hidden h-auto w-full lg:block"
          />
        ) : null}
        {b.mobileImage ? (
          <img
            src={b.mobileImage}
            alt="Three models in an ivory chikankari kurta, a teal brocade kurta and a rust printed kurta with dupatta"
            width={900}
            height={559}
            loading="lazy"
            decoding="async"
            className="h-auto w-full [mask-image:linear-gradient(to_bottom,black_82%,transparent)] lg:hidden"
          />
        ) : null}
        {/* Below lg the text sits under the photo; from lg it sits on the empty wall. */}
        <div className="block px-6 pb-10 pt-6 text-center lg:absolute lg:inset-y-0 lg:right-[5%] lg:flex lg:w-[28%] lg:flex-col lg:justify-center lg:p-0 lg:text-left">
          <span className="block text-xs font-semibold uppercase tracking-[0.3em]">
            {b.eyebrow}
          </span>
          <h2
            id="ethnic-banner-title"
            className="mt-3 text-4xl uppercase leading-[0.95] sm:text-5xl xl:text-6xl"
          >
            {b.heading}
          </h2>
          <span className="mt-4 block text-base font-medium leading-relaxed sm:text-lg">
            {b.text}
          </span>
          <span className="mt-6 inline-flex h-12 items-center justify-center self-center rounded-full bg-ink px-7 text-sm font-bold uppercase tracking-wide text-white transition group-hover:bg-ink/85 lg:self-start">
            {b.cta}
          </span>
        </div>
      </ShopTargetLink>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Trending (empty for now)
// ---------------------------------------------------------------------------
export function TrendingPlaceholder() {
  return (
    <section aria-labelledby="trending-title" className="mt-14">
      <h2 id="trending-title" className="px-4 text-4xl uppercase sm:px-4 sm:text-5xl">
        Trending
      </h2>
      <nav aria-label="Trending categories" className="mt-4 border-b">
        <ul className="flex gap-6 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TRENDING_TABS.map((tab, i) => (
            <li key={tab.label} className="shrink-0">
              <ShopTargetLink
                target={tab.link}
                className={cn(
                  "inline-flex min-h-11 items-center border-b-2 text-sm uppercase",
                  i === 0
                    ? "border-foreground font-bold"
                    : "border-transparent hover:border-muted-foreground",
                )}
              >
                {tab.label}
              </ShopTargetLink>
            </li>
          ))}
        </ul>
      </nav>
      <p className="sr-only">Trending products are coming soon.</p>
      <ul aria-hidden="true" className="mt-2 grid grid-cols-2 gap-1 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <li key={i} className={cn(i === 4 && "hidden lg:block")}>
            <div className="aspect-[3/4] bg-muted" />
            <div className="mt-2 h-4 w-2/3 bg-muted" />
            <div className="mt-2 mb-6 h-4 w-1/4 bg-muted" />
          </li>
        ))}
      </ul>
    </section>
  );
}
