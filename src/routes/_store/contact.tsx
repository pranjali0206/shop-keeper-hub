import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";

import { FieldError } from "@/components/common/States";
import { whatsappHref } from "@/components/store/SiteFooter";
import { StaticPage } from "@/components/store/StaticPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { settingsQuery } from "@/lib/data";
import { errorMessage } from "@/lib/format";
import { contactSchema, fieldErrors } from "@/lib/validation";

export const Route = createFileRoute("/_store/contact")({
  head: () => ({
    meta: [
      { title: "Contact | SOL" },
      {
        name: "description",
        content: "Questions about sizes, orders or the store? Talk to S.O.L.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { data: settings } = useQuery(settingsQuery);
  const [values, setValues] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const whatsapp = whatsappHref(settings?.whatsapp);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    const parsed = contactSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSubmitError(null);
    setStatus("sending");
    const { error } = await supabase.from("contact_messages").insert(parsed.data);
    if (error) {
      setStatus("idle");
      setSubmitError(errorMessage(error, "Your message didn't send. Try again."));
      return;
    }
    setStatus("sent");
  }

  const set =
    (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));

  return (
    <StaticPage title="Talk to us" intro="Sizes, orders, collabs. We reply within a day.">
      {whatsapp ? (
        <p>
          Quickest way:{" "}
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary underline"
          >
            message us on WhatsApp
          </a>
          .
        </p>
      ) : null}
      {status === "sent" ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border-2 border-success p-5"
        >
          <CheckCircle2 className="size-6 shrink-0 text-success" aria-hidden="true" />
          <div>
            <p className="font-semibold">Message sent.</p>
            <p className="text-sm text-muted-foreground">We'll get back to {values.email} soon.</p>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4 rounded-2xl bg-card p-6">
          <div>
            <label htmlFor="c-name" className="mb-1 block text-sm font-semibold">
              Name
            </label>
            <Input
              id="c-name"
              autoComplete="name"
              value={values.name}
              onChange={set("name")}
              aria-invalid={!!errors["name"]}
              aria-describedby="c-name-err"
            />
            <FieldError id="c-name-err" message={errors["name"]} />
          </div>
          <div>
            <label htmlFor="c-email" className="mb-1 block text-sm font-semibold">
              Email
            </label>
            <Input
              id="c-email"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={set("email")}
              aria-invalid={!!errors["email"]}
              aria-describedby="c-email-err"
            />
            <FieldError id="c-email-err" message={errors["email"]} />
          </div>
          <div>
            <label htmlFor="c-message" className="mb-1 block text-sm font-semibold">
              Message
            </label>
            <Textarea
              id="c-message"
              rows={5}
              value={values.message}
              onChange={set("message")}
              aria-invalid={!!errors["message"]}
              aria-describedby="c-message-err"
            />
            <FieldError id="c-message-err" message={errors["message"]} />
          </div>
          {submitError ? (
            <p role="alert" className="text-sm font-semibold text-destructive">
              {submitError}
            </p>
          ) : null}
          <Button type="submit" size="lg" disabled={status === "sending"}>
            {status === "sending" ? "Sending…" : "Send message"}
          </Button>
        </form>
      )}
    </StaticPage>
  );
}
