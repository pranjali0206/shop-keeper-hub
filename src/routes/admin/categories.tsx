import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AdminPageHeader,
  ConfirmAction,
  Field,
  ImageUploadButton,
  LoadingRows,
  SubmitButton,
  Toggle,
  fieldAria,
} from "@/components/admin/AdminUI";
import { EmptyState, ErrorState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/catalog";
import { categoriesQuery, type Category } from "@/lib/data";
import { errorMessage } from "@/lib/format";
import { categorySchema, fieldErrors } from "@/lib/validation";

export const Route = createFileRoute("/admin/categories")({
  component: CategoriesPage,
});

type Draft = {
  id: string | null;
  name: string;
  slug: string;
  parent_id: string | null;
  show_in_nav: boolean;
  image_url: string | null;
};

function CategoryDialog({
  draft,
  categories,
  onClose,
  onSaved,
}: {
  draft: Draft;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [v, setV] = useState(draft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!draft.id);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = categorySchema.safeParse(v);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setBusy(true);
    try {
      const row = { ...parsed.data, image_url: v.image_url };
      if (v.id) {
        const { error } = await supabase.from("categories").update(row).eq("id", v.id);
        if (error) throw error;
      } else {
        const maxOrder = Math.max(0, ...categories.map((c) => c.sort_order));
        const { error } = await supabase
          .from("categories")
          .insert({ ...row, sort_order: maxOrder + 10 });
        if (error) throw error;
      }
      toast.success(v.id ? "Category saved" : "Category added");
      onSaved();
    } catch (err) {
      const msg = errorMessage(err);
      if (/categories_slug_key|duplicate/.test(msg))
        setErrors({ slug: "Already used by another category" });
      else toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <form onSubmit={save} noValidate className="space-y-4">
          <DialogHeader>
            <DialogTitle>{v.id ? "Edit category" : "New category"}</DialogTitle>
            <DialogDescription>Shown in the navbar and at /shop/{v.slug || "…"}</DialogDescription>
          </DialogHeader>
          <Field id="cat-name" label="Name" error={errors["name"]}>
            <Input
              id="cat-name"
              value={v.name}
              onChange={(e) =>
                setV((p) => ({
                  ...p,
                  name: e.target.value,
                  slug: slugTouched ? p.slug : slugify(e.target.value),
                }))
              }
              {...fieldAria("cat-name", errors["name"])}
            />
          </Field>
          <Field id="cat-slug" label="URL slug" error={errors["slug"]}>
            <Input
              id="cat-slug"
              value={v.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setV((p) => ({ ...p, slug: slugify(e.target.value) }));
              }}
              {...fieldAria("cat-slug", errors["slug"])}
            />
          </Field>
          <Field
            id="cat-parent"
            label="Parent category"
            hint="Sub-categories appear inside their parent's page and mega menu links."
          >
            <select
              id="cat-parent"
              value={v.parent_id ?? ""}
              onChange={(e) => setV((p) => ({ ...p, parent_id: e.target.value || null }))}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">None (top level)</option>
              {categories
                .filter((c) => !c.parent_id && c.id !== v.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </Field>
          <Toggle
            id="cat-nav"
            label="Show in navbar"
            checked={v.show_in_nav}
            onChange={(show_in_nav) => setV((p) => ({ ...p, show_in_nav }))}
          />
          <div className="flex items-center gap-3">
            {v.image_url ? (
              <img src={v.image_url} alt="" className="size-16 rounded-lg object-cover" />
            ) : null}
            <ImageUploadButton
              folder="categories"
              label={v.image_url ? "Replace tile image" : "Upload tile image"}
              onUploaded={([f]) => f && setV((p) => ({ ...p, image_url: f.url }))}
            />
            {v.image_url ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setV((p) => ({ ...p, image_url: null }))}
              >
                Remove
              </Button>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <SubmitButton busy={busy}>Save</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CategoriesPage() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, error, refetch } = useQuery({
    ...categoriesQuery,
    staleTime: 0,
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: categoriesQuery.queryKey });

  // Display parents followed by their children.
  const ordered = (data ?? [])
    .filter((c) => !c.parent_id)
    .flatMap((p) => [p, ...(data ?? []).filter((c) => c.parent_id === p.id)]);
  const tops = ordered.filter((c) => !c.parent_id);

  async function move(cat: Category, dir: -1 | 1) {
    const siblings = ordered.filter((c) => c.parent_id === cat.parent_id);
    const idx = siblings.findIndex((c) => c.id === cat.id);
    const other = siblings[idx + dir];
    if (!other) return;
    // Swap sort orders (renumber first if they are equal).
    const a = cat.sort_order === other.sort_order ? cat.sort_order + dir : other.sort_order;
    const b = cat.sort_order;
    const r1 = await supabase.from("categories").update({ sort_order: a }).eq("id", cat.id);
    const r2 = await supabase.from("categories").update({ sort_order: b }).eq("id", other.id);
    if (r1.error || r2.error) toast.error(errorMessage(r1.error ?? r2.error));
    refresh();
  }

  async function toggleNav(cat: Category) {
    const { error } = await supabase
      .from("categories")
      .update({ show_in_nav: !cat.show_in_nav })
      .eq("id", cat.id);
    if (error) toast.error(errorMessage(error));
    else toast.success(`${cat.name} ${cat.show_in_nav ? "hidden from" : "added to"} the navbar`);
    refresh();
  }

  return (
    <div>
      <AdminPageHeader
        title="Categories"
        description="Order here is the navbar order."
        actions={
          <Button
            onClick={() =>
              setDraft({
                id: null,
                name: "",
                slug: "",
                parent_id: null,
                show_in_nav: true,
                image_url: null,
              })
            }
          >
            <Plus className="size-4" aria-hidden="true" /> Add category
          </Button>
        }
      />
      {isPending ? (
        <LoadingRows />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : ordered.length === 0 ? (
        <EmptyState title="No categories yet" />
      ) : (
        <ul className="divide-y rounded-2xl bg-card shadow-sm">
          {ordered.map((c) => {
            const siblings = c.parent_id
              ? ordered.filter((x) => x.parent_id === c.parent_id)
              : tops;
            const i = siblings.findIndex((x) => x.id === c.id);
            return (
              <li
                key={c.id}
                className={
                  c.parent_id
                    ? "flex flex-wrap items-center gap-2 p-3 pl-10"
                    : "flex flex-wrap items-center gap-2 p-3"
                }
              >
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Move ${c.name} up`}
                    disabled={i === 0}
                    onClick={() => void move(c, -1)}
                  >
                    <ArrowUp className="size-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Move ${c.name} down`}
                    disabled={i === siblings.length - 1}
                    onClick={() => void move(c, 1)}
                  >
                    <ArrowDown className="size-4" aria-hidden="true" />
                  </Button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">/shop/{c.slug}</p>
                </div>
                {!c.parent_id ? (
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      role="switch"
                      checked={c.show_in_nav}
                      onChange={() => void toggleNav(c)}
                      className="size-5 accent-[var(--primary)]"
                    />
                    In navbar
                  </label>
                ) : (
                  <span className="text-xs text-muted-foreground">Sub-category</span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${c.name}`}
                  onClick={() =>
                    setDraft({
                      id: c.id,
                      name: c.name,
                      slug: c.slug,
                      parent_id: c.parent_id,
                      show_in_nav: c.show_in_nav,
                      image_url: c.image_url,
                    })
                  }
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </Button>
                <ConfirmAction
                  title={`Delete ${c.name}?`}
                  description="Products in this category stay, but lose their category until you pick a new one."
                  onConfirm={async () => {
                    const { error } = await supabase.from("categories").delete().eq("id", c.id);
                    if (error) throw error;
                    toast.success(`${c.name} deleted`);
                    refresh();
                  }}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label={`Delete ${c.name}`}>
                      <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                    </Button>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
      {draft ? (
        <CategoryDialog
          draft={draft}
          categories={data ?? []}
          onClose={() => setDraft(null)}
          onSaved={() => {
            setDraft(null);
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}
