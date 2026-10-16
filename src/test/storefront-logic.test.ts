import { describe, expect, it } from "vitest";

import { requireOwner } from "@/lib/admin";
import { mergeLines, type CartLine } from "@/lib/cart";
import { cartSubtotal, deliveryEstimate, freeShippingProgress, shippingFor } from "@/lib/pricing";
import {
  filtersFromSearch,
  parseSearch,
  stringifySearch,
  toggleInList,
  validateShopSearch,
} from "@/lib/search-params";
import { checkoutSchema, fieldErrors, pincodeSchema } from "@/lib/validation";

const line = (over: Partial<CartLine>): CartLine => ({
  key: "|p1|M",
  productId: "p1",
  slug: "tee",
  name: "Tee",
  size: "M",
  qty: 1,
  price: 699,
  image: null,
  imageAlt: "Tee",
  garment: "tee",
  color: "black",
  maxQty: 10,
  bundleId: null,
  bundleName: null,
  bundlePrice: null,
  groupKey: null,
  ...over,
});

describe("free-shipping bar", () => {
  it("asks for ₹300 more at ₹699 and unlocks at ₹999", () => {
    expect(freeShippingProgress(699, 999)).toMatchObject({ remaining: 300, unlocked: false });
    expect(freeShippingProgress(999, 999)).toMatchObject({
      remaining: 0,
      unlocked: true,
      percent: 100,
    });
    expect(freeShippingProgress(998.5, 999).remaining).toBe(1);
  });

  it("charges the fee only below the threshold", () => {
    expect(shippingFor(998, 999, 79)).toBe(79);
    expect(shippingFor(999, 999, 79)).toBe(0);
    expect(shippingFor(0, 999, 79)).toBe(0);
  });
});

describe("cart pricing", () => {
  it("counts a Party Pack once at its pack price", () => {
    const group = {
      bundleId: "b1",
      bundleName: "Club Night",
      bundlePrice: 5499,
      groupKey: "b1:M-32-L",
    };
    const lines = [
      line({ key: "a", price: 1699, ...group }),
      line({ key: "b", productId: "p2", price: 1999, ...group }),
      line({ key: "c", productId: "p3", price: 2999, ...group }),
      line({ key: "d", productId: "p4", price: 599, qty: 2 }),
    ];
    expect(cartSubtotal(lines)).toBe(5499 + 1198);
    expect(cartSubtotal(lines.map((l) => (l.groupKey ? { ...l, qty: 2 } : l)))).toBe(
      5499 * 2 + 1198,
    );
  });
});

describe("cart merge on sign-in", () => {
  it("keeps browser items, adds saved ones and takes the larger quantity", () => {
    const local = [line({ key: "x", qty: 1 }), line({ key: "y", productId: "p2", qty: 3 })];
    const saved = [line({ key: "x", qty: 2 }), line({ key: "z", productId: "p3", qty: 1 })];
    const merged = mergeLines(local, saved);
    expect(merged.map((l) => [l.key, l.qty])).toEqual([
      ["x", 2],
      ["y", 3],
      ["z", 1],
    ]);
  });
});

describe("checkout validation", () => {
  const valid = {
    name: "Ravi Kumar",
    phone: "9876543210",
    pincode: "400050",
    line: "Flat 4B, Sunrise Apartments",
    city: "Mumbai",
    state: "Maharashtra",
    paymentMethod: "upi",
    saveAddress: true,
  };

  it("accepts a complete form", () => {
    expect(checkoutSchema.safeParse(valid).success).toBe(true);
  });

  it("gives an inline message per bad field", () => {
    const res = checkoutSchema.safeParse({
      ...valid,
      name: "",
      phone: "12345",
      pincode: "012345",
      paymentMethod: "",
    });
    expect(res.success).toBe(false);
    if (res.success) return;
    const errs = fieldErrors(res.error);
    expect(errs["name"]).toBe("Enter your full name");
    expect(errs["phone"]).toBe("Enter a valid 10-digit mobile number");
    expect(errs["pincode"]).toBe("Enter a valid 6-digit pincode");
    expect(errs["paymentMethod"]).toBe("Choose a payment method");
  });

  it("validates the store-locator pincode", () => {
    expect(pincodeSchema.safeParse("400050").success).toBe(true);
    expect(pincodeSchema.safeParse("40005").success).toBe(false);
    expect(pincodeSchema.safeParse("abcdef").success).toBe(false);
  });
});

describe("catalog filters in the URL", () => {
  it("survive a reload: stringify then parse gives the same filters", () => {
    let search = validateShopSearch({});
    search = toggleInList(search, "size", "32");
    search = toggleInList(search, "size", "34");
    search = toggleInList(search, "fit", "baggy");
    search = { ...search, sort: "price-asc", price: "1000-1999" };
    const url = stringifySearch(search);
    expect(url).toBe("?size=32%2C34&fit=baggy&sort=price-asc&price=1000-1999");
    const reloaded = validateShopSearch(parseSearch(url));
    expect(reloaded).toEqual(search);
    expect(filtersFromSearch(reloaded)).toMatchObject({
      size: ["32", "34"],
      fit: ["baggy"],
      sort: "price-asc",
    });
  });

  it("drops unknown or malformed params", () => {
    expect(validateShopSearch({ sort: "cheapest", evil: "x", size: "" })).toEqual({});
  });
});

describe("admin access", () => {
  it("sends staff away from owner-only pages", () => {
    expect(() => requireOwner({ isOwner: false })).toThrow();
    expect(() => requireOwner({ isOwner: true })).not.toThrow();
  });
});

describe("delivery estimate", () => {
  it("is fastest in the shop's own district", () => {
    expect(deliveryEstimate("400051", "400050")).toMatchObject({ minDays: 1, maxDays: 2 });
    expect(deliveryEstimate("411001", "400050")).toMatchObject({ minDays: 2, maxDays: 4 });
    expect(deliveryEstimate("110001", "400050")).toMatchObject({ minDays: 4, maxDays: 7 });
  });
});
