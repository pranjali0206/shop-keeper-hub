import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { FestiveHero } from "@/components/store/home/FestiveHero";
import { PartyPacks } from "@/components/store/home/PartyPacks";
import { SiteHeader } from "@/components/store/SiteHeader";
import { AuthProvider } from "@/lib/auth";
import { CartProvider, useCart } from "@/lib/cart";
import {
  activeBannerQuery,
  bundlesQuery,
  categoriesQuery,
  type Banner,
  type Bundle,
  type Category,
  type ProductCard,
} from "@/lib/data";
import { WishlistProvider } from "@/lib/wishlist";

// No network in tests: a signed-out Supabase stub.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: async () => ({}),
    },
    from: () => {
      throw new Error("network disabled in tests");
    },
    rpc: async () => ({ data: null, error: null }),
  },
}));

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const product = (id: string, name: string, price: number, category = "shirts"): ProductCard => ({
  id,
  name,
  slug: id,
  price,
  compare_at_price: null,
  badges: [],
  is_bestseller: false,
  color: "black",
  fit: "regular",
  fabric: "cotton",
  created_at: new Date().toISOString(),
  category: { slug: category, name: category },
  product_images: [],
  product_variants: [
    { size: "M", stock: 5 },
    { size: "L", stock: 0 },
  ],
});

function CartProbe() {
  const cart = useCart();
  return (
    <output data-testid="cart">
      {JSON.stringify({
        lines: cart.lines.map((l) => [l.productId, l.size, l.groupKey]),
        subtotal: cart.subtotal,
      })}
    </output>
  );
}

async function renderApp(ui: ReactNode, seed: (qc: QueryClient) => void) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  seed(qc);
  const rootRoute = createRootRoute({
    component: () => (
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              {ui}
              <CartProbe />
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </QueryClientProvider>
    ),
  });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(<RouterProvider router={router} />);
  await screen.findByTestId("cart");
}

const cartState = () =>
  JSON.parse(screen.getByTestId("cart").textContent ?? "{}") as {
    lines: string[][];
    subtotal: number;
  };

describe("Header and category menu", () => {
  const categories: Category[] = [
    {
      id: "c1",
      name: "Jeans",
      slug: "jeans",
      parent_id: null,
      sort_order: 1,
      show_in_nav: true,
      image_url: null,
      created_at: "",
    },
    {
      id: "c2",
      name: "Shirts",
      slug: "shirts",
      parent_id: null,
      sort_order: 2,
      show_in_nav: true,
      image_url: null,
      created_at: "",
    },
  ];

  it("shows the centred wordmark with its tagline", async () => {
    await renderApp(<SiteHeader />, (qc) => qc.setQueryData(categoriesQuery.queryKey, categories));
    const home = screen.getByRole("link", { name: "S.O.L home" });
    expect(home).toHaveTextContent("S.O.L");
    expect(home).toHaveTextContent("Soul of Lifestyle");
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Cart, 0 items/ })).toBeInTheDocument();
  });

  it("opens the category menu and lists items in order with Sale last", async () => {
    await renderApp(<SiteHeader />, (qc) => qc.setQueryData(categoriesQuery.queryKey, categories));
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const nav = await screen.findByRole("navigation", { name: "Categories" });
    const rows = within(nav)
      .getAllByRole("listitem")
      .slice(0, 4)
      .map((li) => li.textContent?.trim());
    expect(rows).toEqual(["New Arrivals", "Jeans", "Shirts", "Sale"]);
    expect(within(nav).getByRole("link", { name: /Find a store/ })).toHaveAttribute(
      "href",
      "/stores",
    );
  });

  it("expands Jeans to its fit and wash links", async () => {
    await renderApp(<SiteHeader />, (qc) => qc.setQueryData(categoriesQuery.queryKey, categories));
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const nav = await screen.findByRole("navigation", { name: "Categories" });
    expect(within(nav).queryByRole("link", { name: "Baggy" })).toBeNull();
    fireEvent.click(within(nav).getByRole("button", { name: "Jeans" }));
    expect(within(nav).getByRole("link", { name: "Baggy" })).toHaveAttribute(
      "href",
      "/shop/jeans?fit=baggy",
    );
    expect(within(nav).getByRole("link", { name: "Light blue" })).toBeVisible();
    expect(within(nav).getByRole("link", { name: "Shop all jeans" })).toHaveAttribute(
      "href",
      "/shop/jeans",
    );
  });
});

