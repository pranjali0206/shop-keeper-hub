import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, UserMinus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AdminPageHeader,
  ConfirmAction,
  Field,
  LoadingRows,
  SubmitButton,
  fieldAria,
} from "@/components/admin/AdminUI";
import { EmptyState, ErrorState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { requireOwner } from "@/lib/admin";
import { useAuth } from "@/lib/auth";
import { errorMessage, formatDate } from "@/lib/format";
import { emailSchema } from "@/lib/validation";

export const Route = createFileRoute("/admin/staff")({
  beforeLoad: ({ context }) => requireOwner(context),
  component: StaffPage,
});

function StaffPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const staff = useQuery({
    queryKey: ["admin", "staff"],
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_staff");
      if (error) throw error;
      return data;
    },
  });
  const invites = useQuery({
    queryKey: ["admin", "staff-invites"],
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_invites")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["admin"] });
  const signUpLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth?redirect=/admin`
      : "/auth?redirect=/admin";

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    setBusy(true);
    const { data, error } = await supabase.rpc("grant_staff_by_email", { _email: parsed.data });
    setBusy(false);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    setEmail("");
    if (data === "granted") toast.success(`${parsed.data} now has staff access`);
    else
      toast.success(
        `Invite saved. Ask ${parsed.data} to create an account with this email; access turns on once they confirm it.`,
      );
    refresh();
  }

  const activeEmails = new Set((staff.data ?? []).map((s) => s.email.toLowerCase()));
  const pending = (invites.data ?? []).filter((i) => !activeEmails.has(i.email));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Staff"
        description="Staff manage products, categories, Party Packs, the banner and orders. Only you can change settings and staff."
      />

      <form
        onSubmit={invite}
        noValidate
        className="flex flex-wrap items-end gap-3 rounded-2xl bg-card p-5 shadow-sm"
      >
        <Field id="staff-email" label="Invite by email" error={error} className="min-w-64 flex-1">
          <Input
            id="staff-email"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            {...fieldAria("staff-email", error)}
          />
        </Field>
        <SubmitButton busy={busy}>Give staff access</SubmitButton>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void navigator.clipboard?.writeText(signUpLink).then(
              () => toast.success("Sign-up link copied"),
              () => toast.error("Couldn't copy. The link is " + signUpLink),
            );
          }}
        >
          <Copy className="size-4" aria-hidden="true" /> Copy sign-up link
        </Button>
      </form>

      <section aria-labelledby="team-h" className="rounded-2xl bg-card p-5 shadow-sm">
        <h2 id="team-h" className="mb-4 text-xl">
          Team
        </h2>
        {staff.isPending ? (
          <LoadingRows rows={2} />
        ) : staff.isError ? (
          <ErrorState error={staff.error} onRetry={() => void staff.refetch()} />
        ) : staff.data.length === 0 ? (
          <EmptyState title="No team members yet" />
        ) : (
          <ul className="divide-y">
            {staff.data.map((m) => (
              <li
                key={`${m.user_id}-${m.role}`}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="font-semibold">
                    {m.email}
                    {m.user_id === user?.id ? (
                      <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                    ) : null}
                  </p>
                  <p className="text-sm capitalize text-muted-foreground">
                    {m.role} · since {formatDate(m.created_at)}
                  </p>
                </div>
                {m.role === "staff" ? (
                  <ConfirmAction
                    title={`Remove ${m.email}?`}
                    description="They keep their customer account but lose access to the admin panel immediately."
                    confirmLabel="Remove access"
                    onConfirm={async () => {
                      const { error } = await supabase.rpc("revoke_staff", { _user_id: m.user_id });
                      if (error) throw error;
                      toast.success(`${m.email} no longer has staff access`);
                      refresh();
                    }}
                    trigger={
                      <Button variant="outline">
                        <UserMinus className="size-4" aria-hidden="true" /> Remove access
                      </Button>
                    }
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="pending-h" className="rounded-2xl bg-card p-5 shadow-sm">
        <h2 id="pending-h" className="mb-1 text-xl">
          Waiting to sign up
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          These people get staff access as soon as they create an account and confirm their email.
        </p>
        {invites.isPending ? (
          <LoadingRows rows={1} />
        ) : invites.isError ? (
          <ErrorState error={invites.error} onRetry={() => void invites.refetch()} />
        ) : pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending invites.</p>
        ) : (
          <ul className="divide-y">
            {pending.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-3">
                <span>
                  <span className="block font-semibold">{i.email}</span>
                  <span className="block text-sm text-muted-foreground">
                    Invited {formatDate(i.created_at)}
                  </span>
                </span>
                <ConfirmAction
                  title={`Cancel invite for ${i.email}?`}
                  description="They won't get staff access when they sign up."
                  confirmLabel="Cancel invite"
                  onConfirm={async () => {
                    const { error } = await supabase.from("staff_invites").delete().eq("id", i.id);
                    if (error) throw error;
                    toast.success("Invite cancelled");
                    refresh();
                  }}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label={`Cancel invite for ${i.email}`}>
                      <X className="size-4" aria-hidden="true" />
                    </Button>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
