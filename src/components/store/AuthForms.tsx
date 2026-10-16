import { useState } from "react";

import { FieldError } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { emailSchema, fieldErrors, signInSchema, signUpSchema } from "@/lib/validation";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup" | "forgot";

function friendlyAuthError(message: string) {
  if (/invalid login credentials/i.test(message)) return "Email or password is wrong.";
  if (/email not confirmed/i.test(message))
    return "Confirm your email first. Check your inbox for the link.";
  if (/already registered|already exists/i.test(message))
    return "That email already has an account. Sign in instead.";
  if (/rate limit|too many/i.test(message)) return "Too many tries. Wait a minute and try again.";
  return message;
}

/**
 * Email + password sign-in, account creation and password reset.
 * `redirectPath` is where email links (confirmation, reset) send people back to.
 */
export function AuthForms({
  onSignedIn,
  redirectPath = "/",
  initialMode = "signin",
  idPrefix = "auth",
}: {
  onSignedIn?: () => void;
  redirectPath?: string;
  initialMode?: Mode;
  idPrefix?: string;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [values, setValues] = useState({ fullName: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const id = (k: string) => `${idPrefix}-${k}`;
  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));
  const switchMode = (m: Mode) => {
    setMode(m);
    setErrors({});
    setFormError(null);
    setNotice(null);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setFormError(null);
    setNotice(null);
    const origin = window.location.origin;

    if (mode === "forgot") {
      const parsed = emailSchema.safeParse(values.email);
      if (!parsed.success) {
        setErrors({ email: parsed.error.issues[0]?.message ?? "Enter a valid email address" });
        return;
      }
      setErrors({});
      setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
        redirectTo: `${origin}/reset-password`,
      });
      setBusy(false);
      if (error) setFormError(friendlyAuthError(error.message));
      else setNotice(`If ${parsed.data} has an account, a reset link is on its way.`);
      return;
    }

    if (mode === "signin") {
      const parsed = signInSchema.safeParse(values);
      if (!parsed.success) {
        setErrors(fieldErrors(parsed.error));
        return;
      }
      setErrors({});
      setBusy(true);
      const { error } = await supabase.auth.signInWithPassword(parsed.data);
      setBusy(false);
      if (error) setFormError(friendlyAuthError(error.message));
      else onSignedIn?.();
      return;
    }

    const parsed = signUpSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.fullName },
        emailRedirectTo: `${origin}${redirectPath}`,
      },
    });
    setBusy(false);
    if (error) {
      setFormError(friendlyAuthError(error.message));
    } else if (data.session) {
      onSignedIn?.();
    } else {
      setNotice(
        `Almost there. Tap the link we sent to ${parsed.data.email}, then sign in. Your cart is saved on this device.`,
      );
      setMode("signin");
    }
  }

  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m}
      onClick={() => switchMode(m)}
      className={cn(
        "h-11 flex-1 rounded-md text-sm font-bold",
        mode === m ? "bg-background shadow-sm" : "text-muted-foreground",
      )}
    >
      {label}
    </button>
  );

  return (
    <div>
      {mode !== "forgot" ? (
        <div
          role="tablist"
          aria-label="Account"
          className="mb-5 flex gap-1 rounded-lg bg-muted p-1"
        >
          {tab("signin", "Sign in")}
          {tab("signup", "Create account")}
        </div>
      ) : (
        <p className="mb-4 text-sm text-muted-foreground">
          Enter your email and we'll send you a link to set a new password.
        </p>
      )}

      <form onSubmit={submit} noValidate className="space-y-4">
        {mode === "signup" ? (
          <div>
            <label htmlFor={id("name")} className="mb-1 block text-sm font-semibold">
              Full name
            </label>
            <Input
              id={id("name")}
              autoComplete="name"
              value={values.fullName}
              onChange={set("fullName")}
              aria-invalid={!!errors["fullName"]}
              aria-describedby={id("name-err")}
            />
            <FieldError id={id("name-err")} message={errors["fullName"]} />
          </div>
        ) : null}
        <div>
          <label htmlFor={id("email")} className="mb-1 block text-sm font-semibold">
            Email
          </label>
          <Input
            id={id("email")}
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={set("email")}
            aria-invalid={!!errors["email"]}
            aria-describedby={id("email-err")}
          />
          <FieldError id={id("email-err")} message={errors["email"]} />
        </div>
        {mode !== "forgot" ? (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor={id("password")} className="text-sm font-semibold">
                Password
              </label>
              {mode === "signin" ? (
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="min-h-11 text-sm font-semibold text-primary underline"
                >
                  Forgot password?
                </button>
              ) : null}
            </div>
            <Input
              id={id("password")}
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={values.password}
              onChange={set("password")}
              aria-invalid={!!errors["password"]}
              aria-describedby={id("password-err")}
            />
            <FieldError id={id("password-err")} message={errors["password"]} />
          </div>
        ) : null}

        {formError ? (
          <p role="alert" className="text-sm font-semibold text-destructive">
            {formError}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="rounded-lg bg-muted p-3 text-sm">
            {notice}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in"
              : mode === "signup"
                ? "Create account"
                : "Send reset link"}
        </Button>
        {mode === "forgot" ? (
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className="min-h-11 w-full text-sm font-semibold text-primary underline"
          >
            Back to sign in
          </button>
        ) : null}
      </form>
    </div>
  );
}

/** Only allow same-site relative redirects. */
export function safeRedirect(value: unknown, fallback = "/") {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : fallback;
}
