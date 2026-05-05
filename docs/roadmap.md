# HomeBites — Product Roadmap

## Current State (v0.1 — December 2024)

### Working Features

**Customer**
- Browse all active home restaurants
- Browse dishes across all restaurants (filtered by distance/delivery radius)
- Category filter chips (All, Indian, South Indian, North Indian, Mexican, Asian, Healthy, Vegan, Desserts)
- Address autocomplete via Nominatim geocoding
- Distance slider (1–75 miles) with per-restaurant delivery radius enforcement
- Add to cart with single-restaurant constraint
- Cart drawer (slide-in) with quantity controls and clear cart
- Checkout page with order summary (subtotal + 5% service fee + 8.25% tax)
- Optional contact info (email and/or phone) at checkout
- Guest checkout supported (no login required to order)
- Order confirmation page
- Email notification on order placed (via Resend)

**Home Restaurant (Chef)**
- Signup and onboarding flow (restaurant name, cuisine, address, delivery radius, notification email)
- Add / edit / delete dishes with optional photo upload (Supabase Storage)
- Incoming orders table (placed → ready → completed status flow)
- Email notification to chef on new order
- Email notification to customer when order marked ready

---

## Known Bugs

- Currency symbol inconsistency: restaurant menu shows `₹`, all other views show `$`
- NavBar "Profile" link (`/dashboard/home-restaurant/profile`) leads to a 404 — page not built yet
- AI search ("Ask AI" button on customer dashboard) does nothing — feature not implemented
- `FloatingCartButton` component exists but is not wired into any route
- Customer dashboard shows dishes only when a location is set and `distance_km` is calculable — restaurants without coordinates are hidden even if they exist

---

## Backlog

### High Priority

- [ ] **Fix currency symbol** — pick `$` or `₹` and apply consistently everywhere (pages + emails)
- [ ] **Build Profile page** for home restaurants (`/dashboard/home-restaurant/profile`) — show restaurant info, link to onboarding for edits
- [ ] **Show all restaurants when no location is set** — currently dishes section is empty until the user sets an address
- [ ] **Order status page for customers** — let customers track their order status (placed → ready) without email

### Medium Priority

- [ ] **AI dish search** — implement the "Ask AI" feature on the customer dashboard (natural language query → filter dishes)
- [ ] **Customer account page** — order history for logged-in customers
- [ ] **Phone notification** — SMS via Twilio or similar when order is ready (currently only email)
- [ ] **Delivery support** — currently all orders are pickup-only; add delivery option with address collection
- [ ] **Restaurant hours enforcement** — `hours` field is stored but not displayed or enforced
- [ ] **Image optimization** — use `next/image` instead of `<img>` on customer-facing dish cards to avoid layout shift and improve LCP
- [ ] **Pagination / infinite scroll** on customer dashboard for large dish lists

### Low Priority / Future

- [ ] **Ratings and reviews** — customers rate dishes or restaurants after pickup
- [ ] **Stripe integration** — in-app payment instead of pay-at-pickup
- [ ] **Push notifications** (PWA) — browser push for order status updates
- [ ] **AI smart pricing suggestions** — chef dashboard AI tool (placeholder "Coming Soon" card already exists)
- [ ] **Multi-language support** — especially for non-English home chefs
- [ ] **Admin dashboard** — approve/suspend home restaurants, view platform-wide order volume
- [ ] **Analytics for chefs** — revenue over time, most popular dishes, repeat customers

---

## Technical Debt

- [ ] Remove or wire up `components/FloatingCartButton.tsx` (currently orphaned)
- [ ] Replace all `window.location.href` navigation with `next/navigation` `router.push()` for proper SPA behavior
- [ ] Add loading and error boundary components — most pages show blank on error
- [ ] Move from `"use client"` everywhere to a proper server/client split where appropriate
- [ ] Add form validation library (zod + react-hook-form) — inputs are currently unvalidated
- [ ] Set up end-to-end tests for the cart and checkout flow

---

## Compliance Build Sessions (Texas Cottage Food Law / SB 541)

### ✅ Session 1 — Database Foundation (2026-05-04)

Applied migration `20260504000000_compliance_foundation.sql`:

- 13 compliance columns on `home_restaurants` (cert URL/expiry, attestation, agreement, Stripe, DSHS, TCS, labeling, suspension)
- 3 moderation columns on `dishes` (`allergens text[]`, `is_tcs boolean`, `moderation_status text`) + check constraint + back-fill
- `compliance_audit_log` table — append-only, enforced by RLS + immutability trigger
- `moderation_queue` table — admin-only RLS
- `trg_check_activation` — 8-condition activation guard (BEFORE INSERT OR UPDATE)
- `trg_compliance_audit_log_immutable` — blocks UPDATE/DELETE even for service role
- Trigger test: `supabase/tests/test_activation_trigger.sql` — 18 tests, all passed
- `docs/schema.md` updated; Known Schema Issues documented

