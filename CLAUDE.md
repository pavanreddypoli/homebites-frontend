# HomeBites — Claude Code Guide

## Project Layout

```
homebites-frontend/   ← All active code lives here
homebites-backend/    ← Empty (no separate backend server)
docs/
  schema.md           ← DB schema reference
  roadmap.md          ← Sprint roadmap
  legal/
    01-chef-agreement.md
    02-customer-terms-of-service.md
    03-privacy-policy.md
    04-onboarding-compliance-spec.md
    05-dish-label-generator-spec.md
    06-pre-launch-legal-checklist.md
    07-incident-response-playbook.md
    08-content-moderation-spec.md
    09-platform-liability-positioning-memo.md
    10-chef-requirements-guide.md
    11-master-action-items.md
    12-marketplace-compliance-comparison.md
    13-entity-structure-memo.md
```

Everything — auth, database, storage, and server-side logic — runs through Supabase and Next.js API routes. There is no separate backend process.

## Running the App

```bash
cd homebites-frontend
npm run dev          # starts on http://localhost:3000
npm run build        # type-check + production build
npm run lint         # eslint
```

Root `/` immediately redirects to `/dashboard/customer`.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16, App Router, React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| UI components | shadcn/ui — button, input, textarea, badge, card |
| Icons | lucide-react |
| Database / Auth | Supabase (postgres + RLS + Auth) |
| File storage | Supabase Storage, bucket `dish-images` |
| Email | Resend (`RESEND_API_KEY`) |

