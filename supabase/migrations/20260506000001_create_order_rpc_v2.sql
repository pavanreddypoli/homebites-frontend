BEGIN;

-- Drop the old version — p_restaurant_id is text in the live function (matches orders.restaurant_id)
DROP FUNCTION IF EXISTS public.create_order_with_items(
  uuid, text, text, numeric, numeric, numeric, numeric, text, text, text, jsonb
);

-- Recreate with cottage_food_acknowledged_at at the end.
-- DEFAULT NULL so missing callers get a clean exception (not a signature error);
-- the body immediately raises if NULL — defense in depth.
-- SECURITY DEFINER preserves the existing permission model that allows guest
-- (anon-role) inserts into orders to succeed through RLS.
CREATE OR REPLACE FUNCTION public.create_order_with_items(
  p_customer_id                   uuid,
  p_restaurant_id                 text,                       -- text, matches orders.restaurant_id
  p_restaurant_name               text,
  p_subtotal                      numeric,
  p_service_fee                   numeric,
  p_tax                           numeric,
  p_total                         numeric,
  p_order_type                    text,
  p_status                        text,
  p_customer_email                text,
  p_items                         jsonb,
  p_cottage_food_acknowledged_at  timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id uuid;
  v_item     jsonb;
BEGIN
  IF p_cottage_food_acknowledged_at IS NULL THEN
    RAISE EXCEPTION 'Cottage food acknowledgment is required';
  END IF;

  INSERT INTO public.orders (
    customer_id, restaurant_id, restaurant_name,
    subtotal, service_fee, tax, total,
    order_type, status, customer_email,
    cottage_food_acknowledged_at
  ) VALUES (
    p_customer_id, p_restaurant_id, p_restaurant_name,
    p_subtotal, p_service_fee, p_tax, p_total,
    p_order_type, p_status, p_customer_email,
    p_cottage_food_acknowledged_at
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.order_items (order_id, dish_id, dish_name, price, quantity)
    VALUES (
      v_order_id,
      (v_item->>'dish_id')::uuid,
      v_item->>'dish_name',
      (v_item->>'price')::numeric,
      (v_item->>'quantity')::int
    );
  END LOOP;

  RETURN v_order_id;
END;
$$;

COMMIT;
