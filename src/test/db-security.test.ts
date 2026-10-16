// @vitest-environment node
//
// Runs the real migration in an in-memory Postgres (PGlite) with minimal
// stand-ins for Supabase's auth and storage schemas, then checks Row Level
// Security, role rules and server-side order maths as each kind of user.
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const MIGRATION = path.resolve(__dirname, "../../supabase/migrations/20261016120000_sol_store.sql");

const SUPABASE_STUB = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create schema storage;
grant usage on schema auth, storage to anon, authenticated;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to anon, authenticated;
`;

let db: PGlite;
const ids: Record<string, string> = {};

async function one<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  return (await db.query<T>(sql, params)).rows[0] as T;
}

async function as<T>(uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid ?? ""]);
  await db.exec(uid ? "set role authenticated" : "set role anon");
  try {
    return await fn();
  } finally {
    await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false)");
  }
}

const place = (
  items: unknown[],
  method = "upi",
  token: string | null = null,
  phone = "9876543210",
) =>
  db.query<{ order_id: string; order_number: string }>(
    "select * from place_order($1::jsonb, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
    [
      JSON.stringify(items),
      "Ravi Kumar",
      phone,
      "Flat 4B, Sunrise Apartments",
      "Mumbai",
      "Maharashtra",
      "400050",
      method,
      false,
      token,
    ],
  );

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  const sql = fs.readFileSync(MIGRATION, "utf8");
  await db.exec(sql);
  await db.exec(sql); // re-runnable
  for (const [key, email, confirmed] of [
    ["owner", "pranjalishandilya15@gmail.com", true],
    ["staff", "staff@example.com", true],
    ["a", "a@example.com", true],
    ["b", "b@example.com", true],
  ] as const) {
    const row = await one<{ id: string }>(
      `insert into auth.users (email, email_confirmed_at) values ($1, ${confirmed ? "now()" : "null"}) returning id`,
      [email],
    );
    ids[key] = row.id;
  }
  await as(ids["owner"]!, () => db.query("select grant_staff_by_email('staff@example.com')"));
  await db.exec("update product_variants set stock = 10");
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("seed data", () => {
  it("creates the catalog, packs, banner and settings", async () => {
    const c = await one<Record<string, number>>(`select
      (select count(*) from products)::int products, (select count(*) from bundles)::int bundles,
      (select count(*) from bundle_items)::int bundle_items, (select count(*) from banner_hotspots)::int pins,
      (select count(*) from store_settings)::int settings, (select count(*) from storage.buckets where id = 'product-images')::int bucket`);
    expect(c).toEqual({
      products: 24,
      bundles: 3,
      bundle_items: 9,
      pins: 4,
      settings: 1,
      bucket: 1,
    });
  });
});

describe("roles", () => {
  it("bootstraps the owner and invited staff from confirmed emails only", async () => {
    expect((await one<{ r: boolean }>("select has_role($1, 'owner') r", [ids["owner"]])).r).toBe(
      true,
    );
    expect((await one<{ r: boolean }>("select is_staff($1) r", [ids["staff"]])).r).toBe(true);
    expect((await one<{ r: boolean }>("select is_staff($1) r", [ids["a"]])).r).toBe(false);
  });

  it("does not let staff grant roles or edit settings", async () => {
    await as(ids["staff"]!, async () => {
      await expect(
        db.query("insert into user_roles (user_id, role) values ($1, 'owner')", [ids["staff"]]),
      ).rejects.toThrow(/row-level security/);
      expect((await db.query("update store_settings set shop_name = 'x'")).affectedRows).toBe(0);
      await expect(db.query("select * from list_staff()")).rejects.toThrow(/owner/);
    });
  });

  it("lets staff manage catalog but not customers", async () => {
    await as(ids["staff"]!, async () => {
      expect(
        (
          await db.query(
            "update products set description = description where slug = 'baggy-black-jeans'",
          )
        ).affectedRows,
      ).toBe(1);
    });
    await as(ids["a"]!, async () => {
      expect((await db.query("update products set price = 1")).affectedRows).toBe(0);
    });
    await as(null, async () => {
      await expect(
        db.query("insert into products (name, slug, price) values ('x', 'x', 1)"),
      ).rejects.toThrow();
    });
  });
});

describe("orders", () => {
  it("computes totals, Party Pack price and stock on the server", async () => {
    const p = Object.fromEntries(
      (
        await db.query<{ slug: string; id: string; price: string }>(
          "select slug, id, price from products",
        )
      ).rows.map((r) => [r.slug, r]),
    );
    const pack = await one<{ id: string; price: string }>(
      "select id, price from bundles where name = 'Campus Fit'",
    );
    const items = [
      { product_id: p["ribbed-slim-tee"]!.id, size: "M", qty: 1, price: 1 }, // client "price" is ignored
      ...["heavyweight-boxy-tee", "light-wash-baggy-jeans", "heavy-fleece-hoodie"].map((slug) => ({
        product_id: p[slug]!.id,
        size: slug.includes("jeans") ? "32" : "L",
        qty: 1,
        bundle_id: pack.id,
        group_key: "g1",
      })),
    ];
    const token = "11111111-1111-4111-8111-111111111111";
    const order = (await as(ids["a"]!, () => place(items, "upi", token))).rows[0]!;
    const saved = await one<{
      subtotal: string;
      shipping: string;
      total: string;
      status: string;
      payment_status: string;
    }>("select * from orders where id = $1", [order.order_id]);
    const expected = Number(p["ribbed-slim-tee"]!.price) + Number(pack.price);
    expect(Number(saved.subtotal)).toBe(expected);
    expect(Number(saved.shipping)).toBe(0);
    expect([saved.status, saved.payment_status]).toEqual(["pending", "demo"]);
    expect(
      (
        await one<{ stock: number }>(
          "select stock from product_variants where product_id = $1 and size = 'L'",
          [p["heavy-fleece-hoodie"]!.id],
        )
      ).stock,
    ).toBe(9);

    // Double submit with the same token returns the same order and does not touch stock again.
    const again = (await as(ids["a"]!, () => place(items, "upi", token))).rows[0]!;
    expect(again.order_id).toBe(order.order_id);
    expect(
      (
        await one<{ stock: number }>(
          "select stock from product_variants where product_id = $1 and size = 'L'",
          [p["heavy-fleece-hoodie"]!.id],
        )
      ).stock,
    ).toBe(9);

    // Below ₹999 pays the shipping fee.
    const small = (await as(ids["a"]!, () => place([items[0]], "cod"))).rows[0]!;
    expect(
      Number(
        (
          await one<{ shipping: string }>("select shipping from orders where id = $1", [
            small.order_id,
          ])
        ).shipping,
      ),
    ).toBe(79);

    // Tampered packs, bad phones, anonymous checkout and disabled COD are refused.
    await expect(as(ids["a"]!, () => place(items.slice(0, 3)))).rejects.toThrow(/Party Pack/);
    await expect(as(ids["a"]!, () => place(items, "upi", null, "12345"))).rejects.toThrow(/mobile/);
    await expect(as(null, () => place(items))).rejects.toThrow();
    await db.exec("update store_settings set cod_enabled = false");
    await expect(as(ids["a"]!, () => place([items[0]], "cod"))).rejects.toThrow(/Cash on delivery/);
    await db.exec("update store_settings set cod_enabled = true");
  });

  it("keeps one customer out of another customer's orders", async () => {
    const own = await as(ids["a"]!, () => one<{ n: number }>("select count(*)::int n from orders"));
    expect(own.n).toBeGreaterThan(0);
    await as(ids["b"]!, async () => {
      expect((await one<{ n: number }>("select count(*)::int n from orders")).n).toBe(0);
      expect((await one<{ n: number }>("select count(*)::int n from order_items")).n).toBe(0);
      expect(
        (
          await one<{ n: number }>(
            "select count(*)::int n from orders where order_number = 'SOL-1001'",
          )
        ).n,
      ).toBe(0);
    });
  });

  it("lets staff change status but never totals", async () => {
    await as(ids["a"]!, async () => {
      expect((await db.query("update orders set status = 'delivered'")).affectedRows).toBe(0);
    });
    await as(ids["staff"]!, async () => {
      expect(
        (await db.query("update orders set status = 'confirmed' where order_number = 'SOL-1001'"))
          .affectedRows,
      ).toBe(1);
      await expect(db.query("update orders set total = 1")).rejects.toThrow(/permission denied/);
    });
  });
});

describe("contact form", () => {
  it("accepts valid messages from anyone and validates on the server", async () => {
    await as(null, async () => {
      await db.query(
        "insert into contact_messages (name, email, message) values ('Ravi', 'ravi@example.com', 'Do you have size 38 in black?')",
      );
      await expect(
        db.query(
          "insert into contact_messages (name, email, message) values ('R', 'bad', 'short')",
        ),
      ).rejects.toThrow(/check constraint/);
    });
  });
});
