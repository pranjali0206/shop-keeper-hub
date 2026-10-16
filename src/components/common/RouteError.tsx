import { Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { useEffect } from "react";

import { ErrorState } from "@/components/common/States";
import { reportLovableError } from "@/lib/lovable-error-reporting";

/** Error state for a page whose data failed to load; renders inside the page layout. */
export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_route_error_component" });
  }, [error]);
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <ErrorState
        title="This page didn't load"
        error={error}
        onRetry={() => {
          void router.invalidate();
          reset();
        }}
      />
    </div>
  );
}

/** Not-found state shown inside the store layout (header and footer stay). */
export function StoreNotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="font-display text-8xl text-primary">404</p>
      <h1 className="mt-4 text-3xl">This page left the chat.</h1>
      <p className="mt-2 text-muted-foreground">
        The link is broken or the item is gone. The fits are still here though.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          to="/"
          className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          Go home
        </Link>
        <Link
          to="/shop/$slug"
          params={{ slug: "new-arrivals" }}
          search={{}}
          className="inline-flex h-11 items-center rounded-md border border-input px-5 text-sm font-semibold"
        >
          Shop new drop
        </Link>
      </div>
    </div>
  );
}
