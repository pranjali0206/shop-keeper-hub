import { AlertTriangle, PackageOpen } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ErrorState({
  title = "That didn't load",
  error,
  onRetry,
  className,
}: {
  title?: string;
  error?: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center",
        className,
      )}
    >
      <AlertTriangle className="size-8 text-destructive" aria-hidden="true" />
      <p className="font-display text-lg">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {errorMessage(error, "Check your connection and try again.")}
      </p>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
  icon,
  className,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center",
        className,
      )}
    >
      {icon ?? <PackageOpen className="size-8 text-muted-foreground" aria-hidden="true" />}
      <p className="font-display text-lg">{title}</p>
      {children ? <div className="max-w-sm text-sm text-muted-foreground">{children}</div> : null}
      {action}
    </div>
  );
}

export function ProductGridSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("grid grid-cols-2 gap-4 lg:grid-cols-4", className)}
      aria-busy="true"
      aria-label="Loading products"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-[4/5] w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-sm font-medium text-destructive">
      {message}
    </p>
  );
}
