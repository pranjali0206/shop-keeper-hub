import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Instagram, MessageCircle } from "lucide-react";

import { Logo } from "@/components/common/Logo";
import { settingsQuery } from "@/lib/data";

const linkClass =
  "inline-flex min-h-11 items-center hover:underline underline-offset-4 hover:underline";

export function whatsappHref(
  number: string | null | undefined,
  text = "Hi S.O.L! I have a question.",
) {
  const digits = (number ?? "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null;
}

export function SiteFooter() {
  const { data: settings } = useQuery(settingsQuery);
  const whatsapp = whatsappHref(settings?.whatsapp);
  const instagram = settings?.instagram || null;

  return (
    <footer className="surface-noir mt-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo onDark className="text-3xl" />
          <p className="mt-3 font-display text-lg text-paper">Soul of Lifestyle</p>
          <p className="mt-2 max-w-xs text-sm text-on-noir-muted">
            Menswear for the main character. Built in India, worn everywhere.
          </p>
        </div>
        <nav aria-label="Shop">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-on-noir-muted">
            Shop
          </h2>
          <ul>
            <li>
              <Link
                to="/shop/$slug"
                params={{ slug: "new-arrivals" }}
                search={{}}
                className={linkClass}
              >
                New arrivals
              </Link>
            </li>
            <li>
              <Link to="/shop/$slug" params={{ slug: "jeans" }} search={{}} className={linkClass}>
                Jeans
              </Link>
            </li>
            <li>
              <Link to="/shop/$slug" params={{ slug: "ethnic" }} search={{}} className={linkClass}>
                Ethnic
              </Link>
            </li>
            <li>
              <Link
                to="/shop/$slug"
                params={{ slug: "party-wear" }}
                search={{}}
                className={linkClass}
              >
                Party wear
              </Link>
            </li>
            <li>
              <Link to="/shop/$slug" params={{ slug: "sale" }} search={{}} className={linkClass}>
                Sale
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Help">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-on-noir-muted">
            Help
          </h2>
          <ul>
            <li>
              <Link to="/size-guide" className={linkClass}>
                Size guide
              </Link>
            </li>
            <li>
              <Link to="/shipping-returns" className={linkClass}>
                Shipping and returns
              </Link>
            </li>
            <li>
              <Link to="/account/orders" className={linkClass}>
                My orders
              </Link>
            </li>
            <li>
              <Link to="/contact" className={linkClass}>
                Contact us
              </Link>
            </li>
            <li>
              <Link to="/about" className={linkClass}>
                About S.O.L
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Follow">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-on-noir-muted">
            Follow
          </h2>
          <ul>
            {instagram ? (
              <li>
                <a
                  href={instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${linkClass} gap-2`}
                >
                  <Instagram className="size-4" aria-hidden="true" /> Instagram
                </a>
              </li>
            ) : null}
            {whatsapp ? (
              <li>
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${linkClass} gap-2`}
                >
                  <MessageCircle className="size-4" aria-hidden="true" /> WhatsApp
                </a>
              </li>
            ) : null}
            <li>
              <Link to="/stores" className={linkClass}>
                Visit the store
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-noir-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-sm text-on-noir-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} S.O.L, Soul of Lifestyle</p>
          <ul className="flex gap-4">
            <li>
              <Link to="/privacy" className={linkClass}>
                Privacy
              </Link>
            </li>
            <li>
              <Link to="/terms" className={linkClass}>
                Terms
              </Link>
            </li>
            <li>
              <Link to="/shipping-returns" className={linkClass}>
                Returns
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

export function AnnouncementBar() {
  const { data: settings } = useQuery(settingsQuery);
  const text = settings?.announcement_text?.trim();
  if (!text) return null;
  return (
    <div className="surface-paper px-4 py-2 text-center text-sm font-bold">
      <p>{text}</p>
    </div>
  );
}

export function WhatsAppButton() {
  const { data: settings } = useQuery(settingsQuery);
  const href = whatsappHref(settings?.whatsapp);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with S.O.L on WhatsApp (opens in a new tab)"
      className="fixed bottom-4 right-4 z-30 inline-flex size-14 items-center justify-center rounded-full bg-whatsapp text-ink shadow-xl transition hover:scale-105 print:hidden"
    >
      <svg viewBox="0 0 24 24" className="size-7" fill="currentColor" aria-hidden="true">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3Z" />
      </svg>
    </a>
  );
}
