import { createFileRoute } from "@tanstack/react-router";

import {
  BestsellerBanner,
  CategoryStrip,
  EthnicBanner,
  HeroCarousel,
  JeansEdits,
  LookVideos,
  ShirtEdits,
  TrendingPlaceholder,
  WelcomeBand,
} from "@/components/store/home/HomeSections";

// No head() here: the home page uses the root title "SOL | Soul of Lifestyle".
// Images for every section are set in src/lib/home-content.ts.
export const Route = createFileRoute("/_store/")({
  component: Home,
});

function Home() {
  return (
    <>
      <HeroCarousel />
      <WelcomeBand />
      <CategoryStrip />
      <BestsellerBanner />
      <ShirtEdits />
      <EthnicBanner />
      <JeansEdits />
      <LookVideos />
      <TrendingPlaceholder />
    </>
  );
}
