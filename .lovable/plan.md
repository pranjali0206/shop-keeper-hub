# Protected shop admin

## What will be built
- Create a protected `/admin` workspace with a sign-in/sign-up page, owner/staff-aware navigation, and dashboard for today's order count, revenue, and low-stock products.
- Add working product management (including multiple product images and size stock), categories/navigation order, three-item Party Packs, linked numbered pins on a festive banner, shop copy/settings, order status management, and staff invitations.
- Keep access rules enforced in the database: separate `user_roles` table, security-definer role check, row-level policies, and owner-only staff/settings controls. The verified account `pranjalishandilya15@gmail.com` receives the initial owner role.
- Use Lovable Cloud Storage for product and banner images, and validate editable fields before saving.

## Implementation outline
1. Add the role, catalog, order, settings, bundle, and banner-pin schema with grants, row-level security, role-check/owner-bootstrap functions, and initial-owner verification trigger. Create a public-read, role-write image bucket.
2. Add login and registration, protected admin shell, role-aware navigation, and typed server functions for owner-only staff management.
3. Build the requested admin pages and database-backed workflows with the existing component library and semantic dark design tokens.
4. Add focused tests for access/role constraints and verify the routing, preview, database migration, storage access rules, and build status.

## Technical details
- TanStack Start file routes: `/admin` pages remain under the authenticated route layout; `/auth` is public; `/` forwards to `/admin`.
- Database policies are the security boundary for all product, bundle, order, category, banner, and settings changes; hiding links alone is not authorization.
- The first owner role is granted only after Cloud Auth confirms the exact initial email. New staff join through an owner-only invitation action.
