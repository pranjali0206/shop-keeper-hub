import { useRouter } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, MouseEvent } from "react";

/**
 * Link for hrefs stored in the database (banner CTAs and the like). Internal
 * paths navigate client-side; anything else is a normal external link.
 */
export function InternalLink({
  href,
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const router = useRouter();
  const internal = href.startsWith("/") && !href.startsWith("//");
  function handle(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented || !internal) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    router.history.push(href);
  }
  return (
    <a
      href={href}
      onClick={handle}
      {...(internal ? {} : { target: "_blank", rel: "noopener noreferrer" })}
      {...props}
    />
  );
}
