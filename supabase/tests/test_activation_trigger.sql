-- =============================================================================
-- Test: trg_check_activation on home_restaurants
-- Purpose: Verify the activation trigger blocks is_active = true until every
--          compliance condition is satisfied, then succeeds when all pass.
--          Also verifies the INSERT path (Fix 5) and audit log immutability.
--
-- Run:     Paste the entire file into the Supabase SQL Editor and execute.
--          The SQL Editor runs as service role, which is required.
--
-- Strategy:
--   Wrapped in a single transaction. The home_restaurants_id_fkey FK is
--   temporarily dropped so we can insert a synthetic test row without needing
--   a matching auth.users entry. SAVEPOINT lets you recover if a mid-test
--   error leaves the test row behind.
--
-- Recovery (if something goes wrong mid-run):
--   ROLLBACK TO SAVEPOINT sp_tests_start;
--   DELETE FROM public.home_restaurants
--     WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
--   ALTER TABLE public.home_restaurants
--     ADD CONSTRAINT home_restaurants_id_fkey
--     FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
--   COMMIT;
-- =============================================================================

BEGIN;

-- ─── Setup: temporarily drop FK, insert test row ─────────────────────────────
-- Drop the FK so no auth.users row is needed for our synthetic UUID.
ALTER TABLE public.home_restaurants
  DROP CONSTRAINT IF EXISTS home_restaurants_id_fkey;

-- SAVEPOINT: if tests leave dirty state, roll back to here.
SAVEPOINT sp_tests_start;

INSERT INTO public.home_restaurants (id, name, cuisine, is_active)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Test Trigger Kitchen',
  'Test',
  false
)
ON CONFLICT (id) DO NOTHING;

-- Verify setup
DO $$
BEGIN
  RAISE NOTICE 'Setup complete: test chef row inserted (id = aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa)';
END;
$$;

-- Expected:
-- NOTICE: Setup complete: test chef row inserted (id = aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa)


-- ─── Test 0: INSERT with is_active = true is blocked ─────────────────────────
-- Covers the INSERT path added in Fix 5. Onboarding always inserts is_active=false
-- but the gap must not exist.

DO $$
BEGIN
  INSERT INTO public.home_restaurants (id, name, cuisine, is_active)
  VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Bad Insert Kitchen',
    'Test',
    true  -- attempt to create already-active
  );
  RAISE EXCEPTION 'Test 0 FAILED: INSERT with is_active=true should have been blocked';
EXCEPTION
  WHEN others THEN
    IF SQLERRM = 'Cannot activate: food_handler_cert_url is missing' THEN
      RAISE NOTICE 'Test 0 PASSED: INSERT with is_active=true correctly blocked: %', SQLERRM;
    ELSE
      RAISE EXCEPTION 'Test 0 FAILED: unexpected error: %', SQLERRM;
    END IF;
END;
$$;

-- Expected:
-- NOTICE: Test 0 PASSED: INSERT with is_active=true correctly blocked: Cannot activate: food_handler_cert_url is missing


-- ─── Test 1: All fields missing → blocked on food_handler_cert_url ───────────

DO $$
BEGIN
  UPDATE public.home_restaurants
  SET is_active = true
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  RAISE EXCEPTION 'Test 1 FAILED: expected trigger to block, but UPDATE succeeded';
EXCEPTION
  WHEN others THEN
    IF SQLERRM = 'Cannot activate: food_handler_cert_url is missing' THEN
      RAISE NOTICE 'Test 1 PASSED: %', SQLERRM;
    ELSE
      RAISE EXCEPTION 'Test 1 FAILED: unexpected error: %', SQLERRM;
    END IF;
END;
$$;

-- Expected:
-- NOTICE: Test 1 PASSED: Cannot activate: food_handler_cert_url is missing


-- ─── Test 2: Cert URL present, no expiry → blocked on expiry ─────────────────

UPDATE public.home_restaurants
  SET food_handler_cert_url = 'https://storage.example.com/certs/test.pdf'
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

