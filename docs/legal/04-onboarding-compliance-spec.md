# HomeBites AI — Chef Onboarding Compliance Flow

**Audience:** Claude Code / engineering
**Purpose:** Implementation spec for compliance gates that block `home_restaurants.is_active = true` until requirements are met.

---

## Goal

A chef cannot become visible to customers until they have:
1. Confirmed eligibility under Texas Cottage Food Law
2. Uploaded a valid food handler certification
3. Accepted the Chef Agreement (signed timestamp captured)
4. Onboarded with Stripe Connect (payouts enabled)
5. Acknowledged labeling requirements

Each of these must be persisted, auditable, and required for activation.

---

## Database Changes

### Add columns to `home_restaurants`

```sql
ALTER TABLE home_restaurants ADD COLUMN food_handler_cert_url text;
ALTER TABLE home_restaurants ADD COLUMN food_handler_cert_expires_at date;
ALTER TABLE home_restaurants ADD COLUMN cottage_food_attestation_at timestamptz;
ALTER TABLE home_restaurants ADD COLUMN chef_agreement_version text;
ALTER TABLE home_restaurants ADD COLUMN chef_agreement_accepted_at timestamptz;
ALTER TABLE home_restaurants ADD COLUMN chef_agreement_ip text;
ALTER TABLE home_restaurants ADD COLUMN stripe_connect_account_id text;
ALTER TABLE home_restaurants ADD COLUMN stripe_payouts_enabled bool DEFAULT false;
ALTER TABLE home_restaurants ADD COLUMN dshs_registration_id text;  -- only required if selling TCS foods
ALTER TABLE home_restaurants ADD COLUMN sells_tcs_foods bool DEFAULT false;
ALTER TABLE home_restaurants ADD COLUMN labeling_acknowledged_at timestamptz;
ALTER TABLE home_restaurants ADD COLUMN suspended_at timestamptz;
ALTER TABLE home_restaurants ADD COLUMN suspension_reason text;
```

### New table: `compliance_audit_log`
Append-only record of every attestation, file upload, and policy acceptance.

```sql
CREATE TABLE compliance_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  home_restaurant_id uuid REFERENCES home_restaurants(id),
  event_type text NOT NULL,  -- e.g. 'cottage_food_attestation', 'agreement_accepted', 'cert_uploaded'
  event_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);
```

### Activation rule
A trigger or server-side check enforces:

```
is_active = true
ONLY IF
  food_handler_cert_url IS NOT NULL
  AND food_handler_cert_expires_at > current_date
  AND cottage_food_attestation_at IS NOT NULL
  AND chef_agreement_accepted_at IS NOT NULL
  AND stripe_payouts_enabled = true
  AND labeling_acknowledged_at IS NOT NULL
  AND (sells_tcs_foods = false OR dshs_registration_id IS NOT NULL)
  AND suspended_at IS NULL
```

Implement as a `BEFORE UPDATE` trigger that raises an exception if `is_active` is set to true while any condition fails.

---

## Onboarding Wizard — Step Order

Replace the current `/dashboard/home-restaurant/onboarding/page.tsx` with a multi-step wizard:

### Step 1 — Welcome & Eligibility
**Heading:** "Are you eligible to sell on HomeBites AI?"
Display the Texas Cottage Food Law summary in plain language. Then show 4 yes/no questions. **All four must be Yes** to proceed:

1. I am an individual Texas resident cooking from my own home kitchen.
2. I will not sell more than $150,000 in cottage foods this year (across all platforms).
3. I will not list any meat, poultry, seafood, ice cream, raw milk, low-acid canned goods, or CBD/THC items.
4. I have, or will obtain, a Texas DSHS-accredited food handler certification before listing.

If any answer is No → block onboarding, show explanation page with link to `texascottagefoodlaw.com` and a way to email support.

If all Yes → write `cottage_food_attestation_at = now()` to `home_restaurants` + log to `compliance_audit_log` with the question/answer JSON.

### Step 2 — Restaurant Profile
Existing fields: name, cuisine, description, address (geocoded), hours, delivery_radius_km.
Add: `sells_tcs_foods` (checkbox: "Will you sell items that need refrigeration or hot/cold holding — e.g. cheesecake, cooked curries, biryani-style rice dishes?"). If checked → show DSHS registration ID input (required to proceed).

### Step 3 — Food Handler Certification Upload
- File input: PDF or image of cert
- Date input: certification expiration date (must be > today)
- Upload to Supabase Storage bucket `chef-credentials` (private bucket — service role only, RLS denies all client reads)
- Persist `food_handler_cert_url` and `food_handler_cert_expires_at`
- Log to `compliance_audit_log`

