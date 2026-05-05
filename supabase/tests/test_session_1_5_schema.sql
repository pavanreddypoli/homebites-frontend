-- =============================================================================
-- Test: session_1_5_schema_fixes verification
-- Purpose: Confirm migration 20260504120000 applied correctly.
--
-- Run:     Paste into Supabase SQL Editor and execute.
--          Expect 4 PASSED NOTICE lines. No rows returned (ROLLBACK at end).
--
-- Note:    This is read-only verification — ROLLBACK at end ensures no changes.
-- =============================================================================

BEGIN;

-- Check 1: all existing rows tagged as test data
DO $$
DECLARE v_total int; v_test int;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.home_restaurants;
  SELECT COUNT(*) INTO v_test  FROM public.home_restaurants WHERE is_test_data = true;
  IF v_total = v_test THEN
    RAISE NOTICE 'Check 1 PASSED: all % rows tagged as test data', v_total;
  ELSE
    RAISE EXCEPTION 'Check 1 FAILED: % of % rows are tagged as test data', v_test, v_total;
  END IF;
END $$;

-- Check 2: is_active default is now false
DO $$
DECLARE v_default text;
BEGIN
  SELECT column_default INTO v_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'home_restaurants'
    AND column_name  = 'is_active';
  IF v_default = 'false' THEN
    RAISE NOTICE 'Check 2 PASSED: is_active default is now false';
  ELSE
    RAISE EXCEPTION 'Check 2 FAILED: is_active default is %', v_default;
  END IF;
END $$;

-- Check 3: created_at is timestamptz
DO $$
DECLARE v_type text;
BEGIN
  SELECT data_type INTO v_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'home_restaurants'
    AND column_name  = 'created_at';
  IF v_type = 'timestamp with time zone' THEN
    RAISE NOTICE 'Check 3 PASSED: created_at is timestamptz';
  ELSE
    RAISE EXCEPTION 'Check 3 FAILED: created_at is %', v_type;
  END IF;
END $$;

-- Check 4: partial index exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname  = 'home_restaurants_active_real_idx'
  ) THEN
    RAISE NOTICE 'Check 4 PASSED: filter index home_restaurants_active_real_idx exists';
  ELSE
    RAISE EXCEPTION 'Check 4 FAILED: filter index missing';
  END IF;
END $$;

ROLLBACK;
