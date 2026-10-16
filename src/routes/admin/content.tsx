import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  AdminPageHeader,
  Field,
  ImageUploadButton,
  LoadingRows,
  SubmitButton,
  fieldAria,
} from "@/components/admin/AdminUI";
import { ErrorState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { requireOwner } from "@/lib/admin";
import { settingsQuery } from "@/lib/data";
import { errorMessage } from "@/lib/format";
import { fieldErrors, storefrontCopySchema } from "@/lib/validation";

export const Route = createFileRoute("/admin/content")({
  beforeLoad: ({ context }) => requireOwner(context),
  component: ContentEditor,
});

type Values = {
  announcement_text: string;
  hero_headline: string;
  hero_subtext: string;
  hero_image_url: string | null;
};

function ContentEditor() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, error, refetch } = useQuery({ ...settingsQuery, staleTime: 0 });
  const [v, setV] = useState<Values | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data && !v) {
      setV({
        announcement_text: data.announcement_text,
        hero_headline: data.hero_headline,
        hero_subtext: data.hero_subtext,
        hero_image_url: data.hero_image_url,
      });
    }
  }, [data, v]);

  if (isPending) return <LoadingRows rows={4} />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!v)
    return (
      <ErrorState
        title="Store settings are missing"
        error={{ message: "Run the database migration to create the settings row." }}
      />
    );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!v) return;
    const parsed = storefrontCopySchema.safeParse(v);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setBusy(true);
    const { error } = await supabase
      .from("store_settings")
      .update({ ...parsed.data, hero_image_url: v.hero_image_url })
      .eq("id", true);
    setBusy(false);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    toast.success("Storefront copy saved");
    void queryClient.invalidateQueries({ queryKey: settingsQuery.queryKey });
  }

  return (
    <form onSubmit={save} noValidate>
      <AdminPageHeader
        title="Hero and announcement"
        description="The first things customers read."
        actions={<SubmitButton busy={busy}>Save</SubmitButton>}
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-4 rounded-2xl bg-card p-5 shadow-sm" aria-labelledby="copy-h">
          <h2 id="copy-h" className="text-xl">
            Copy
          </h2>
          <Field
            id="ct-ann"
            label="Announcement bar"
            error={errors["announcement_text"]}
            hint={`${v.announcement_text.length}/120. Leave empty to hide the bar.`}
          >
            <Input
              id="ct-ann"
              value={v.announcement_text}
              onChange={(e) => setV({ ...v, announcement_text: e.target.value })}
              {...fieldAria("ct-ann", errors["announcement_text"])}
            />
          </Field>
          <Field
            id="ct-head"
            label="Hero headline"
            error={errors["hero_headline"]}
            hint={`${v.hero_headline.length}/60`}
          >
            <Input
              id="ct-head"
              value={v.hero_headline}
              onChange={(e) => setV({ ...v, hero_headline: e.target.value })}
              {...fieldAria("ct-head", errors["hero_headline"])}
            />
          </Field>
          <Field
            id="ct-sub"
            label="Hero supporting line"
            error={errors["hero_subtext"]}
            hint={`${v.hero_subtext.length}/160`}
          >
            <Input
              id="ct-sub"
              value={v.hero_subtext}
              onChange={(e) => setV({ ...v, hero_subtext: e.target.value })}
              {...fieldAria("ct-sub", errors["hero_subtext"])}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            {v.hero_image_url ? (
              <img src={v.hero_image_url} alt="" className="h-20 w-16 rounded-lg object-cover" />
            ) : null}
            <ImageUploadButton
              folder="hero"
              label={v.hero_image_url ? "Replace hero photo" : "Upload hero photo"}
              onUploaded={([f]) => f && setV({ ...v, hero_image_url: f.url })}
            />
            {v.hero_image_url ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setV({ ...v, hero_image_url: null })}
              >
                Remove photo
              </Button>
            ) : null}
          </div>
        </section>
        <section aria-labelledby="prev-h" className="overflow-hidden rounded-2xl shadow-sm">
          <h2 id="prev-h" className="sr-only">
            Preview
          </h2>
          {v.announcement_text ? (
            <p className="surface-paper px-4 py-2 text-center text-sm font-bold">
              {v.announcement_text}
            </p>
          ) : null}
          <div className="surface-noir relative isolate p-8">
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_75%_40%,var(--sol-noir-line),transparent_55%)]"
            />
            <p className="font-display text-4xl leading-none">{v.hero_headline || "Headline"}</p>
            <p className="mt-3 text-on-noir-muted">{v.hero_subtext}</p>
            <span className="mt-5 inline-flex h-11 items-center rounded-full bg-paper px-5 font-bold text-ink">
              Shop new drop
            </span>
          </div>
        </section>
      </div>
    </form>
  );
}
