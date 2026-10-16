import { cn } from "@/lib/utils";

/**
 * Brand mark. Drop the uploaded white logo at /public/brand/sol-logo-white.svg
 * (or .png) and set LOGO_ON_DARK_SRC; until then the S.O.L text wordmark shows.
 * There is no dark-on-light logo yet, so light surfaces always use the wordmark.
 */
export const LOGO_ON_DARK_SRC: string | null = null;

export function Logo({
  onDark = false,
  tagline = false,
  className,
}: {
  onDark?: boolean;
  /** Show "Soul of Lifestyle" under the wordmark. */
  tagline?: boolean;
  className?: string;
}) {
  if (onDark && LOGO_ON_DARK_SRC) {
    return (
      <img
        src={LOGO_ON_DARK_SRC}
        alt="S.O.L, Soul of Lifestyle"
        className={cn("h-7 w-auto", className)}
      />
    );
  }
  return (
    <span
      className={cn(
        "inline-flex flex-col items-center text-2xl leading-none",
        onDark ? "text-offwhite" : "text-foreground",
        className,
      )}
    >
      <span aria-hidden="true" className="font-display tracking-[0.18em]">
        S.O.L
      </span>
      {tagline ? (
        <span
          aria-hidden="true"
          className="mt-[0.15em] text-[0.35em] font-bold uppercase tracking-[0.32em]"
        >
          Soul of Lifestyle
        </span>
      ) : null}
      <span className="sr-only">S.O.L, Soul of Lifestyle</span>
    </span>
  );
}
