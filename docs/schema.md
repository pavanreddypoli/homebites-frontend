# HomeBites — Database Schema

Hosted on Supabase (PostgreSQL). Row-Level Security (RLS) is enabled on all tables.

---

## Tables

### `home_restaurants`

Represents a home chef's restaurant profile. One row per `home_restaurant` user.

> **Important:** `home_restaurants.id` is both the primary key **and** a foreign key to `auth.users(id) ON DELETE CASCADE`. Restaurant ID equals the auth user ID — one restaurant per user account. There is no separate `user_id` column.

#### Core profile columns

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key **and** FK → `auth.users(id) ON DELETE CASCADE`. Restaurant ID = auth user ID. |
| `name` | `text` | Restaurant display name |
| `cuisine` | `text` | e.g. "South Indian", "Mexican" |
| `description` | `text` | Short bio shown on customer browse page |
| `city` | `text` | Detected from address via Nominatim |
| `hours` | `text` | Free-text operating hours (not enforced) |
| `lat` | `float8` | Latitude from Nominatim geocoding |
| `lng` | `float8` | Longitude from Nominatim geocoding |
| `delivery_radius_km` | `float8` | Max distance for customer discovery (default 5) |
| `notification_email` | `text` | Chef's email for new-order and pickup alerts |
| `is_active` | `boolean` | `true` = restaurant visible to customers. **Protected by activation trigger** — see Triggers section. |
| `is_open` | `boolean` | Real-time availability toggle — customers see this status live |
| `closed_message` | `text` | Optional message shown when `is_open = false` |

#### Compliance columns (added migration 20260504000000)

| Column | Type | Notes |
|---|---|---|
| `food_handler_cert_url` | `text` | Storage URL of uploaded food handler cert (private bucket `chef-credentials`) |
| `food_handler_cert_expires_at` | `date` | Cert expiry — must be > today for activation. Cron deactivates when it lapses. |
| `cottage_food_attestation_at` | `timestamptz` | Timestamp of Step 1 eligibility attestation (4 yes/no questions under SB 541) |
| `chef_agreement_version` | `text` | Version string of accepted Chef Agreement (e.g. `'1.0'`) |
| `chef_agreement_accepted_at` | `timestamptz` | Timestamp of agreement acceptance |
| `chef_agreement_ip` | `text` | IP address at time of acceptance (legal record) |
| `stripe_connect_account_id` | `text` | Stripe Connect Standard account ID (`acct_...`) |
| `stripe_payouts_enabled` | `boolean` | `true` once Stripe Connect onboarding is complete (default `false`) |
| `dshs_registration_id` | `text` | Texas DSHS registration ID — required only if `sells_tcs_foods = true` |
| `sells_tcs_foods` | `boolean` | Chef declares they sell temperature-controlled-for-safety items (default `false`) |
| `labeling_acknowledged_at` | `timestamptz` | Timestamp chef acknowledged labeling requirements |
| `suspended_at` | `timestamptz` | Set when account is suspended; `NULL` = not suspended |
| `suspension_reason` | `text` | Human-readable reason (e.g. `'food_handler_cert_expired'`) |

**RLS:** Owners can read/write their own row. Customers can read rows where `is_active = true`.

**Activation trigger:** `is_active` cannot be set to `true` unless all 8 compliance conditions pass — see `trg_check_activation` in the Triggers section.

---

### `dishes`

Menu items belonging to a home restaurant.

| Column | Type | Notes |
|---|---|---|
| `id` | `int8` | Primary key (auto-increment) |
| `home_restaurant_id` | `uuid` | FK → `home_restaurants.id` |
| `name` | `text` | Dish display name |
| `ingredients` | `text` | Comma-separated ingredient list |
| `description` | `text` | Taste/texture description shown to customers |
| `price` | `numeric` | Price in dollars (nullable) |
| `image_url` | `text` | Public URL from Supabase Storage bucket `dish-images` |
| `is_archived` | `boolean` | Soft-delete flag. **Never hard-delete dishes** (FK from `order_items.dish_id`). All customer queries must filter `is_archived = false`. |
| `allergens` | `text[]` | FDA Big-9 allergens detected + confirmed by chef (default `'{}'`). Pre-filled by AI, editable by chef. Used by label generator. |
| `is_tcs` | `boolean` | True if dish requires temperature control for safety (e.g. cheesecake, cooked curries). Requires chef to have `dshs_registration_id`. Default `false`. |
| `moderation_status` | `text` | Constraint: `'pending_review'` \| `'approved'` \| `'rejected'` \| `'auto_approved'`. Only `approved` and `auto_approved` are visible to customers. |

