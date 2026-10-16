import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

import { AuthForms, safeRedirect } from "@/components/store/AuthForms";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_store/auth")({
  ssr: false,
  validateSearch: (raw: Record<string, unknown>): { redirect?: string } => {
    const r = safeRedirect(raw["redirect"], "");
    return r ? { redirect: r } : {};
  },
  head: () => ({
    meta: [
      { title: "Sign in | SOL" },
      { name: "description", content: "Sign in or create your S.O.L account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  const { user, loading } = useAuth();
  const router = useRouter();
  const target = redirect ?? "/account/orders";

  useEffect(() => {
    if (!loading && user) router.history.replace(target);
  }, [user, loading, target, router]);

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-4xl">Welcome back</h1>
      <p className="mt-2 text-muted-foreground">
        Browse and build your cart without an account. Sign in to order and track it.
      </p>
      <div className="mt-8 rounded-2xl bg-card p-6 shadow-sm">
        <AuthForms redirectPath={target} onSignedIn={() => router.history.replace(target)} />
      </div>
    </div>
  );
}