describe("Party Packs", () => {
  const bundle: Bundle = {
    id: "b1",
    name: "Club Night",
    description: "Lights on you.",
    price: 5499,
    sort_order: 1,
    items: [
      product("p1", "Satin Shirt", 1699),
      product("p2", "Baggy Jeans", 1999, "jeans"),
      product("p3", "Sequin Bomber", 2999),
    ],
  };

  it("adds all three pieces in one action after sizes are picked", async () => {
    await renderApp(<PartyPacks />, (qc) => qc.setQueryData(bundlesQuery.queryKey, [bundle]));
    expect(screen.getByText("18% off")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Add full look/ }));
    const dialog = await screen.findByRole("dialog");
    const addAll = within(dialog).getByRole("button", { name: /Add all 3/ });

    fireEvent.click(addAll);
    expect(within(dialog).getAllByText("Choose a size first")).toHaveLength(3);
    expect(cartState().lines).toHaveLength(0);

    for (const name of ["Satin Shirt", "Baggy Jeans", "Sequin Bomber"]) {
      const group = within(dialog).getByRole("group", { name });
      expect(within(group).getByLabelText(/L/)).toBeDisabled(); // sold-out size
      fireEvent.click(within(group).getByLabelText("M"));
    }
    fireEvent.click(addAll);
    await waitFor(() => expect(cartState().lines).toHaveLength(3));
    const { lines, subtotal } = cartState();
    expect(new Set(lines.map((l) => l[2])).size).toBe(1); // one shared pack group
    expect(subtotal).toBe(5499);
  });
});

describe("Festive banner pins", () => {
  const banner: Banner = {
    id: "fb",
    title: "The Festive Edit",
    image_url: null,
    cta_label: "Shop ethnic edit",
    cta_link: "/shop/ethnic",
    hotspots: [
      {
        id: "h1",
        number: 1,
        x_percent: 20,
        y_percent: 40,
        product: product("k1", "Sage Kurta Set", 2999, "kurta-sets"),
      },
      {
        id: "h2",
        number: 2,
        x_percent: 60,
        y_percent: 30,
        product: product("k2", "Nehru Jacket", 2499, "nehru-jackets"),
      },
    ],
  };

  it("opens a product card when a pin is clicked", async () => {
    await renderApp(<FestiveHero />, (qc) => qc.setQueryData(activeBannerQuery.queryKey, banner));
    expect(screen.getByRole("link", { name: /Shop ethnic edit/ })).toHaveAttribute(
      "href",
      "/shop/ethnic",
    );
    const pin = screen.getByRole("button", { name: "Pin 1: Sage Kurta Set" });
    fireEvent.click(pin);
    await waitFor(() => expect(pin).toHaveAttribute("aria-expanded", "true"));
    const card = await screen.findByRole("dialog");
    expect(within(card).getByText("Sage Kurta Set")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "View product" })).toHaveAttribute(
      "href",
      "/product/k1",
    );

    fireEvent.click(within(card).getByRole("button", { name: "Add to cart" }));
    const quickAdd = await screen.findByRole("dialog", { name: "Sage Kurta Set" });
    fireEvent.click(within(quickAdd).getByRole("button", { name: "Add to cart" }));
    expect(within(quickAdd).getByText("Choose a size first")).toBeInTheDocument();
  });

  it("is reachable by keyboard", async () => {
    await renderApp(<FestiveHero />, (qc) => qc.setQueryData(activeBannerQuery.queryKey, banner));
    const pin = screen.getByRole("button", { name: "Pin 2: Nehru Jacket" });
    act(() => pin.focus());
    expect(pin).toHaveFocus();
    fireEvent.keyDown(pin, { key: "Enter" });
    fireEvent.click(pin); // Enter on a native button fires click
    expect(await screen.findByText("Nehru Jacket", { selector: "p" })).toBeInTheDocument();
  });
});
