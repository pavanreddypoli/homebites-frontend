BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cottage_food_acknowledged_at timestamptz;

COMMIT;