## Environment Variables (`homebites-frontend/.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # server-only, never expose to browser
RESEND_API_KEY=
```

`lib/supabaseClient.ts` — browser client (anon key, used in all `"use client"` pages).
`lib/supabaseServer.ts` — server client (service role key, used only in `app/api/*` routes).

## User Roles

Set in `user_metadata.role` at signup. Two values:

- `customer` — browses and orders food
- `home_restaurant` — manages restaurant profile, menu, and incoming orders

Role-based routing happens in `app/dashboard/page.tsx`. Home-restaurant users are sent to `/dashboard/home-restaurant/onboarding` if `home_restaurants.is_active` is not `true`.

## Route Map

```
/                                          → redirect to /dashboard/customer
/login                                     → email/password login
/signup                                    → signup with role selector

/dashboard                                 → role-based redirect
/dashboard/customer                        → browse restaurants + dishes
/dashboard/customer/restaurant/[id]        → single restaurant menu
/dashboard/customer/checkout               → place order
/dashboard/customer/order-confirmation/[orderId]

/dashboard/home-restaurant                 → chef dashboard
/dashboard/home-restaurant/onboarding      → create/edit restaurant profile
/dashboard/home-restaurant/menu            → manage dishes (edit/delete)
/dashboard/home-restaurant/add-item        → add dish + image upload
/dashboard/home-restaurant/edit-item/[id]  → edit dish
/dashboard/home-restaurant/orders          → incoming orders (placed → ready → completed)

/api/notify-chef-new-order                 → POST, emails chef on new order
/api/notify-customer-order-ready           → POST, emails customer when order is ready
/api/notify-order                          → POST, emails customer order confirmation
/debug/user                                → dev utility (shows current user ID)
```

## Cart System

Cart state lives in `localStorage` key `homebites_cart` — managed entirely in `lib/cart.ts`.

**Shape:**
```ts
{ restaurant_id: string, restaurant_name?: string, items: CartItem[] }
```

**Single-restaurant constraint:** `addToCart()` blocks adding items from a different restaurant than what's already in the cart.

**Legacy migration:** Old carts stored as a flat array are auto-migrated to the object format on first read.

**Events (custom DOM events fired on `window`):**
- `homebites:cart-updated` — any quantity/clear change; CartDrawer re-reads localStorage
- `homebites:open-cart` — opens the CartDrawer slide-in
- `homebites:close-cart` — closes the CartDrawer

`CartDrawer` is mounted globally via `ClientShell` in the root layout. The customer pages also mount it directly (harmless duplicate — both listen to the same events).

## Database Notes

- **`home_restaurants.id` is FK → `auth.users(id) ON DELETE CASCADE`** — restaurant ID equals the auth user ID. There is no separate `user_id` column. Constraint name: `home_restaurants_id_fkey`.
- **Test data:** 20 restaurants seeded across 15 US cities. Auth users and restaurants share the same `feed0001-feed-feed-feed-feed000000NN` UUIDs. See `homebites-frontend/scripts/seed-test-data-working.sql` for the verified seed script.
- **`reviews` table:** created with RLS enabled. One review per order enforced via unique index on `order_id`. See `supabase/migrations/add_ratings.sql`.
- **`is_open` and `closed_message` columns** added to `home_restaurants` for the chef availability toggle.

## Supabase Patterns

- Always call `supabase.auth.getUser()` (not `getSession()`) to get the current user on the client.
- Order creation goes through RPC `create_order_with_items` (handles atomicity).
- Order confirmation page uses RPC `get_order_with_items` — this bypasses RLS so guest orders are readable.
- Address geocoding uses Nominatim (free, no API key). Rate-limit: 1 req/sec; don't hammer it.
- Images upload to Supabase Storage bucket `dish-images`, path pattern `dishes/{userId}_{timestamp}.{ext}`.

## Known Issues / Gotchas

- **`FloatingCartButton` component** (`components/FloatingCartButton.tsx`) is not used anywhere in the current routing — it was superseded by the built-in button inside `CartDrawer`.
- **NavBar "Profile" link** (`/dashboard/home-restaurant/profile`) has no corresponding page — it will 404.
- **`handleAskAI`** in the customer dashboard sets `aiLoading` true then immediately false; the AI search feature is not implemented yet.
- The `homebites-backend/` directory is intentionally empty — do not create a separate server there without updating CI/deployment config.
- **Navbar z-index:** Customer browse navbar uses `z-[100]`; checkout and order-confirmation pages use a `sticky top-0 z-[100]` header. CartDrawer sits at `z-50`, so pages always render above it. Do not lower these z-index values.
- **Guest-first platform:** HomeBites is designed for guest checkout. Login is optional and only needed for order history. Customers browse and pay without an account. The checkout page collects first name, last name, email, and phone — no login gate. Navbar shows only "Become a Chef" for guests; logged-in users see their email + Logout.
- **Stripe payments — IN PROGRESS (Week 2):** `STRIPE_WEBHOOK_SECRET` in `.env.local` is a placeholder; replace it with the real secret from the Stripe dashboard after running `stripe listen`. The webhook at `/api/stripe-webhook` logs `payment_intent.succeeded` but does not yet create orders — orders are created client-side immediately after `stripe.confirmPayment` succeeds. Async payment methods (bank transfers, etc.) that trigger a redirect will drop the user to `/dashboard/customer` without an order being created; card payments are unaffected.

## Editing Guidelines

- All pages are `"use client"` — there are no server components yet.
- Prefer editing existing files; don't add new abstractions unless the task clearly requires them.
- Do not commit `.env.local` or any file containing `SUPABASE_SERVICE_ROLE_KEY`.
- When adding a new page under `home-restaurant/`, add its link to `NavBar.tsx`.
- After editing cart logic in `lib/cart.ts`, verify both the customer dashboard inline +/− and the CartDrawer still work correctly.

## Current Status — Last updated: May 2, 2026

### ✅ Week 1 — DONE
- RLS policies on all 4 Supabase tables
- Auth guard on customer dashboard
- Currency bug fixed (₹ → $)
- Stripe keys configured
- Security bugs fixed

### ✅ Week 2 — DONE
- Stripe Payment Element integrated
- Guest checkout (no login required)
- Order confirmation page working
- Chef email notifications via Resend
- Webhook handler created
- Real test orders placed and confirmed

### 🔄 Weeks 3-4 — IN PROGRESS
- ✅ DoorDash-style desktop UI built
- ✅ Design system (Fraunces + Inter fonts, orange brand colors) applied
- ✅ Mobile responsive layout (sidebar hidden, bottom nav, 4-col grid)
- ✅ Dish detail bottom sheet with nutrition facts
- ✅ 4-column menu grid on restaurant page
- ✅ Chef signup rebuilt as 4-step onboarding wizard
- ✅ Terminology: "Home Restaurant" used throughout (not "chef")
- ✅ "Become a Home Restaurant" + "Home Restaurant Login" buttons
- ✅ Signup info card explaining what account is for
- ✅ Search radius set to 30 miles max
- ✅ Dismissible cart bar with swipe gesture
- ✅ Zero TypeScript errors
- ✅ Live at homebitesai.com
- ❌ Loading skeleton states not done
- ❌ Error boundaries not done
- ❌ window.location.href replacements not complete

### ✅ Weeks 5-6 — DONE
- ✅ Chef availability toggle (open/closed) with real-time status + closed message
- ✅ Real-time order status (Supabase Realtime) — chef orders page + customer order confirmation
- ✅ Ratings & reviews (reviews table, post-order review form, ratings on restaurant cards + detail + chef dashboard)
- ✅ Customer order history page (/dashboard/customer/orders) with Reorder + Track buttons
- ❌ Chef earnings summary — not done

### ⬜ Week 7 — NOT STARTED
- AI search (Anthropic API)
- AI menu description writer

### ⬜ Week 8 — NOT STARTED
- Launch prep, Sentry, 10 chefs onboarded

## Next Session — Start Here
1. Read CLAUDE.md fully
2. Tell Pavan: "Ready to continue. Weeks 1-6 are complete. Next priority is Week 7: AI search (Anthropic API) and AI menu description writer."
3. Ask Pavan: "Which do you want to start with today?"

## Legal Entity

**RedCube Group LLC (Texas LLC) d/b/a HomeBites AI.** All contracts, agreements, and legal documents reference "RedCube Group LLC d/b/a HomeBites AI". Consumer-facing copy (UI, emails, marketing) uses "HomeBites AI". See `docs/legal/13-entity-structure-memo.md` for the full entity structure and rationale.

## Compliance Architecture

The platform enforces **Texas Cottage Food Law (SB 541)** compliance via:
- **DB activation trigger** — `home_restaurants.is_active` only flips true after all compliance gates pass
- **7-step onboarding wizard** — collects cottage food permit, allergen certs, product type declarations, annual revenue tracking, and chef agreement signature
- **3-layer content moderation** — automated keyword filter → AI review → human escalation
- **Auto-generated label PDFs** — per Texas labeling requirements, generated on dish save
- **Daily cert expiration cron** — warns chefs 30/7/1 days before permit expiry; auto-deactivates on expiry
- **`compliance_audit_log` table** — append-only log of every compliance state change with actor, timestamp, and reason

Full spec: `docs/legal/04-onboarding-compliance-spec.md`

## Git Rules

- Every single change must be committed and pushed to GitHub immediately
- Never leave changes uncommitted
- Commit message format: "Fix/Add/Update: short description of what changed"
- Always run: git add . && git commit -m "message" && git push origin main
- After every task, confirm the push was successful
