import { useQueryClient } from "@tanstack/react-query";
import { Outlet, createFileRoute } from "@tanstack/react-router";

import { StoreNotFound } from "@/components/common/RouteError";
import { CartDrawer } from "@/components/store/CartDrawer";
import { SiteHeader } from "@/components/store/SiteHeader";
import { AnnouncementBar, SiteFooter, WhatsAppButton } from "@/components/store/SiteFooter";
import { categoriesQuery, settingsQuery } from "@/lib/data";

// Pathless layout for every storefront page: announcement bar, header, footer,
// cart drawer and the floating WhatsApp button.
export const Route = createFileRoute("/_store")({
  loader: async ({ context }) => {
    // Loader data is serialised to the browser, so the header renders the same
    // navbar on the server and on hydration. A failed fetch is not fatal: the
    // components fall back to client-side loading and error states.
    const [settings, categories] = await Promise.allSettled([
      context.queryClient.ensureQueryData(settingsQuery),
      context.queryClient.ensureQueryData(categoriesQuery),
    ]);
    return {
      settings: settings.status === "fulfilled" ? settings.value : undefined,
      categories: categories.status === "fulfilled" ? categories.value : undefined,
    };
  },
  component: StoreLayout,
  notFoundComponent: StoreNotFound,
});

function StoreLayout() {
  const data = Route.useLoaderData();
  const queryClient = useQueryClient();
  if (
    data.settings !== undefined &&
    queryClient.getQueryData(settingsQuery.queryKey) === undefined
  ) {
    queryClient.setQueryData(settingsQuery.queryKey, data.settings);
  }
  if (
    data.categories !== undefined &&
    queryClient.getQueryData(categoriesQuery.queryKey) === undefined
  ) {
    queryClient.setQueryData(categoriesQuery.queryKey, data.categories);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-paper px-4 py-3 font-bold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <AnnouncementBar />
      <SiteHeader />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      <CartDrawer />
      <WhatsAppButton />
    </div>
  );
}