---

### ✅ Session 1.5 — Existing Data Cleanup (DONE 2026-05-05)

**Prerequisite:** Strategy decision with Pavan before any migration is written.

**Context:** As of 2026-05-04, `home_restaurants` has 29 rows. 27 have `is_active = true` with all compliance columns NULL — these predate the activation trigger. They cannot be re-activated via normal UPDATE now that the trigger is live. Seed/test rows need to be separated from any real users.

**Scope:**

1. **Audit query** — pull all 29 rows; classify each as: seed data (UUID pattern `feed0001-...`), test data, or real user.
2. **Cleanup strategy** — options to decide:
   - Delete all seed rows (they are test data with no real orders)
   - For real-looking rows: deactivate (`is_active = false`) and email owners to re-complete onboarding
   - OR: grandfather existing rows with a one-time bypass column (`compliance_grandfathered = true`) — simpler but weaker legally
3. **`is_active` default fix** — `ALTER TABLE home_restaurants ALTER COLUMN is_active SET DEFAULT false`. Must be done after categorizing existing rows so we don't deactivate anything mid-decision.
4. **`dishes` RLS update** — add `moderation_status IN ('approved', 'auto_approved')` filter to the customers' SELECT policy on `dishes`, so moderation is enforced at the DB layer, not just client-side.
5. **`created_at` type** — `ALTER TABLE home_restaurants ALTER COLUMN created_at TYPE timestamptz` (low urgency; needs careful handling of existing data).

---

### ⬜ Session 2 — Onboarding Wizard UI + API Routes (NOT STARTED)

**Prerequisite:** Session 1.5 complete (clean DB state, is_active default fixed).

**Scope:**

1. **7-step onboarding wizard** at `/dashboard/home-restaurant/onboarding`
   - Step 1: Cottage food eligibility attestation (4 yes/no questions, SB 541)
   - Step 2: Food handler cert upload (PDF/image → `chef-credentials` private bucket)
   - Step 3: Product type declaration (`sells_tcs_foods` toggle + DSHS ID if true)
   - Step 4: Labeling requirements acknowledgment
   - Step 5: Chef Agreement acceptance (version + timestamp + IP)
   - Step 6: Stripe Connect onboarding redirect (`/api/stripe-connect/start`)
   - Step 7: Activation gate — trigger fires, restaurant goes live
2. **API routes**
   - `POST /api/compliance/attest` — writes `cottage_food_attestation_at`, logs to `compliance_audit_log`
   - `POST /api/compliance/cert-upload` — uploads to `chef-credentials`, writes URL + expiry, logs
   - `POST /api/compliance/agree` — writes agreement columns + IP, logs
   - `POST /api/compliance/label-ack` — writes `labeling_acknowledged_at`, logs
   - `GET/POST /api/stripe-connect/start` — creates Stripe Connect account, redirects to onboarding
   - `GET /api/stripe-connect/return` — handles return from Stripe, sets `stripe_payouts_enabled`
3. **Activation flow** — final step calls `UPDATE home_restaurants SET is_active = true` — trigger validates all 8 conditions

---

### ⬜ Session 3 — Content Moderation (NOT STARTED)

See `docs/legal/08-content-moderation-spec.md` for full spec.

1. `lib/moderation/keywords.ts` — Layer 1 keyword lists (English + Hindi/Telugu/Urdu/Tamil + Spanish)
2. `app/api/moderation/classify-dish/route.ts` — Layer 2 Claude Haiku classifier
3. `app/api/moderation/review/` — approve/reject endpoints for admin
4. `app/admin/moderation/page.tsx` — manual review queue UI (admin only)
5. Wire into dish add/edit flow — classify on submit, gate visibility on `moderation_status`
6. Allergen detection combined with classification call

---

### ⬜ Session 4 — Label Generator + Cert Expiration Cron (NOT STARTED)

See `docs/legal/05-dish-label-generator-spec.md`.

1. Per-dish label PDF generation (Puppeteer or React-PDF) — name, ingredients, allergens, net weight, producer name/address, "Not inspected by DSHS" statement
2. `supabase/functions/cert-expiration-cron` — daily Edge Function; warns chefs at 30/7/1 days; auto-deactivates + suspends on expiry; logs to `compliance_audit_log`
