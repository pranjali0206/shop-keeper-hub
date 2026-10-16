import { ZoomIn } from "lucide-react";
import { useState, type MouseEvent } from "react";

import { GarmentIllustration } from "@/components/common/GarmentIllustration";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { GarmentKind } from "@/lib/catalog";
import type { ProductImage } from "@/lib/data";
import { cn } from "@/lib/utils";

export function ProductGallery({
  images,
  name,
  garment,
  color,
  seed,
}: {
  images: ProductImage[];
  name: string;
  garment: GarmentKind;
  color: string | null;
  seed: string;
}) {
  const [index, setIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [origin, setOrigin] = useState<string | null>(null);
  const current = images[index];

  const onMove = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  };

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      {images.length > 1 ? (
        <ul className="flex gap-2 overflow-x-auto md:flex-col" aria-label="Product images">
          {images.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                aria-current={i === index}
                className={cn(
                  "block w-16 overflow-hidden rounded-lg border-2 md:w-20",
                  i === index ? "border-primary" : "border-transparent",
                )}
              >
                <img
                  src={img.url}
                  alt=""
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="relative flex-1">
        {current ? (
          <button
            type="button"
            onClick={() => setZoomOpen(true)}
            onMouseMove={onMove}
            onMouseLeave={() => setOrigin(null)}
            className="group block w-full cursor-zoom-in overflow-hidden rounded-2xl bg-muted"
            aria-label={`Zoom image: ${current.alt || name}`}
          >
            <img
              src={current.url}
              alt={current.alt || name}
              className="aspect-[4/5] w-full object-cover transition-transform duration-200 motion-reduce:transition-none"
              style={origin ? { transform: "scale(1.8)", transformOrigin: origin } : undefined}
            />
            <span
              className="absolute bottom-3 right-3 inline-flex size-11 items-center justify-center rounded-full bg-card/90 text-card-foreground"
              aria-hidden="true"
            >
              <ZoomIn className="size-5" />
            </span>
          </button>
        ) : (
          <div className="aspect-[4/5] overflow-hidden rounded-2xl">
            <GarmentIllustration kind={garment} color={color} seed={seed} label={name} />
          </div>
        )}
      </div>

      {current ? (
        <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
          <DialogContent className="max-w-4xl p-2">
            <DialogTitle className="sr-only">{name}</DialogTitle>
            <DialogDescription className="sr-only">Full-size product image</DialogDescription>
            <img
              src={current.url}
              alt={current.alt || name}
              className="max-h-[85vh] w-full rounded-lg object-contain"
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