### Step 4 — Chef Agreement
- Render the latest agreement (`/legal/chef-agreement-v1.0.md`) inline in a scrollable container
- Must scroll to bottom before checkbox enables (UX detail — disable checkbox until `scrollTop + clientHeight >= scrollHeight - 50`)
- Single checkbox: "I have read and agree to the HomeBites AI Chef Agreement (v1.0)"
- On accept → persist `chef_agreement_version = '1.0'`, `chef_agreement_accepted_at = now()`, `chef_agreement_ip = request_ip`
- Log to `compliance_audit_log`

### Step 5 — Stripe Connect Onboarding
- Create Stripe Connect account (Standard) via API route `/api/stripe-connect/create-account`
- Redirect chef to Stripe-hosted onboarding URL
- On return, hit `/api/stripe-connect/refresh-status` which:
  - Fetches account from Stripe
  - Updates `stripe_connect_account_id` and `stripe_payouts_enabled`
  - Logs to `compliance_audit_log`
- Block until `stripe_payouts_enabled = true`

### Step 6 — Labeling Acknowledgment
- Show example label PDF preview
- Display the mandatory disclaimer prominently
- Single checkbox: "I will print and attach this label to every order I prepare."
- Persist `labeling_acknowledged_at = now()`
- Log to `compliance_audit_log`

### Step 7 — Activation
- Server-side function `activate_chef(home_restaurant_id)` checks all conditions
- If pass → set `is_active = true` and redirect to dashboard
- If fail → show which conditions are missing with links back to the relevant step

---

## Ongoing Enforcement

### Cert expiration cron
Daily Vercel cron job `/api/cron/expire-certs`:
- Find all `home_restaurants` where `food_handler_cert_expires_at < current_date + interval '30 days'` → email chef warning
- If `food_handler_cert_expires_at < current_date` → set `is_active = false`, `suspended_at = now()`, `suspension_reason = 'food_handler_cert_expired'`, send email

### Annual re-attestation
On the 1-year anniversary of `cottage_food_attestation_at`, prompt chef to re-confirm the 4 eligibility questions before next listing edit.

### Agreement updates
When the agreement version increments, set a flag forcing chefs to re-accept on next login before they can edit listings or accept orders.

---

## Customer-Facing Disclosures

### At checkout
Above the Pay button, render a disclosure card containing three elements:

1. Context sentence: "All food sold through HomeBites AI is prepared in **home kitchens** by individuals operating under the Texas Cottage Food Law (Texas Health & Safety Code Chapter 437)."

2. Verbatim formal disclosure from Customer ToS Section 3 (all-caps, visually distinct):
   > **THE FOOD YOU ORDER WAS PRODUCED IN A PRIVATE RESIDENCE THAT IS NOT SUBJECT TO GOVERNMENTAL LICENSING OR INSPECTION.**

3. Allergen warning from Customer ToS Section 3:
   > Chefs are required to disclose allergens on labels. **If you have a food allergy or dietary restriction, contact the chef directly before ordering.** HomeBites AI does not verify allergen information.

Customer must check a box: "I understand and accept this." Persist the acknowledgment in the `orders` table (`cottage_food_acknowledged_at`). Log to `compliance_audit_log` with `event_type = 'cottage_food_acknowledged_at_order'`.

### On every dish card
Small badge: "🏠 Home kitchen"

### In order confirmation email
Include the full disclaimer text and a "How pickup works" section.

---

## Files / Routes to Add

```
/app/dashboard/home-restaurant/onboarding/
  ├─ page.tsx                     # wizard shell
  ├─ steps/
  │   ├─ EligibilityStep.tsx
  │   ├─ ProfileStep.tsx
  │   ├─ CertUploadStep.tsx
  │   ├─ AgreementStep.tsx
  │   ├─ StripeConnectStep.tsx
  │   ├─ LabelingStep.tsx
  │   └─ ActivationStep.tsx
  └─ useOnboardingState.ts        # progress hook

/app/api/
  ├─ stripe-connect/
  │   ├─ create-account/route.ts
  │   └─ refresh-status/route.ts
  ├─ compliance/
  │   ├─ log-event/route.ts
  │   └─ upload-cert/route.ts     # service-role upload
  └─ cron/
      └─ expire-certs/route.ts

/legal/
  ├─ chef-agreement-v1.0.md
  ├─ terms-v1.0.md
  └─ privacy-v1.0.md

/lib/compliance.ts                # helper for activation check + audit log
```

---

## RLS Implications

- `compliance_audit_log` — INSERT via service role only; chefs can SELECT their own rows
- `chef-credentials` storage bucket — no public access; signed URLs generated server-side for admin review only
- `home_restaurants.food_handler_cert_url` — visible only to the chef who owns the row and to service role
