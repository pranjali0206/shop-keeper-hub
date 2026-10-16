const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const inrPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ₹1,499 for whole rupees, ₹1,499.50 when there are paise. */
export function formatINR(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return Number.isInteger(n) ? inr.format(n) : inrPaise.format(n);
}

export function discountPercent(price: number, compareAt: number | null | undefined) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export function formatDate(
  value: string | Date,
  opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
) {
  return new Intl.DateTimeFormat("en-IN", opts).format(new Date(value));
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Pull a readable message out of Supabase / Postgres / unknown errors. */
export function errorMessage(error: unknown, fallback = "Something went wrong. Try again.") {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: unknown }).message);
    if (message && !/^fetch failed|^TypeError/i.test(message)) return message;
  }
  return fallback;
}
