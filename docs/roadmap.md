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

## Post-Launch (Fundraising Phase)

- [ ] **Foodies subscription tier** — paid customer tier with AI meal planning, taste matching, and custom meal builder across kitchens. Decide pricing post-launch based on engagement. Waitlist live at `/foodies`.
- [ ] **BiteRunners courier program** — community delivery network. Riders are local residents earning side income via hyper-local routes. Launch post-funding once unit economics are proven. Waitlist live at `/biterunners`.

---

## Technical Debt

- [ ] Remove or wire up `components/FloatingCartButton.tsx` (currently orphaned)
- [ ] Replace all `window.location.href` navigation with `next/navigation` `router.push()` for proper SPA behavior
- [ ] Add loading and error boundary components — most pages show blank on error
- [ ] Move from `"use client"` everywhere to a proper server/client split where appropriate
- [ ] Add form validation library (zod + react-hook-form) — inputs are currently unvalidated
- [ ] Set up end-to-end tests for the cart and checkout flow

---

## Compliance Build — Session Roadmap

Texas Cottage Food Law (SB 541) compliance. Session order reflects build dependencies and operational risk.

| # | Session | Status | Notes |
|---|---------|--------|-------|
| 1 | DB compliance foundation | ✅ Done | Columns, triggers, audit log, moderation tables |
| 1.5 | Test data tagging + schema fixes | ✅ Done | `is_test_data`, `is_active` default=false, timestamptz |
| 2 | Legal pages live + version tracking | ✅ Done | `/legal/terms`, `/legal/privacy`, `/legal/chef-agreement` |
| 3 | Customer click-through acceptance | ✅ Done | Signup checkbox, re-acceptance modal, audit log |
| 4 | Chef onboarding wizard steps 1–4 | ✅ Done | Eligibility / Profile / Cert Upload / Agreement |
| 5 | Labeling step + label PDF generator | ✅ Done | Wizard step 5; `/api/labels/[orderId]`; 4"×6" PDF per unit; TX SB 541 text; TCS safe handling; allergen gap tracked |
| 6 | Customer checkout cottage-food disclosure | ⬜ Not started | Acknowledgment gate at checkout — **next** |
| 7 | Three-layer content moderation | ⬜ Not started | Keyword filter → AI review → human escalation |
| 8 | Daily cron for expired certs | ⬜ Not started | Warn 30/7/1 days; auto-deactivate on expiry |
| 9 | Incident response infrastructure | ⬜ Not started | Runbooks, alerting, escalation paths |
| 10 | Public help/legal pages + chef recruitment | ⬜ Not started | Static content, FAQ, chef landing page |
| 11 | Stripe Connect Standard onboarding | ⬜ Not started | **Last** — lawyer review of Chef Agreement should land first; KYC takes 1-3 days/chef, batch before launch |

**Wizard step order (onboarding page.tsx STEP_LABELS):**
1. Eligibility — cottage food attestation
2. Your Profile — name, cuisine, address, contact
3. Certification — food handler cert upload + expiry
4. Agreement — Chef Agreement scroll + acceptance
5. Labeling — per-dish label acknowledgment (Session 5)
6. Stripe — Connect Standard bank account (Session 11)
7. Go Live — final activation
