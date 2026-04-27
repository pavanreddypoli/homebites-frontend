-- HomeBites RLS policies
-- Generated from live schema inspection via PostgREST OpenAPI.
-- Type fixes applied:
--   1. orders.customer_id is uuid  → auth.uid() = customer_id  (no ::text cast)
--   2. orders.restaurant_id is text → r.id::text = restaurant_id  (cast uuid→text)

-- ============================================================
-- Enable RLS
-- ============================================================
alter table public.home_restaurants enable row level security;
alter table public.dishes            enable row level security;
alter table public.orders            enable row level security;
alter table public.order_items       enable row level security;

-- ============================================================
-- home_restaurants
-- ============================================================
create policy "Public can view active restaurants"
  on public.home_restaurants for select
  using (is_active = true);

create policy "Chefs can view their own restaurant"
  on public.home_restaurants for select
  using (auth.uid() = user_id);

create policy "Chefs can insert their own restaurant"
  on public.home_restaurants for insert
  with check (auth.uid() = user_id);

create policy "Chefs can update their own restaurant"
  on public.home_restaurants for update
  using (auth.uid() = user_id);

-- ============================================================
-- dishes
-- ============================================================
create policy "Public can view dishes of active restaurants"
  on public.dishes for select
  using (
    exists (
      select 1 from public.home_restaurants r
      where r.id = home_restaurant_id
        and r.is_active = true
    )
  );

create policy "Chefs can manage their own dishes"
  on public.dishes for all
  using (
    exists (
      select 1 from public.home_restaurants r
      where r.id = home_restaurant_id
        and r.user_id = auth.uid()
    )
  );

-- ============================================================
-- orders
-- ============================================================

-- FIX 1: customer_id is uuid — compare directly, no ::text cast
create policy "Customers can view their own orders"
  on public.orders for select
  using (auth.uid() = customer_id);

-- FIX 2: restaurant_id is text — cast r.id (uuid) to text for comparison
create policy "Chefs can view orders for their restaurant"
  on public.orders for select
  using (
    exists (
      select 1 from public.home_restaurants r
      where r.id::text = restaurant_id
        and r.user_id = auth.uid()
    )
  );

create policy "Chefs can update order status"
  on public.orders for update
  using (
    exists (
      select 1 from public.home_restaurants r
      where r.id::text = restaurant_id
        and r.user_id = auth.uid()
    )
  );

-- ============================================================
-- order_items
-- ============================================================

-- FIX 1 (again): o.customer_id is uuid — no ::text cast
create policy "Customers can view their own order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and auth.uid() = o.customer_id
    )
  );

create policy "Chefs can view items for their orders"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      join public.home_restaurants r on r.id::text = o.restaurant_id
      where o.id = order_id
        and r.user_id = auth.uid()
    )
  );
