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
