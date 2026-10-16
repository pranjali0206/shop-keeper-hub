import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { RouteError } from "@/components/common/RouteError";
import { parseSearch, stringifySearch } from "@/lib/search-params";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: RouteError,
    // Plain query strings (?fit=baggy&size=32) so shared catalog links stay readable.
    parseSearch,
    stringifySearch,
  });

  return router;
};
