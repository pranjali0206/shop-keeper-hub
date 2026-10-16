import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it.each([
    "/shop/jeans",
    "/shop/new-arrivals",
    "/product/baggy-black-jeans",
    "/wishlist",
    "/stores",
    "/search",
    "/about",
    "/contact",
    "/size-guide",
    "/shipping-returns",
    "/privacy",
    "/terms",
    "/auth",
    "/reset-password",
    "/checkout",
    "/order-confirmed/SOL-1001",
    "/account/orders",
    "/account/orders/SOL-1001",
    "/admin",
    "/admin/orders",
    "/admin/orders/00000000-0000-0000-0000-000000000000",
    "/admin/products",
    "/admin/products/new",
    "/admin/categories",
    "/admin/party-packs",
    "/admin/banner",
    "/admin/messages",
    "/admin/content",
    "/admin/settings",
    "/admin/staff",
  ])("matches a page for %s", (path) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes(path).at(-1)?.routeId).not.toBe(rootRouteId);
  });
});
