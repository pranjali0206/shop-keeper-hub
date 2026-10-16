import { Link, createFileRoute } from "@tanstack/react-router";

import { StaticPage } from "@/components/store/StaticPage";

export const Route = createFileRoute("/_store/about")({
  head: () => ({
    meta: [
      { title: "About | SOL" },
      {
        name: "description",
        content: "S.O.L, Soul of Lifestyle: menswear made for the main character.",
      },
    ],
  }),
  component: () => (
    <StaticPage
      title="Soul of Lifestyle"
      intro="We make clothes for guys who walk in and get noticed."
    >
      <p>
        S.O.L started with one store and one rule: every fit should feel like you. Baggy denim,
        sharp shirts, kurtas with attitude and party pieces that catch the light.
      </p>
      <h2>What we stand for</h2>
      <ul>
        <li>Fits first. Every piece is tried on real bodies before it drops.</li>
        <li>Fair prices. Party Packs save you more when you buy the full look.</li>
        <li>Real people. Visit the store, try it on, chat with us on WhatsApp.</li>
      </ul>
      <p>
        <Link to="/stores" className="font-semibold text-primary underline">
          Find the store
        </Link>{" "}
        or{" "}
        <Link
          to="/shop/$slug"
          params={{ slug: "new-arrivals" }}
          search={{}}
          className="font-semibold text-primary underline"
        >
          shop the new drop
        </Link>
        .
      </p>
    </StaticPage>
  ),
});
