import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ChevronDown,
  Heart,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  ShoppingBag,
  User,
} from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import { Logo } from "@/components/common/Logo";
import { SearchDialog } from "@/components/store/SearchDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { MEGA_MENUS, type MegaMenu, type ShopSearch } from "@/lib/catalog";
import { categoriesQuery } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useWishlist } from "@/lib/wishlist";

type NavEntry = { label: string; slug: string; highlight?: boolean; mega?: MegaMenu };

/** New Arrivals and Sale bookend the categories the admin marks "show in navbar". */
export function useNavEntries(): NavEntry[] {
  const { data: categories = [] } = useQuery(categoriesQuery);
  const top = categories.filter((c) => c.show_in_nav && !c.parent_id);
  return [
    { label: "New Arrivals", slug: "new-arrivals" },
    ...top.map((c) => {
      const mega = MEGA_MENUS[c.slug];
      return mega ? { label: c.name, slug: c.slug, mega } : { label: c.name, slug: c.slug };
    }),
    { label: "Sale", slug: "sale", highlight: true },
  ];
}

function ShopLink({
  slug,
  search,
  className,
  children,
  onClick,
  onKeyDown,
  linkRef,
  ...aria
}: {
  slug: string;
  search?: ShopSearch | undefined;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  onKeyDown?: (e: KeyboardEvent<HTMLAnchorElement>) => void;
  linkRef?: React.Ref<HTMLAnchorElement>;
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
}) {
  return (
    <Link
      ref={linkRef}
      to="/shop/$slug"
      params={{ slug }}
      search={search ?? {}}
      className={className}
      onClick={onClick}
      onKeyDown={onKeyDown}
      {...aria}
    >
      {children}
    </Link>
  );
}

/** One menu for every screen size, as on the reference design: categories behind the menu button. */
function SiteMenu({
  open,
  onOpenChange,
  entries,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entries: NavEntry[];
}) {
  const close = () => onOpenChange(false);
  const { isStaff, user } = useAuth();
  const row =
    "flex min-h-12 w-full items-center justify-between gap-2 border-b px-1 text-left text-sm font-semibold uppercase tracking-wide hover:underline underline-offset-4";
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="surface-paper flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b px-4 py-3 text-left">
          <SheetTitle>
            <Logo tagline className="text-[1.75rem] text-black" />
          </SheetTitle>
          <SheetDescription className="sr-only">Shop by category</SheetDescription>
        </SheetHeader>
        <nav aria-label="Categories" className="flex-1 px-4 py-2">
          <ul>
            {entries.map((entry) =>
              entry.mega ? (
                <li key={entry.slug}>
                  <Collapsible>
                    <CollapsibleTrigger className={cn(row, "group")}>
                      {entry.label}
                      <ChevronDown
                        className="size-5 transition-transform group-data-[state=open]:rotate-180"
                        aria-hidden="true"
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="grid gap-4 border-b py-3 sm:grid-cols-2">
                      <ShopLink
                        slug={entry.slug}
                        onClick={close}
                        className="flex min-h-11 items-center px-1 text-sm font-semibold underline underline-offset-4 sm:col-span-2"
                      >
                        Shop all {entry.label.toLowerCase()}
                      </ShopLink>
                      {entry.mega.columns.map((col) => (
                        <div key={col.title}>
                          <p className="px-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            {col.title}
                          </p>
                          <ul>
                            {col.links.map((l) => (
                              <li key={l.label}>
                                <ShopLink
                                  slug={l.slug}
                                  search={l.search}
                                  onClick={close}
                                  className="flex min-h-11 items-center px-1 text-sm hover:underline underline-offset-4"
                                >
                                  {l.label}
                                </ShopLink>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </li>
              ) : (
                <li key={entry.slug}>
                  <ShopLink
                    slug={entry.slug}
                    onClick={close}
                    className={cn(row, entry.highlight && "text-blue-accent")}
                  >
                    {entry.label}
                  </ShopLink>
                </li>
              ),
            )}
          </ul>
          <ul className="mt-6 space-y-1 text-sm">
            <li>
              <Link to="/stores" onClick={close} className="flex min-h-11 items-center gap-3 px-1">
                <MapPin className="size-5" aria-hidden="true" /> Find a store
              </Link>
            </li>
            <li>
              <Link
                to="/wishlist"
                onClick={close}
                className="flex min-h-11 items-center gap-3 px-1"
              >
                <Heart className="size-5" aria-hidden="true" /> Wishlist
              </Link>
            </li>
            <li>
              <Link
                to={user ? "/account/orders" : "/auth"}
                onClick={close}
                className="flex min-h-11 items-center gap-3 px-1"
              >
                <User className="size-5" aria-hidden="true" /> {user ? "My orders" : "Sign in"}
              </Link>
            </li>
            {isStaff ? (
              <li>
                <Link to="/admin" onClick={close} className="flex min-h-11 items-center gap-3 px-1">
                  <ShieldCheck className="size-5" aria-hidden="true" /> Admin
                </Link>
              </li>
            ) : null}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

const iconLink =
  "relative inline-flex size-11 items-center justify-center rounded-full transition-colors hover:bg-muted";

const countBadge =
  "absolute right-0.5 top-0.5 min-w-5 rounded-full bg-ink px-1 text-center text-[11px] font-bold leading-5 text-white";

export function SiteHeader() {
  const entries = useNavEntries();
  const cart = useCart();
  const wishlist = useWishlist();
  const { user, isStaff } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="surface-paper sticky top-0 z-40 border-b border-[var(--border)]">
      <div className="mx-auto grid h-[72px] max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center px-2 sm:px-6">
        <div className="flex items-center">
          <button
            type="button"
            className={iconLink}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="size-6" aria-hidden="true" />
          </button>
        </div>

        <Link to="/" className="inline-flex min-h-11 items-center px-2" aria-label="S.O.L home">
          <Logo tagline className="text-[1.75rem] text-black" />
        </Link>

        <div className="flex items-center justify-end gap-0.5">
          <button
            type="button"
            className={iconLink}
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={iconLink}
            onClick={() => cart.open()}
            aria-label={`Cart, ${cart.count} ${cart.count === 1 ? "item" : "items"}`}
          >
            <ShoppingBag className="size-5" aria-hidden="true" />
            {cart.count > 0 ? (
              <span aria-hidden="true" className={countBadge}>
                {cart.count}
              </span>
            ) : null}
          </button>
          <Link
            to="/wishlist"
            className={cn(iconLink, "hidden sm:inline-flex")}
            aria-label={`Wishlist, ${wishlist.ids.length} saved`}
          >
            <Heart className="size-5" aria-hidden="true" />
            {wishlist.ids.length > 0 ? (
              <span aria-hidden="true" className={countBadge}>
                {wishlist.ids.length}
              </span>
            ) : null}
          </Link>
          <Link
            to={user ? "/account/orders" : "/auth"}
            className={cn(iconLink, "hidden sm:inline-flex")}
            aria-label={user ? "My account" : "Sign in"}
          >
            <User className="size-5" aria-hidden="true" />
          </Link>
          {isStaff ? (
            <Link
              to="/admin"
              className={cn(iconLink, "hidden sm:inline-flex")}
              aria-label="Admin panel"
            >
              <ShieldCheck className="size-5" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </div>
      <span className="sr-only" aria-live="polite">
        {cart.hydrated ? `${cart.count} items in cart` : ""}
      </span>
      <SiteMenu open={menuOpen} onOpenChange={setMenuOpen} entries={entries} />
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
