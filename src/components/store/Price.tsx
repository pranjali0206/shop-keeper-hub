import { badgeLabel } from "@/lib/catalog";
import { discountPercent, formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Price({
  price,
  compareAt,
  className,
  size = "md",
}: {
  price: number;
  compareAt?: number | null | undefined;
  className?: string;
  size?: "md" | "lg";
}) {
  const off = discountPercent(price, compareAt);
  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2", className)}>
      <span className={cn("font-bold", size === "lg" ? "text-2xl" : "text-base")}>
        <span className="sr-only">Price </span>
        {formatINR(price)}
      </span>
      {off > 0 && compareAt ? (
        <>
          <s className={cn("text-muted-foreground", size === "lg" ? "text-base" : "text-sm")}>
            <span className="sr-only">was </span>
            {formatINR(compareAt)}
          </s>
          <span
            className={cn("font-bold text-blue-accent", size === "lg" ? "text-base" : "text-sm")}
          >
            {off}% off
          </span>
        </>
      ) : null}
    </p>
  );
}

const BADGE_STYLES: Record<string, string> = {
  new: "bg-primary text-primary-foreground",
  bestseller: "bg-paper text-ink ring-1 ring-ink",
  "low-stock": "bg-ink text-offwhite",
  sale: "bg-blue text-white",
};

export function ProductBadge({ value, className }: { value: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide",
        BADGE_STYLES[value] ?? "bg-secondary text-secondary-foreground",
        className,
      )}
    >
      {badgeLabel(value)}
    </span>
  );
}