DO $$
BEGIN
  UPDATE public.home_restaurants
  SET is_active = true
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  RAISE EXCEPTION 'Test 2 FAILED: expected trigger to block, but UPDATE succeeded';
EXCEPTION
  WHEN others THEN
    IF SQLERRM = 'Cannot activate: food_handler_cert has expired or expiry date is missing' THEN
      RAISE NOTICE 'Test 2 PASSED: %', SQLERRM;
    ELSE
      RAISE EXCEPTION 'Test 2 FAILED: unexpected error: %', SQLERRM;
    END IF;
END;
$$;

-- Expected:
-- NOTICE: Test 2 PASSED: Cannot activate: food_handler_cert has expired or expiry date is missing


-- ─── Test 2b: Past expiry date → still blocked on expiry ─────────────────────

UPDATE public.home_restaurants
  SET food_handler_cert_expires_at = current_date - interval '1 day'
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

DO $$
BEGIN
  UPDATE public.home_restaurants
  SET is_active = true
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  RAISE EXCEPTION 'Test 2b FAILED: expired cert should have blocked activation';
EXCEPTION
  WHEN others THEN
    IF SQLERRM = 'Cannot activate: food_handler_cert has expired or expiry date is missing' THEN
      RAISE NOTICE 'Test 2b PASSED: expired cert correctly blocked: %', SQLERRM;
    ELSE
      RAISE EXCEPTION 'Test 2b FAILED: unexpected error: %', SQLERRM;
    END IF;
END;
$$;

-- Expected:
-- NOTICE: Test 2b PASSED: expired cert correctly blocked: Cannot activate: food_handler_cert has expired or expiry date is missing


-- ─── Test 3: Valid future cert → blocked on cottage_food_attestation_at ───────

UPDATE public.home_restaurants
  SET food_handler_cert_expires_at = current_date + interval '1 year'
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

DO $$
BEGIN
  UPDATE public.home_restaurants
  SET is_active = true
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  RAISE EXCEPTION 'Test 3 FAILED: expected trigger to block, but UPDATE succeeded';
EXCEPTION
  WHEN others THEN
    IF SQLERRM = 'Cannot activate: cottage_food_attestation_at is missing' THEN
      RAISE NOTICE 'Test 3 PASSED: %', SQLERRM;
    ELSE
      RAISE EXCEPTION 'Test 3 FAILED: unexpected error: %', SQLERRM;
    END IF;
END;
$$;

-- Expected:
-- NOTICE: Test 3 PASSED: Cannot activate: cottage_food_attestation_at is missing


-- ─── Test 4: Attestation present → blocked on chef_agreement_accepted_at ──────

UPDATE public.home_restaurants
  SET cottage_food_attestation_at = now()
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

DO $$
BEGIN
  UPDATE public.home_restaurants
  SET is_active = true
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  RAISE EXCEPTION 'Test 4 FAILED: expected trigger to block, but UPDATE succeeded';
EXCEPTION
  WHEN others THEN
    IF SQLERRM = 'Cannot activate: chef_agreement_accepted_at is missing' THEN
      RAISE NOTICE 'Test 4 PASSED: %', SQLERRM;
    ELSE
      RAISE EXCEPTION 'Test 4 FAILED: unexpected error: %', SQLERRM;
    END IF;
END;
$$;

-- Expected:
-- NOTICE: Test 4 PASSED: Cannot activate: chef_agreement_accepted_at is missing


-- ─── Test 5: Agreement accepted → blocked on stripe_payouts_enabled ───────────

UPDATE public.home_restaurants
  SET chef_agreement_version     = '1.0',
      chef_agreement_accepted_at = now(),
      chef_agreement_ip          = '127.0.0.1'
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

DO $$
BEGIN
  UPDATE public.home_restaurants
  SET is_active = true
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  RAISE EXCEPTION 'Test 5 FAILED: expected trigger to block, but UPDATE succeeded';
EXCEPTION
  WHEN others THEN
    IF SQLERRM = 'Cannot activate: stripe_payouts_enabled is false' THEN
      RAISE NOTICE 'Test 5 PASSED: %', SQLERRM;
    ELSE
      RAISE EXCEPTION 'Test 5 FAILED: unexpected error: %', SQLERRM;
    END IF;
