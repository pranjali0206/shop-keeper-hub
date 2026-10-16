import { ImagePlus, Loader2 } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/format";
import { uploadImage } from "@/lib/storage";
import { cn } from "@/lib/utils";

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string | undefined;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 print:hidden">
      <div>
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
        {description ? <p className="mt-1 text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

/** Wraps a destructive action in a confirmation dialog. */
export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11">Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={busy}
            onClick={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await onConfirm();
                setOpen(false);
              } catch (err) {
                toast.error(errorMessage(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Working…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** File picker that uploads straight to storage and hands back public URLs. */
export function ImageUploadButton({
  folder,
  multiple = false,
  onUploaded,
  label = "Upload image",
  className,
}: {
  folder: string;
  multiple?: boolean;
  onUploaded: (files: { url: string; path: string; name: string }[]) => void;
  label?: string;
  className?: string;
}) {
  const inputId = useId();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handle(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    const done: { url: string; path: string; name: string }[] = [];
    for (const file of Array.from(files)) {
      try {
        const res = await uploadImage(file, folder);
        done.push({ ...res, name: file.name.replace(/\.[^.]+$/, "") });
      } catch (err) {
        toast.error(errorMessage(err, `${file.name} didn't upload`));
      }
    }
    setBusy(false);
    if (ref.current) ref.current.value = "";
    if (done.length) {
      onUploaded(done);
      toast.success(done.length === 1 ? "Image uploaded" : `${done.length} images uploaded`);
    }
  }

  return (
    <div className={className}>
      <input
        ref={ref}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple={multiple}
        hidden
        onChange={(e) => void handle(e.target.files)}
        disabled={busy}
      />
      <Button type="button" variant="outline" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <ImagePlus className="size-4" aria-hidden="true" />
        )}
        {busy ? "Uploading…" : label}
      </Button>
    </div>
  );
}

export function Field({
  id,
  label,
  error,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-err`} className="mt-1 text-sm font-semibold text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const fieldAria = (id: string, error: string | undefined) => ({
  "aria-invalid": !!error,
  "aria-describedby": error ? `${id}-err` : `${id}-hint`,
});

export function Toggle({
  id,
  label,
  checked,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-lg border p-3"
    >
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 accent-[var(--primary)]"
      />
    </label>
  );
}

export function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

export function SubmitButton({
  busy,
  children,
  ...props
}: { busy: boolean; children: ReactNode } & React.ComponentProps<typeof Button>) {
  return (
    <Button type="submit" disabled={busy} {...props}>
      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </Button>
  );
}
