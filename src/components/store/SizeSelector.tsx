import { useId } from "react";

import { sortSizes } from "@/lib/catalog";
import type { ProductVariant } from "@/lib/data";
import { cn } from "@/lib/utils";

/** Native radio group styled as size chips; sold-out sizes are disabled. */
export function SizeSelector({
  variants,
  value,
  onChange,
  error,
  legend = "Size",
  name,
}: {
  variants: ProductVariant[];
  value: string | null;
  onChange: (size: string) => void;
  error?: string | undefined;
  legend?: string;
  name?: string;
}) {
  const autoId = useId();
  const groupName = name ?? `size-${autoId}`;
  const errorId = `${groupName}-error`;
  const sorted = sortSizes(variants);
  return (
    <fieldset
      aria-describedby={error ? errorId : undefined}
      aria-invalid={error ? true : undefined}
    >
      <legend className="mb-2 text-sm font-semibold">{legend}</legend>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sizes coming soon.</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {sorted.map((v) => {
          const soldOut = v.stock <= 0;
          const id = `${groupName}-${v.size}`;
          return (
            <div key={v.size}>
              <input
                type="radio"
                id={id}
                name={groupName}
                value={v.size}
                checked={value === v.size}
                disabled={soldOut}
                onChange={() => onChange(v.size)}
                className="peer sr-only"
              />
              <label
                htmlFor={id}
                className={cn(
                  "flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border-2 px-3 text-sm font-semibold transition-colors",
                  "peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground",
                  "peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                  "hover:border-foreground",
                  soldOut &&
                    "cursor-not-allowed border-dashed text-muted-foreground line-through hover:border-border",
                )}
              >
                {v.size}
                {soldOut ? <span className="sr-only"> (sold out)</span> : null}
              </label>
            </div>
          );
        })}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-sm font-semibold text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