END;
$$;

-- Expected:
-- NOTICE: Test 5 PASSED: Cannot activate: stripe_payouts_enabled is false


-- ─── Test 6: Stripe enabled → blocked on labeling_acknowledged_at ────────────

UPDATE public.home_restaurants
  SET stripe_connect_account_id = 'acct_test000000000000',
      stripe_payouts_enabled    = true
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

DO $$
BEGIN
  UPDATE public.home_restaurants
  SET is_active = true
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  RAISE EXCEPTION 'Test 6 FAILED: expected trigger to block, but UPDATE succeeded';
EXCEPTION
  WHEN others THEN
    IF SQLERRM = 'Cannot activate: labeling_acknowledged_at is missing' THEN
      RAISE NOTICE 'Test 6 PASSED: %', SQLERRM;
    ELSE
      RAISE EXCEPTION 'Test 6 FAILED: unexpected error: %', SQLERRM;
    END IF;
END;
$$;

-- Expected:
-- NOTICE: Test 6 PASSED: Cannot activate: labeling_acknowledged_at is missing


-- ─── Test 7: TCS foods set, no DSHS ID → blocked on dshs_registration_id ─────

UPDATE public.home_restaurants
  SET labeling_acknowledged_at = now(),
      sells_tcs_foods          = true
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

DO $$
BEGIN
  UPDATE public.home_restaurants
  SET is_active = true
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  RAISE EXCEPTION 'Test 7 FAILED: expected trigger to block, but UPDATE succeeded';
EXCEPTION
  WHEN others THEN
    IF SQLERRM = 'Cannot activate: sells_tcs_foods is true but dshs_registration_id is missing' THEN
      RAISE NOTICE 'Test 7 PASSED: %', SQLERRM;
    ELSE
      RAISE EXCEPTION 'Test 7 FAILED: unexpected error: %', SQLERRM;
    END IF;
END;
$$;

-- Expected:
-- NOTICE: Test 7 PASSED: Cannot activate: sells_tcs_foods is true but dshs_registration_id is missing


-- ─── Test 7b: Suspended restaurant → blocked on suspended_at ─────────────────
-- Reset sells_tcs_foods=false (skips DSHS check) to isolate the suspension check.

UPDATE public.home_restaurants
  SET sells_tcs_foods   = false,
      suspended_at      = now(),
      suspension_reason = 'testing suspension block'
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

DO $$
BEGIN
  UPDATE public.home_restaurants
  SET is_active = true
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  RAISE EXCEPTION 'Test 7b FAILED: suspended chef should not activate';
EXCEPTION
  WHEN others THEN
    IF SQLERRM = 'Cannot activate: restaurant is suspended (suspended_at is set)' THEN
      RAISE NOTICE 'Test 7b PASSED: %', SQLERRM;
    ELSE
      RAISE EXCEPTION 'Test 7b FAILED: unexpected error: %', SQLERRM;
    END IF;
END;
$$;

-- Expected:
-- NOTICE: Test 7b PASSED: Cannot activate: restaurant is suspended (suspended_at is set)


-- ─── Test 8: All conditions met → activation succeeds ────────────────────────

UPDATE public.home_restaurants
  SET suspended_at      = NULL,
      suspension_reason = NULL,
      sells_tcs_foods   = false   -- non-TCS: dshs_registration_id not required
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

DO $$
DECLARE
  v_active boolean;
BEGIN
  UPDATE public.home_restaurants
  SET is_active = true
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  SELECT is_active INTO v_active
  FROM public.home_restaurants
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  IF v_active = true THEN
    RAISE NOTICE 'Test 8 PASSED: is_active = true — all conditions met, activation succeeded';
  ELSE
    RAISE EXCEPTION 'Test 8 FAILED: UPDATE did not raise but is_active is still false';
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Test 8 FAILED: unexpected error: %', SQLERRM;
END;
$$;

-- Expected:
-- NOTICE: Test 8 PASSED: is_active = true — all conditions met, activation succeeded


