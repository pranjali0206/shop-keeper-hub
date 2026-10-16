import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ProductImage } from "@/components/common/ProductImage";
import { Price } from "@/components/store/Price";
import { SizeSelector } from "@/components/store/SizeSelector";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCart } from "@/lib/cart";
import { garmentFor } from "@/lib/catalog";
import { totalStock, type ProductCard } from "@/lib/data";

export function QuickAddDialog({
  product,
  open,
  onOpenChange,
}: {
  product: ProductCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const cart = useCart();
  const [size, setSize] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setSize(null);
      setError(undefined);
    }
  }, [open, product?.id]);

  if (!product) return null;
  const soldOut = totalStock(product) === 0;

  function add() {
    if (!product) return;
    if (!size) {
      setError("Choose a size first");
      return;
    }
    const result = cart.addItem(product, size);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    onOpenChange(false);
    toast.success(`${product.name} (${size}) added to cart`, {
      action: { label: "View cart", onClick: () => cart.open() },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display pr-8 text-xl">{product.name}</DialogTitle>
          <DialogDescription>Pick your size to add it to the cart.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-4">
          <ProductImage
            src={product.product_images[0]?.url}
            alt={product.product_images[0]?.alt || product.name}
            garment={garmentFor(product.category?.slug, product.slug)}
            color={product.color}
            seed={product.slug}
            className="aspect-[4/5] w-24 shrink-0 rounded-lg"
            sizes="96px"
          />
          <Price price={product.price} compareAt={product.compare_at_price} />
        </div>
        <SizeSelector
          variants={product.product_variants}
          value={size}
          onChange={(s) => {
            setSize(s);
            setError(undefined);
          }}
          error={error}
        />
        <Button size="lg" onClick={add} disabled={soldOut} className="w-full">
          {soldOut ? "Sold out" : "Add to cart"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
