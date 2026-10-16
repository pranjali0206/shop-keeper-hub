import { Link, Outlet, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
  Boxes,
  ExternalLink,
  Image as ImageIcon,
  LayoutDashboard,
  ListTree,
  LogOut,
  Mail,
  Menu,
  Megaphone,
  PackagePlus,
  Settings,
  ShoppingCart,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Logo } from "@/components/common/Logo";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { checkAccess, useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

// Admin is client-rendered: the session lives in the browser. Access is
// re-checked against the database (has_role / is_staff) on every navigation,
// and RLS still guards every query underneath.
export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const access = await checkAccess();
    if (!access.userId) throw redirect({ to: "/auth", search: { redirect: location.href } });
    if (!access.isStaff) throw redirect({ to: "/" });
    return { isOwner: access.isOwner };
  },
  head: () => ({ meta: [{ title: "Admin | SOL" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  ownerOnly?: boolean;
  exact?: boolean;
};
const NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/products", label: "Products", icon: Boxes },
  { to: "/admin/categories", label: "Categories", icon: ListTree },
  { to: "/admin/party-packs", label: "Party Packs", icon: PackagePlus },
  { to: "/admin/banner", label: "Festive banner", icon: ImageIcon },
  { to: "/admin/messages", label: "Messages", icon: Mail },
  { to: "/admin/content", label: "Hero & announcement", icon: Megaphone, ownerOnly: true },
  { to: "/admin/settings", label: "Settings", icon: Settings, ownerOnly: true },
  { to: "/admin/staff", label: "Staff", icon: Users, ownerOnly: true },
];

function NavLinks({ isOwner, onNavigate }: { isOwner: boolean; onNavigate?: () => void }) {
  return (
    <ul className="space-y-1">
      {NAV.filter((n) => isOwner || !n.ownerOnly).map((n) => (
        <li key={n.to}>
          <Link
            // Paths are the admin routes defined in this folder.
            to={n.to as "/admin"}
            onClick={onNavigate}
            activeOptions={{ exact: !!n.exact }}
            className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold hover:bg-noir-soft"
            activeProps={{
              className: "bg-noir-soft shadow-[inset_3px_0_0_var(--sol-blue-light)]",
              "aria-current": "page",
            }}
          >
            <n.icon className="size-5 shrink-0" aria-hidden="true" />
            {n.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function AdminLayout() {
  const { isOwner } = Route.useRouteContext();
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Signing out from another tab or the button below leaves the admin area.
  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/" });
  }, [loading, user, navigate]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="mb-6 px-3">
        <Logo onDark />
        <p className="mt-1 text-xs font-bold uppercase tracking-widest text-on-noir-muted">
          {isOwner ? "Owner" : "Staff"} admin
        </p>
      </div>
      <nav aria-label="Admin" className="flex-1">
        <NavLinks isOwner={isOwner} onNavigate={() => setMenuOpen(false)} />
      </nav>
      <div className="mt-6 space-y-1 border-t border-noir-line pt-4">
        <Link
          to="/"
          className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold hover:bg-noir-soft"
        >
          <ExternalLink className="size-5" aria-hidden="true" /> View store
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold hover:bg-noir-soft"
        >
          <LogOut className="size-5" aria-hidden="true" /> Sign out
        </button>
        <p className="truncate px-3 pt-2 text-xs text-on-noir-muted">{user?.email}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[260px_1fr]">
      <a
        href="#admin-main"
        className="sr-only z-50 rounded-md bg-paper px-4 py-3 font-bold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <aside className="surface-noir sticky top-0 hidden h-screen overflow-y-auto p-4 lg:block print:hidden">
        {sidebar}
      </aside>
      <header className="surface-noir sticky top-0 z-30 flex h-14 items-center gap-2 px-2 lg:hidden print:hidden">
        <button
          type="button"
          aria-label="Open admin menu"
          onClick={() => setMenuOpen(true)}
          className="inline-flex size-11 items-center justify-center rounded-full hover:bg-noir-soft"
        >
          <Menu className="size-6" aria-hidden="true" />
        </button>
        <Logo onDark className="text-xl" />
        <span className="ml-1 text-xs font-bold uppercase tracking-widest text-on-noir-muted">
          Admin
        </span>
      </header>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="surface-noir w-72 border-noir-line p-4">
          <SheetHeader className="sr-only">
            <SheetTitle>Admin menu</SheetTitle>
          </SheetHeader>
          {sidebar}
        </SheetContent>
      </Sheet>
      <main id="admin-main" className={cn("min-w-0 px-4 py-6 sm:px-8 sm:py-8")}>
        <Outlet />
      </main>
    </div>
  );
}
