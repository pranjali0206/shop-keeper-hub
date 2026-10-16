import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { FieldError } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/format";
import { passwordSchema } from "@/lib/validation";

export const Route = createFileRoute("/_store/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password | SOL" },
      { name: "description", content: "Choose a new password for your S.O.L account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = passwordSchema.safeParse(password);
    const next: Record<string, string> = {};
    if (!parsed.success)
      next["password"] = parsed.error.issues[0]?.message ?? "Choose a stronger password";
    if (password !== confirm) next["confirm"] = "Passwords don't match";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    toast.success("Password updated");
    void navigate({ to: "/account/orders" });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-4xl">Set a new password</h1>
      <div className="mt-8 rounded-2xl bg-card p-6 shadow-sm">
        {loading ? (
          <p>Checking your link…</p>
        ) : !user ? (
          <div className="space-y-3">
            <p>This reset link has expired or was already used.</p>
            <Button asChild>
              <Link to="/auth">Request a new link</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-4">
            <div>
              <label htmlFor="new-password" className="mb-1 block text-sm font-semibold">
                New password
              </label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!errors["password"]}
                aria-describedby="new-password-err"
              />
              <FieldError id="new-password-err" message={errors["password"]} />
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-1 block text-sm font-semibold">
                Confirm password
              </label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                aria-invalid={!!errors["confirm"]}
                aria-describedby="confirm-password-err"
              />
              <FieldError id="confirm-password-err" message={errors["confirm"]} />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? "Saving…" : "Save password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
