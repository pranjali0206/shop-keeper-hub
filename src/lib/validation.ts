import { z } from "zod";

// Client-side schemas. The database re-checks the same rules (check constraints
// and place_order validation), so these exist for fast inline feedback.

export const pincodeSchema = z
  .string()
  .trim()
  .regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit pincode");

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9][0-9]{9}$/, "Enter a valid 10-digit mobile number");

export const emailSchema = z.string().trim().email("Enter a valid email address").max(255);

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use 72 characters or fewer");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80, "Name is too long"),
  phone: phoneSchema,
  pincode: pincodeSchema,
  line: z
    .string()
    .trim()
    .min(5, "Enter your house number, street and area")
    .max(200, "Address is too long"),
  city: z.string().trim().min(2, "Enter your city").max(60),
  state: z.string().trim().min(2, "Choose your state").max(60),
  paymentMethod: z.enum(["upi", "card", "cod"], {
    errorMap: () => ({ message: "Choose a payment method" }),
  }),
  saveAddress: z.boolean(),
});
export type CheckoutValues = z.infer<typeof checkoutSchema>;

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: emailSchema,
  message: z.string().trim().min(10, "Tell us a little more (10 characters minimum)").max(2000),
});

const slug = z
  .string()
  .trim()
  .min(1, "Add a URL slug")
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes");

const money = z.coerce
  .number({ invalid_type_error: "Enter an amount" })
  .positive("Must be more than 0")
  .max(1_000_000, "That is too high");

export const productSchema = z
  .object({
    name: z.string().trim().min(2, "Add a product name").max(120),
    slug,
    description: z.string().trim().max(4000),
    category_id: z.string().uuid("Choose a category"),
    fit: z.string().trim().max(40),
    fabric: z.string().trim().max(40),
    color: z.string().trim().max(40),
    price: money,
    compare_at_price: z.union([money, z.literal("").transform(() => null), z.null()]),
    badges: z.array(z.enum(["new", "bestseller", "low-stock", "sale"])),
    tags: z.array(z.string().trim().min(1).max(30)).max(12),
    care: z.string().trim().max(400),
    model_height: z.string().trim().max(20),
    model_size: z.string().trim().max(12),
    is_bestseller: z.boolean(),
    is_published: z.boolean(),
  })
  .refine((v) => v.compare_at_price == null || v.compare_at_price > v.price, {
    message: "Compare-at price must be higher than the price",
    path: ["compare_at_price"],
  });
export type ProductFormValues = z.input<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Add a name").max(60),
  slug,
  parent_id: z.string().uuid().nullable(),
  show_in_nav: z.boolean(),
});

export const bundleSchema = z.object({
  name: z.string().trim().min(2, "Add a pack name").max(80),
  description: z.string().trim().max(300),
  price: money,
  is_published: z.boolean(),
  productIds: z.array(z.string().uuid()).length(3, "Pick exactly 3 products"),
});

export const settingsSchema = z.object({
  shop_name: z.string().trim().min(2, "Add the shop name").max(80),
  address: z.string().trim().min(5, "Add the address").max(300),
  phone: z.string().trim().min(6, "Add a phone number").max(40),
  opening_hours: z.string().trim().max(120),
  whatsapp: z
    .string()
    .trim()
    .regex(/^[0-9]{10,15}$/, "Digits only with country code, e.g. 919876543210"),
  instagram: z.union([
    z.string().trim().url("Use a full link, e.g. https://instagram.com/sol"),
    z.literal(""),
  ]),
  pincode: z.union([pincodeSchema, z.literal("")]),
  free_shipping_min: z.coerce.number().min(0, "Cannot be negative").max(100000),
  shipping_fee: z.coerce.number().min(0, "Cannot be negative").max(10000),
  return_days: z.coerce.number().int("Whole days only").min(0).max(90),
  cod_enabled: z.boolean(),
});

export const storefrontCopySchema = z.object({
  announcement_text: z.string().trim().max(120, "Keep it under 120 characters"),
  hero_headline: z.string().trim().min(2, "Add a headline").max(60, "Keep it under 60 characters"),
  hero_subtext: z.string().trim().max(160, "Keep it under 160 characters"),
});

/** Map zod issues to { field: message } for inline errors. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;