-- ─── Test 9: Normal UPDATE (not touching is_active) passes through freely ─────

DO $$
BEGIN
  UPDATE public.home_restaurants
  SET name = 'Test Trigger Kitchen (renamed)'
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  RAISE NOTICE 'Test 9 PASSED: non-activation UPDATE passes through without trigger interference';
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Test 9 FAILED: non-activation UPDATE was blocked unexpectedly: %', SQLERRM;
END;
$$;

-- Expected:
-- NOTICE: Test 9 PASSED: non-activation UPDATE passes through without trigger interference


-- ─── Test 10: compliance_audit_log is append-only ────────────────────────────
-- Uses NULL for user_id and home_restaurant_id to avoid FK entanglement with
-- the test chef row — allows clean deletion of the chef row in cleanup below.

DO $$
DECLARE
  v_log_id uuid;
BEGIN
  -- INSERT should succeed (service role)
  INSERT INTO public.compliance_audit_log (
    user_id, home_restaurant_id, event_type, event_data
  ) VALUES (
    NULL,
    NULL,
    'test_event',
    '{"note":"trigger test — nullable FKs intentional"}'::jsonb
  )
  RETURNING id INTO v_log_id;

  RAISE NOTICE 'Test 10a PASSED: INSERT into compliance_audit_log succeeded (id = %)', v_log_id;

  -- UPDATE must be blocked by immutability trigger
  BEGIN
    UPDATE public.compliance_audit_log
    SET event_type = 'tampered'
    WHERE id = v_log_id;
    RAISE EXCEPTION 'Test 10b FAILED: UPDATE should have been blocked';
  EXCEPTION
    WHEN others THEN
      IF SQLERRM = 'compliance_audit_log is append-only — UPDATE and DELETE are not permitted' THEN
        RAISE NOTICE 'Test 10b PASSED: UPDATE correctly blocked: %', SQLERRM;
      ELSE
        RAISE EXCEPTION 'Test 10b FAILED: unexpected error on UPDATE: %', SQLERRM;
      END IF;
  END;

  -- DELETE must be blocked by immutability trigger
  BEGIN
    DELETE FROM public.compliance_audit_log WHERE id = v_log_id;
    RAISE EXCEPTION 'Test 10c FAILED: DELETE should have been blocked';
  EXCEPTION
    WHEN others THEN
      IF SQLERRM = 'compliance_audit_log is append-only — UPDATE and DELETE are not permitted' THEN
        RAISE NOTICE 'Test 10c PASSED: DELETE correctly blocked: %', SQLERRM;
      ELSE
        RAISE EXCEPTION 'Test 10c FAILED: unexpected error on DELETE: %', SQLERRM;
      END IF;
  END;
END;
$$;

-- Expected:
-- NOTICE: Test 10a PASSED: INSERT into compliance_audit_log succeeded (id = <uuid>)
-- NOTICE: Test 10b PASSED: UPDATE correctly blocked: compliance_audit_log is append-only — UPDATE and DELETE are not permitted
-- NOTICE: Test 10c PASSED: DELETE correctly blocked: compliance_audit_log is append-only — UPDATE and DELETE are not permitted


-- ─── Cleanup + FK restore ─────────────────────────────────────────────────────
-- Delete the test chef row first, THEN restore the FK.
-- Order matters: the FK constraint must not be in place while the test row
-- (which has no matching auth.users entry) still exists.

DELETE FROM public.home_restaurants
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

ALTER TABLE public.home_restaurants
  ADD CONSTRAINT home_restaurants_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

DO $$
BEGIN
  RAISE NOTICE 'Cleanup complete: test row deleted, home_restaurants_id_fkey restored';
  RAISE NOTICE 'Note: compliance_audit_log test row (NULL FKs) remains — harmless artifact';
END;
$$;

-- Expected:
-- NOTICE: Cleanup complete: test row deleted, home_restaurants_id_fkey restored
-- NOTICE: Note: compliance_audit_log test row (NULL FKs) remains — harmless artifact

COMMIT;