**Back-fill note:** Dishes existing before the moderation system were set to `'auto_approved'` by the migration.

**RLS:** Owners can insert/update/delete. Customers (anon + authenticated) can read where `is_archived = false` AND `moderation_status IN ('approved', 'auto_approved')`.

---

### `orders`

One row per customer order.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `customer_id` | `uuid` | FK → `auth.users.id`, nullable (guest orders allowed) |
| `restaurant_id` | `uuid` | FK → `home_restaurants.id` |
| `restaurant_name` | `text` | Denormalized snapshot at time of order |
| `subtotal` | `numeric` | Sum of `price × quantity` for all items |
| `service_fee` | `numeric` | 5% of subtotal |
| `tax` | `numeric` | 8.25% of (subtotal + service_fee) |
| `total` | `numeric` | subtotal + service_fee + tax |
| `order_type` | `text` | Currently always `"pickup"` |
| `status` | `text` | `"placed"` → `"ready"` → `"completed"` |
| `customer_email` | `text` | Provided at checkout; used for notifications |
| `customer_name` | `text` | Nullable; not currently collected at checkout |
| `pickup_address` | `text` | Nullable; not yet populated |
| `created_at` | `timestamptz` | Auto-set by Supabase |

**RLS:** Restaurant owners can read/update orders for their restaurant. Guest orders are readable via RPC `get_order_with_items` (SECURITY DEFINER).

---

### `order_items`

Line items for each order.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `order_id` | `uuid` | FK → `orders.id` |
| `dish_id` | `int8` | FK → `dishes.id` (dish may be archived later — FK is soft) |
| `dish_name` | `text` | Denormalized snapshot of dish name |
| `price` | `numeric` | Denormalized snapshot of unit price |
| `quantity` | `int4` | Number of units ordered |

**RLS:** Readable by the order's restaurant owner and by the customer via RPC.

---

### `compliance_audit_log` _(added migration 20260504000000)_

Append-only record of every compliance event: attestations, cert uploads, policy acceptances, activation attempts, suspensions, cert expirations.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | FK → `auth.users(id)` — the actor |
| `home_restaurant_id` | `uuid` | FK → `home_restaurants(id)` |
| `event_type` | `text` | e.g. `'cottage_food_attestation'`, `'agreement_accepted'`, `'cert_uploaded'`, `'stripe_connect_linked'`, `'labeling_acknowledged'`, `'cert_expired_deactivation'`, `'manual_suspension'`, `'annual_reattestation'` |
| `event_data` | `jsonb` | Arbitrary payload (e.g. `{ questions: [...], answers: [...] }` for attestation events) |
| `ip_address` | `text` | IP address of the actor |
| `user_agent` | `text` | Browser/client user-agent |
| `created_at` | `timestamptz` | Auto-set; immutable |

**RLS:**
- SELECT: chefs can read their own rows (`home_restaurant_id = auth.uid()`)
- INSERT: service role only (no INSERT policy for authenticated/anon users)
- UPDATE: denied for everyone — policy + immutability trigger
- DELETE: denied for everyone — policy + immutability trigger

**Index:** `compliance_audit_log_restaurant_idx` on `(home_restaurant_id, created_at DESC)`.

---

### `moderation_queue` _(added migration 20260504000000)_

Holds dishes sent to Layer 3 manual review when AI returns `decision: 'review'` or `confidence < 0.85`.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `dish_id` | `int8` | FK → `dishes(id)` |
| `chef_id` | `uuid` | FK → `home_restaurants(id)` |
| `ai_classification` | `jsonb` | Full AI response payload |
| `ai_decision` | `text` | `'allow'` \| `'block'` \| `'review'` |
| `ai_confidence` | `numeric` | 0.0–1.0 |
| `human_decision` | `text` | `'approved'` \| `'rejected'` — null until reviewed |
| `human_reason` | `text` | Reviewer's explanation (shown to chef on rejection email) |
| `human_reviewer_id` | `uuid` | FK → `auth.users(id)` — who reviewed |
| `reviewed_at` | `timestamptz` | Null until reviewed |
| `created_at` | `timestamptz` | Auto-set |

**RLS:** Admin-only (`user_metadata.role = 'admin'`). All other users denied.

**Indexes:**
- `moderation_queue_dish_idx` on `(dish_id)`
- `moderation_queue_unreviewed_idx` on `(created_at ASC)` WHERE `human_decision IS NULL` — efficient queue drain sorted oldest-first

---

### `reviews`

