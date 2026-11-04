# MotoSpare — Multi-vendor Motorcycle Spare Parts Marketplace

A responsive React + TypeScript + Vite frontend prototype based on the attached MotoSpare project specification.

## Run locally on macOS

1. Install Node.js LTS from https://nodejs.org/
2. Extract this ZIP and open the folder in VS Code.
3. In Terminal, run:

```bash
npm install
npm run dev
```

4. Open the localhost URL Vite prints (usually http://localhost:5173).

Build verification:

```bash
npm run build
```

## Included
- Marketplace homepage with searchable/filterable sample inventory, category and brand selection.
- Product details via clickable product cards.
- Wishlist, cart quantity management, subtotal, mock coupon entry.
- Bike garage selection UI.
- Buyer, seller and admin portal navigation and dashboard views.
- Seller product listing creation UI (prototype).
- Auth screens with form validation UI.
- Responsive navigation and layouts.
- React Router, TanStack Query, React Hook Form, Zod, Tailwind CSS, shadcn/ui-compatible setup, Lucide icons.
- Dedicated service layer and typed mock data.

## Not yet connected
This is a frontend prototype with mock data. Real backend/database persistence, OTP/authentication, seller approval enforcement, server-side role checks, payment gateway, shipping integration, notifications, and secure file uploads must be implemented in backend. No secrets are embedded.


## Supabase backend scaffold

The project now includes Supabase client wiring, authentication helpers, database-backed product reads (with demo-data fallback when Supabase env vars are absent), seller listing creation, buyer order creation/listing, and an initial schema with RLS policies.

### Configure Supabase
1. Create a project at https://supabase.com/.
2. In Supabase Dashboard → SQL Editor, run `supabase/schema.sql`.
3. Copy the Project URL and anon/public key from Project Settings → API.
4. Copy `.env.example` to `.env` and fill:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Install and start:
```bash
npm install
npm run dev
```

### Important implementation notes
- The Supabase anon key is designed for client use only when RLS is enabled. Never add the `service_role` key to frontend env variables.
- Admin role is not selectable during public registration. Grant it only to a verified account using the SQL example in `supabase/schema.sql`.
- Seller listings require seller account approval before insert; admins can approve/reject using trusted dashboard or future admin backend actions.
- Payment capture, server-validated inventory/price, shipping integration, storage bucket policies, admin UI workflows, and production checkout are not yet implemented.
- The current page components still contain prototype auth/dashboard behavior; the service layer is prepared, but the UI needs wiring to these service functions in a follow-on step.

### Seller approval for development/testing
A new seller is created with `approval_status = 'pending'`. After reviewing the account, a trusted admin can approve the seller in Supabase SQL Editor, substituting the authenticated user's UUID:

```sql
update public.seller_profiles
set approval_status = 'approved'
where user_id = 'SELLER_AUTH_USER_UUID';
```

Product listings remain pending approval and do not appear publicly until an admin changes their `products.status` to `active`. Admin workflows are not yet available in the UI.
\nIf you already applied the earlier schema version, also run `supabase/migrations/20261104_seller_listing_delete.sql` in Supabase SQL Editor to update the seller-owned delete policy.\n
## Priority 2 — Buyer Marketplace

This implementation adds cart persistence in browser local storage, delivery-address checkout, buyer order history, and order creation through a Supabase RPC. The RPC calculates item prices from active database products and locks/decrements stock atomically; checkout does not submit a client-authoritative price. Payment gateway and shipping-charge calculation are not included yet; created orders remain `pending`.

### Apply Priority 2 database migration

After applying the base `supabase/schema.sql` and Priority 1 migrations, run this file in Supabase Dashboard → SQL Editor:

`supabase/migrations/20261104_priority2_buyer_marketplace.sql`

Then configure `.env` with your Supabase project URL and anon key, run `npm install`, and `npm run dev`. Sign in as a buyer before placing an order. Order history is available from Account → My Orders.

### Buyer marketplace scope

- Cart: quantity changes/removal and persisted cart state.
- Checkout: delivery form, basic phone/PIN validation, order summary, pending order confirmation.
- Orders: buyer-owned order history and line items.
- Catalog: existing product search, brand/category filters and category navigation.

Note: apply the SQL migration to Supabase for checkout to work. Local demo products without Supabase are browseable, but order placement requires Supabase and authenticated database product rows.
