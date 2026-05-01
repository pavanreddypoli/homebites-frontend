# HomeBites — Database Schema

Hosted on Supabase (PostgreSQL). Row-Level Security (RLS) is enabled.

---

## Tables

### `home_restaurants`

Represents a home chef's restaurant profile. One row per `home_restaurant` user.

> **Important:** `home_restaurants.id` is both the primary key **and** a foreign key to `auth.users(id) ON DELETE CASCADE`. Restaurant ID equals the auth user ID — one restaurant per user account. There is no separate `user_id` column.

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
| `is_active` | `boolean` | Must be `true` for restaurant to appear on browse page and for onboarding to be considered complete |
| `is_open` | `boolean` | Real-time availability toggle — customers see this status live |
| `closed_message` | `text` | Optional message shown to customers when `is_open = false` (e.g. "Back tomorrow at 6pm!") |

**RLS:** Owners can read/write their own row. Customers can read rows where `is_active = true`.

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
| `price` | `numeric` | Price in dollars (nullable — dish can be listed without price) |
| `image_url` | `text` | Public URL from Supabase Storage bucket `dish-images` |

**RLS:** Owners (via `home_restaurant_id → user_id`) can insert/update/delete. All authenticated users (and anon) can read.

---

### `orders`

One row per customer order.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `customer_id` | `uuid` | FK → `auth.users.id`, nullable (guest orders allowed) |
| `restaurant_id` | `uuid` | FK → `home_restaurants.id` |
| `restaurant_name` | `text` | Denormalized — snapshot at time of order |
| `subtotal` | `numeric` | Sum of `price × quantity` for all items |
| `service_fee` | `numeric` | 5% of subtotal |
| `tax` | `numeric` | 8.25% of (subtotal + service_fee) |
| `total` | `numeric` | subtotal + service_fee + tax |
| `order_type` | `text` | Currently always `"pickup"` |
| `status` | `text` | `"placed"` → `"ready"` → `"completed"` |
| `customer_email` | `text` | Provided at checkout (optional); used for email notifications |
| `customer_name` | `text` | Nullable; currently not collected at checkout |
| `pickup_address` | `text` | Nullable; not yet populated (shown as fallback text in emails) |
| `created_at` | `timestamptz` | Auto-set by Supabase |

**RLS:** Restaurant owners can read/update orders for their restaurant. Guest-created orders are readable via RPC `get_order_with_items` (SECURITY DEFINER) so the confirmation page works without login.

---

### `order_items`

Line items for each order.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `order_id` | `uuid` | FK → `orders.id` |
| `dish_id` | `int8` | FK → `dishes.id` (soft reference — dish may be deleted later) |
| `dish_name` | `text` | Denormalized snapshot of dish name at time of order |
| `price` | `numeric` | Denormalized snapshot of unit price at time of order |
| `quantity` | `int4` | Number of units ordered |

**RLS:** Readable by the order's restaurant owner and by the customer via RPC.

---

## Storage

### Bucket: `dish-images`

Stores dish photos uploaded by home restaurant owners.

- **Path pattern:** `dishes/{user_id}_{timestamp}.{ext}`
- **Access:** Public (URLs are used directly in `<img>` tags without signed URLs)
- **Allowed types:** `image/*` (enforced client-side only)
- **next.config.ts** remote pattern: `*.supabase.co` and `ynovjxkwvyhjdrksjecy.supabase.co`

---

## RPCs (Stored Functions)

### `create_order_with_items`

Creates an order and its line items atomically. Returns the new order's `id` (uuid).

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

Called from `app/dashboard/customer/checkout/page.tsx`.

---

### `get_order_with_items`

Returns full order details for the confirmation page. Defined as `SECURITY DEFINER` so it bypasses RLS — allows guest customers to read their own order without being logged in.

```sql
get_order_with_items(
  p_order_id uuid
) RETURNS jsonb
-- { order: {...}, items: [...] }
```

Called from `app/dashboard/customer/order-confirmation/[orderId]/page.tsx`.

---

## Auth

Supabase Auth with email/password. Key metadata field:

```json
user_metadata: {
  "role": "customer" | "home_restaurant"
}
```

This field is set at signup and read in `app/dashboard/page.tsx` to route the user to the correct dashboard. A Supabase database trigger (not in this repo) may use `user_metadata.role` to auto-create a `home_restaurants` row on signup.