Customer reviews. One review per order (unique index on `order_id`).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `order_id` | `uuid` | FK → `orders.id` — unique index |
| `restaurant_id` | `uuid` | FK → `home_restaurants.id` |
| `customer_id` | `uuid` | FK → `auth.users.id` |
| `rating` | `int2` | 1–5 |
| `comment` | `text` | Optional |
| `created_at` | `timestamptz` | Auto-set |

**RLS:** RLS enabled. Customers can insert/read. Restaurant owners can read reviews for their own restaurant.

---

## Storage

### Bucket: `dish-images`

- **Path pattern:** `dishes/{user_id}_{timestamp}.{ext}`
- **Access:** Public
- **next.config.ts** remote patterns: `*.supabase.co`

### Bucket: `chef-credentials` _(to be created — required for compliance)_

Stores food handler cert uploads (PDF or image).

- **Path pattern:** `certs/{user_id}_{timestamp}.{ext}`
- **Access:** Private — no public URLs. Signed URLs generated server-side (service role) for admin review only.
- **RLS:** Service role only; no client reads.

---

## RPCs (Stored Functions)

### `create_order_with_items`

Creates an order and its line items atomically. Returns the new order `id`.

```sql
create_order_with_items(
  p_customer_id      uuid,
  p_restaurant_id    uuid,
  p_restaurant_name  text,
  p_subtotal         numeric,
  p_service_fee      numeric,
  p_tax              numeric,
  p_total            numeric,
  p_order_type       text,
  p_status           text,
  p_customer_email   text,
  p_items            jsonb   -- array of {dish_id, dish_name, price, quantity}
) RETURNS uuid
```

### `get_order_with_items`

Returns full order details. `SECURITY DEFINER` — bypasses RLS for guest confirmation page.

```sql
get_order_with_items(p_order_id uuid) RETURNS jsonb
-- { order: {...}, items: [...] }
```

---

## Triggers

### `trg_check_activation` on `home_restaurants`

**Function:** `check_activation_requirements()`
**Timing:** `BEFORE UPDATE FOR EACH ROW`
**Guard:** Only fires when `OLD.is_active IS DISTINCT FROM NEW.is_active AND NEW.is_active = true`. Normal UPDATEs that don't touch `is_active` pass through unaffected.

Raises a descriptive `RAISE EXCEPTION` if any condition fails:

| # | Condition | Exception message |
|---|---|---|
| 1 | `food_handler_cert_url IS NOT NULL` | `Cannot activate: food_handler_cert_url is missing` |
| 2 | `food_handler_cert_expires_at IS NOT NULL AND > current_date` | `Cannot activate: food_handler_cert has expired or expiry date is missing` |
| 3 | `cottage_food_attestation_at IS NOT NULL` | `Cannot activate: cottage_food_attestation_at is missing` |
| 4 | `chef_agreement_accepted_at IS NOT NULL` | `Cannot activate: chef_agreement_accepted_at is missing` |
| 5 | `stripe_payouts_enabled = true` | `Cannot activate: stripe_payouts_enabled is false` |
| 6 | `labeling_acknowledged_at IS NOT NULL` | `Cannot activate: labeling_acknowledged_at is missing` |
| 7 | `sells_tcs_foods = false OR dshs_registration_id IS NOT NULL` | `Cannot activate: sells_tcs_foods is true but dshs_registration_id is missing` |
| 8 | `suspended_at IS NULL` | `Cannot activate: restaurant is suspended (suspended_at is set)` |

### `trg_compliance_audit_log_immutable` on `compliance_audit_log`

**Function:** `compliance_audit_log_immutable()`
**Timing:** `BEFORE UPDATE OR DELETE FOR EACH ROW`

Raises an exception unconditionally — makes the table truly append-only even for the service role (which bypasses RLS).

---

## Auth

Supabase Auth with email/password.

```json
user_metadata: {
  "role": "customer" | "home_restaurant" | "admin"
}
```

- `customer` — browses and orders
- `home_restaurant` — manages restaurant profile, menu, and orders
- `admin` — access to moderation queue and admin routes. Must be set manually in the Supabase Auth dashboard.

---

## RLS Policy Checklist

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `home_restaurants` | Owners (own row) + anon (active only) | Owners | Owners (gated by activation trigger) | — |
| `dishes` | All (non-archived, moderated) | Owners | Owners | Owners (soft-delete only) |
| `orders` | Owner + customer via RPC | Via RPC | Owner (status updates) | — |
| `order_items` | Owner + customer via RPC | Via RPC | — | — |
| `reviews` | Owner + customers | Customers | — | — |
| `compliance_audit_log` | Chef (own rows) | Service role only | ❌ denied | ❌ denied |
| `moderation_queue` | Admin only | Admin only | Admin only | Admin only |
