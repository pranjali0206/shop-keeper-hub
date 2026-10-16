import { supabase } from "@/integrations/supabase/client";

export const IMAGE_BUCKET = "product-images";
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export function validateImage(file: File): string | null {
  if (!TYPES.includes(file.type)) return `${file.name}: use JPG, PNG, WebP or AVIF`;
  if (file.size > MAX_BYTES) return `${file.name}: keep images under 5 MB`;
  return null;
}

/** Uploads to the product-images bucket (owner/staff only, enforced by storage policies). */
export async function uploadImage(
  file: File,
  folder: string,
): Promise<{ url: string; path: string }> {
  const problem = validateImage(file);
  if (problem) throw new Error(problem);
  const ext =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "jpg";
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`;
  const path = `${folder}/${id}.${ext}`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function removeImages(paths: (string | null | undefined)[]) {
  const clean = paths.filter((p): p is string => !!p);
  if (clean.length === 0) return;
  await supabase.storage.from(IMAGE_BUCKET).remove(clean);
}
