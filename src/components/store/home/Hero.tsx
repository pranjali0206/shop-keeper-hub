import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin } from "lucide-react";

import { GarmentIllustration } from "@/components/common/GarmentIllustration";
import { settingsQuery } from "@/lib/data";

export function Hero() {
  const { data: settings } = useQuery(settingsQuery);
  const headline = settings?.hero_headline || "Dress to be noticed.";
  const subtext =
    settings?.hero_subtext || "Fresh fits for the main character. New drop every Friday.";
  const image = settings?.hero_image_url;

  return (
    <section aria-labelledby="hero-title" className="surface-noir relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute -z-10 left-1/2 top-1/2 size-[140vmax] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(circle_at_center,var(--sol-noir-line)_0%,transparent_42%)] opacity-90 md:left-[70%]"
      />
      <div className="mx-auto grid min-h-[calc(100svh-6.5rem)] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.1fr_1fr] md:py-16">
        <div className="motion-safe:animate-rise">
          <p className="mb-4 inline-flex rounded-full border border-noir-line px-3 py-1 text-xs font-bold uppercase tracking-widest text-on-noir-muted">
            S.O.L · Soul of Lifestyle
          </p>
          <h1 id="hero-title" className="text-5xl leading-[0.92] sm:text-7xl lg:text-8xl">
            {headline}
          </h1>
          <p className="mt-5 max-w-md text-lg text-on-noir-muted">{subtext}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/shop/$slug"
              params={{ slug: "new-arrivals" }}
              search={{}}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-paper px-6 text-base font-bold text-ink transition hover:bg-offwhite/85"
            >
              Shop new drop <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
            <a
              href="/stores"
              className="inline-flex h-12 items-center gap-2 rounded-full border-2 border-offwhite px-6 text-base font-bold transition hover:bg-offwhite hover:text-ink"
            >
              <MapPin className="size-5" aria-hidden="true" /> Find a store
            </a>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md motion-safe:animate-rise [animation-delay:150ms]">
          <div className="aspect-[4/5] overflow-hidden rounded-[2rem] border border-noir-line shadow-2xl">
            {image ? (
              <img
                src={image}
                alt="Model wearing the latest S.O.L drop"
                className="h-full w-full object-cover"
                fetchPriority="high"
              />
            ) : (
              <GarmentIllustration
                kind="jacket"
                color="black"
                seed="hero"
                label="Denim jacket from the new S.O.L drop"
              />
            )}
          </div>
          <div className="absolute -left-4 -top-6 sm:-left-8" aria-hidden="true">
            <div className="relative grid size-28 place-items-center rounded-full bg-paper text-center text-ink shadow-xl -rotate-12 sm:size-32">
              <span className="absolute inset-2 rounded-full border-2 border-dashed border-ink/40 motion-safe:animate-spin-slow" />
              <span className="font-display px-4 text-lg leading-tight">New drop ready</span>
            </div>
          </div>
          <p className="sr-only">New drop ready</p>
        </div>
      </div>
    </section>
  );
}

const MARQUEE = ["New drop", "Party ready", "Festive edit", "Baggy is back"];

export function Marquee() {
  const run = (
    <span className="flex shrink-0 items-center">
      {[...MARQUEE, ...MARQUEE].map((w, i) => (
        <span key={i} className="flex items-center whitespace-nowrap">
          <span className="px-6 font-display text-2xl sm:text-3xl">{w}</span>
          <span aria-hidden="true" className="text-xl">
            •
          </span>
        </span>
      ))}
    </span>
  );
  return (
    <section
      aria-label="Highlights"
      className="surface-paper overflow-hidden border-y-2 border-ink py-3"
    >
      <p className="sr-only">{MARQUEE.join(", ")}</p>
      <div
        aria-hidden="true"
        className="flex w-max animate-marquee hover:[animation-play-state:paused]"
      >
        {run}
        {run}
      </div>
    </section>
  );
}
