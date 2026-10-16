// Display-side cart maths. The order total that is actually charged is
// recomputed by the place_order database function from current prices.

export type PricedLine = {
  price: number;
  qty: number;
  groupKey: string | null;
  bundlePrice: number | null;
};

export function cartSubtotal(lines: PricedLine[]) {
  let subtotal = 0;
  const countedGroups = new Set<string>();
  for (const line of lines) {
    if (line.groupKey && line.bundlePrice != null) {
      if (countedGroups.has(line.groupKey)) continue;
      countedGroups.add(line.groupKey);
      subtotal += line.bundlePrice * line.qty;
    } else {
      subtotal += line.price * line.qty;
    }
  }
  return Math.round(subtotal * 100) / 100;
}

export function shippingFor(subtotal: number, freeShippingMin: number, fee: number) {
  if (subtotal <= 0) return 0;
  return subtotal >= freeShippingMin ? 0 : fee;
}

export function freeShippingProgress(subtotal: number, freeShippingMin: number) {
  const remaining = Math.max(0, Math.ceil(freeShippingMin - subtotal));
  const percent =
    freeShippingMin <= 0 ? 100 : Math.min(100, Math.round((subtotal / freeShippingMin) * 100));
  return { remaining, percent, unlocked: remaining === 0 };
}

/**
 * Rough delivery estimate from the pincode's distance to the shop's pincode.
 * Same district prefix (3 digits) is local, same postal region (first digit)
 * is regional, everything else ships national.
 */
export function deliveryEstimate(
  pincode: string,
  shopPincode: string | null | undefined,
  from = new Date(),
) {
  const shop = shopPincode && /^[1-9][0-9]{5}$/.test(shopPincode) ? shopPincode : null;
  let range: [number, number] = [4, 7];
  if (shop && pincode.slice(0, 3) === shop.slice(0, 3)) range = [1, 2];
  else if (shop && pincode[0] === shop[0]) range = [2, 4];
  const add = (days: number) => {
    const d = new Date(from);
    d.setDate(d.getDate() + days);
    return d;
  };
  return { minDays: range[0], maxDays: range[1], earliest: add(range[0]), latest: add(range[1]) };
}
