import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AdminPageHeader, ConfirmAction, LoadingRows } from "@/components/admin/AdminUI";
import { EmptyState, ErrorState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/messages")({
  component: MessagesPage,
});

function MessagesPage() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["admin", "messages"],
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <AdminPageHeader title="Messages" description="From the contact form." />
      {isPending ? (
        <LoadingRows />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.length === 0 ? (
        <EmptyState
          title="Inbox zero"
          icon={<Mail className="size-8 text-muted-foreground" aria-hidden="true" />}
        >
          New contact form messages land here.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {data.map((m) => (
            <li key={m.id} className="rounded-2xl bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{m.name}</p>
                  <a
                    href={`mailto:${m.email}`}
                    className="text-sm font-semibold text-primary underline"
                  >
                    {m.email}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(m.created_at, { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <ConfirmAction
                  title="Delete this message?"
                  description="This can't be undone."
                  onConfirm={async () => {
                    const { error } = await supabase
                      .from("contact_messages")
                      .delete()
                      .eq("id", m.id);
                    if (error) throw error;
                    toast.success("Message deleted");
                    void queryClient.invalidateQueries({ queryKey: ["admin", "messages"] });
                  }}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete message from ${m.name}`}
                    >
                      <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                    </Button>
                  }
                />
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm">{m.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
