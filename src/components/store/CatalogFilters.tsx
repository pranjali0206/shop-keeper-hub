import {
  FITS,
  PRICE_RANGES,
  colorLabel,
  colorSwatch,
  sortSizes,
  titleCase,
  type ShopSearch,
} from "@/lib/catalog";
import type { Facets } from "@/lib/data";
import { splitList, toggleInList, withParam } from "@/lib/search-params";
import { cn } from "@/lib/utils";

function CheckOption({
  id,
  label,
  checked,
  onChange,
  swatch,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: () => void;
  swatch?: string;
}) {
  return (
    <li>
      <label
        htmlFor={id}
        className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-1 hover:bg-accent"
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="size-5 accent-[var(--primary)]"
        />
        {swatch ? (
          <span
            aria-hidden="true"
            className="size-5 rounded-full border border-foreground/30"
            style={{ backgroundColor: swatch }}
          />
        ) : null}
        <span className="text-sm">{label}</span>
      </label>
    </li>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-b pb-4">
      <legend className="mb-2 pt-4 text-sm font-bold uppercase tracking-widest">{title}</legend>
      {children}
    </fieldset>
  );
}

export function CatalogFilters({
  facets,
  search,
  onChange,
  idPrefix,
}: {
  facets: Facets | undefined;
  search: ShopSearch;
  onChange: (next: ShopSearch) => void;
  idPrefix: string;
}) {
  const sizes = sortSizes((facets?.sizes ?? []).map((size) => ({ size }))).map((s) => s.size);
  const fits = FITS.filter(
    (f) => facets?.fits.includes(f.value) || splitList(search.fit).includes(f.value),
  );
  const selected = (key: "size" | "color" | "fit" | "fabric") => splitList(search[key]);

  return (
    <div>
      {sizes.length ? (
        <Group title="Size">
          <ul className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const on = selected("size").includes(size);
              return (
                <li key={size}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => onChange(toggleInList(search, "size", size))}
                    className={cn(
                      "h-11 min-w-11 rounded-lg border-2 px-3 text-sm font-semibold",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:border-foreground",
                    )}
                  >
                    {size}
                  </button>
                </li>
              );
            })}
          </ul>
        </Group>
      ) : null}

      {facets?.colors.length ? (
        <Group title="Color">
          <ul>
            {facets.colors.map((c) => (
              <CheckOption
                key={c}
                id={`${idPrefix}-color-${c}`}
                label={colorLabel(c)}
                swatch={colorSwatch(c)}
                checked={selected("color").includes(c)}
                onChange={() => onChange(toggleInList(search, "color", c))}
              />
            ))}
          </ul>
        </Group>
      ) : null}

      <Group title="Price">
        <ul>
          {PRICE_RANGES.map((r) => (
            <li key={r.value}>
              <label
                htmlFor={`${idPrefix}-price-${r.value}`}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-1 hover:bg-accent"
              >
                <input
                  id={`${idPrefix}-price-${r.value}`}
                  type="radio"
                  name={`${idPrefix}-price`}
                  checked={search.price === r.value}
                  onChange={() => onChange(withParam(search, "price", r.value))}
                  className="size-5 accent-[var(--primary)]"
                />
                <span className="text-sm">{r.label}</span>
              </label>
            </li>
          ))}
        </ul>
        {search.price ? (
          <button
            type="button"
            className="mt-1 min-h-11 text-sm font-semibold text-primary underline"
            onClick={() => onChange(withParam(search, "price", null))}
          >
            Any price
          </button>
        ) : null}
      </Group>

      {fits.length ? (
        <Group title="Fit">
          <ul>
            {fits.map((f) => (
              <CheckOption
                key={f.value}
                id={`${idPrefix}-fit-${f.value}`}
                label={f.label}
                checked={selected("fit").includes(f.value)}
                onChange={() => onChange(toggleInList(search, "fit", f.value))}
              />
            ))}
          </ul>
        </Group>
      ) : null}

      {facets?.fabrics.length ? (
        <Group title="Fabric">
          <ul>
            {facets.fabrics.map((f) => (
              <CheckOption
                key={f}
                id={`${idPrefix}-fabric-${f}`}
                label={titleCase(f)}
                checked={selected("fabric").includes(f)}
                onChange={() => onChange(toggleInList(search, "fabric", f))}
              />
            ))}
          </ul>
        </Group>
      ) : null}
    </div>
  );
}
