-- =============================================================================
-- Migration: session_1_5_schema_fixes
-- Created:   2026-05-04
-- Purpose:   Tag all existing rows as test data, fix is_active default,
--            fix created_at type, add customer-facing filter index.
--
-- Context:   As of 2026-05-04, all 29 rows in home_restaurants are test/seed
--            fixtures (29 chefs, 77 dishes, 54 orders, 62 order_items — all
--            confirmed test data). Real chefs will be inserted after this
--            migration with is_test_data = false (the new default).
--
-- Apply:     Paste into Supabase SQL Editor and execute.
--            Expect: "Success. No rows returned."
-- =============================================================================

BEGIN;

-- a) Add is_test_data flag — default false so new real chefs are correctly tagged
ALTER TABLE public.home_restaurants
  ADD COLUMN IF NOT EXISTS is_test_data boolean NOT NULL DEFAULT false;

-- b) Mark ALL existing rows as test data (all 29 confirmed test fixtures)
UPDATE public.home_restaurants SET is_test_data = true;

-- c) Fix is_active default — was true (dangerous with activation trigger), now false
ALTER TABLE public.home_restaurants
  ALTER COLUMN is_active SET DEFAULT false;

-- d) Fix created_at type — interpret existing rows as UTC
ALTER TABLE public.home_restaurants
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

-- e) Partial index for the customer-facing double filter (is_active + is_test_data)
CREATE INDEX IF NOT EXISTS home_restaurants_active_real_idx
  ON public.home_restaurants (is_active)
  WHERE is_active = true AND is_test_data = false;

COMMIT;
