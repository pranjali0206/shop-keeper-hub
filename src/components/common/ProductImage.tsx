import { useState } from "react";

import { GarmentIllustration } from "@/components/common/GarmentIllustration";
import type { GarmentKind } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/**
 * Every product image slot goes through here: a real uploaded photo when one
 * exists, otherwise a garment illustration. Swapping in photos needs no code.
 */
export function ProductImage({
  src,
  alt,
  garment,
  color,
  seed,
  className,
  imgClassName,
  eager = false,
  sizes = "(min-width: 1024px) 25vw, 50vw",
}: {
  src: string | null | undefined;
  alt: string;
  garment: GarmentKind;
  color: string | null | undefined;
  seed?: string;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          sizes={sizes}
          onError={() => setFailed(true)}
          className={cn("h-full w-full object-cover", imgClassName)}
        />
      ) : (
        <GarmentIllustration kind={garment} color={color} seed={seed ?? alt} label={alt} />
      )}
    </div>
  );
}
