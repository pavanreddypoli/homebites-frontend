-- =============================================================================
-- Migration: compliance_foundation
-- Created:   2026-05-04
-- Purpose:   DB foundation for Texas Cottage Food Law (SB 541) compliance.
--            Adds compliance columns to home_restaurants + dishes,
--            creates compliance_audit_log and moderation_queue tables,
--            and installs the activation guard trigger.
-- Apply:     Run in Supabase SQL Editor (or via CLI: supabase db push)
-- =============================================================================


-- ─── 1. home_restaurants — compliance columns ─────────────────────────────────

ALTER TABLE public.home_restaurants
  ADD COLUMN IF NOT EXISTS food_handler_cert_url           text,
  ADD COLUMN IF NOT EXISTS food_handler_cert_expires_at    date,
  ADD COLUMN IF NOT EXISTS cottage_food_attestation_at     timestamptz,
  ADD COLUMN IF NOT EXISTS chef_agreement_version          text,
  ADD COLUMN IF NOT EXISTS chef_agreement_accepted_at      timestamptz,
  ADD COLUMN IF NOT EXISTS chef_agreement_ip               text,
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id       text,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled          boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS dshs_registration_id            text,
  ADD COLUMN IF NOT EXISTS sells_tcs_foods                 boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS labeling_acknowledged_at        timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_at                    timestamptz,
  ADD COLUMN IF NOT EXISTS suspension_reason               text;


-- ─── 2. dishes — moderation + allergen columns ────────────────────────────────

ALTER TABLE public.dishes
  ADD COLUMN IF NOT EXISTS allergens          text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_tcs             boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS moderation_status  text    DEFAULT 'pending_review';

-- Enforce allowed values for moderation_status
ALTER TABLE public.dishes
  DROP CONSTRAINT IF EXISTS dishes_moderation_status_check;

ALTER TABLE public.dishes
  ADD CONSTRAINT dishes_moderation_status_check
    CHECK (moderation_status IN ('pending_review', 'approved', 'rejected', 'auto_approved'));

-- Back-fill: existing dishes are considered approved (they predate moderation)
UPDATE public.dishes
  SET moderation_status = 'auto_approved'
  WHERE moderation_status = 'pending_review';


-- ─── 3. compliance_audit_log ──────────────────────────────────────────────────
-- Append-only. No UPDATE or DELETE ever allowed — enforced by RLS and trigger.

CREATE TABLE IF NOT EXISTS public.compliance_audit_log (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        REFERENCES auth.users(id),
  home_restaurant_id  uuid        REFERENCES public.home_restaurants(id),
  event_type          text        NOT NULL,
  -- e.g. 'cottage_food_attestation' | 'agreement_accepted' | 'cert_uploaded'
  -- | 'stripe_connect_linked' | 'labeling_acknowledged' | 'activation_attempted'
  -- | 'cert_expired_deactivation' | 'manual_suspension' | 'annual_reattestation'
  event_data          jsonb,
  ip_address          text,
  user_agent          text,
  created_at          timestamptz DEFAULT now()
);

-- Index for per-chef lookup (chef dashboard, admin view)
CREATE INDEX IF NOT EXISTS compliance_audit_log_restaurant_idx
  ON public.compliance_audit_log (home_restaurant_id, created_at DESC);

-- RLS
ALTER TABLE public.compliance_audit_log ENABLE ROW LEVEL SECURITY;

-- Chefs can read their own rows; admins can read all rows
CREATE POLICY "compliance_audit_log_chef_select"
  ON public.compliance_audit_log
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- INSERT only via service role (anon + authenticated get no INSERT policy)
-- (No INSERT policy here — service role bypasses RLS entirely)

-- Hard deny UPDATE for everyone including service role at the RLS layer.
-- Service role bypasses RLS, so we enforce immutability via trigger instead.
CREATE POLICY "compliance_audit_log_deny_update"
  ON public.compliance_audit_log
  FOR UPDATE
  USING (false);

CREATE POLICY "compliance_audit_log_deny_delete"
  ON public.compliance_audit_log
  FOR DELETE
  USING (false);

-- Trigger to make the table truly append-only (catches service role too)
CREATE OR REPLACE FUNCTION public.compliance_audit_log_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'compliance_audit_log is append-only — UPDATE and DELETE are not permitted';
END;
$$;

DROP TRIGGER IF EXISTS trg_compliance_audit_log_immutable ON public.compliance_audit_log;

CREATE TRIGGER trg_compliance_audit_log_immutable
  BEFORE UPDATE OR DELETE ON public.compliance_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.compliance_audit_log_immutable();


-- ─── 4. moderation_queue ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.moderation_queue (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id             int8        REFERENCES public.dishes(id),
  chef_id             uuid        REFERENCES public.home_restaurants(id),
  ai_classification   jsonb,
  ai_decision         text,
  -- 'allow' | 'block' | 'review'
  ai_confidence       numeric,
  human_decision      text,
  -- 'approved' | 'rejected'
  human_reason        text,
  human_reviewer_id   uuid        REFERENCES auth.users(id),
  reviewed_at         timestamptz,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS moderation_queue_dish_idx
  ON public.moderation_queue (dish_id);

CREATE INDEX IF NOT EXISTS moderation_queue_unreviewed_idx
  ON public.moderation_queue (created_at ASC)
  WHERE human_decision IS NULL;

ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;

-- Admin-only: only users with role='admin' in user_metadata can access.
-- WITH CHECK mirrors USING so INSERT/UPDATE are also gated.
-- No deny policy needed — RLS with no matching policy defaults to deny.
CREATE POLICY "moderation_queue_admin_all"
  ON public.moderation_queue
  FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );


-- ─── 5. Activation guard trigger on home_restaurants ─────────────────────────
-- BEFORE INSERT OR UPDATE — fires when is_active = true is being set.
--   INSERT path: fires if NEW.is_active = true on creation (gap coverage).
--   UPDATE path: fires only when is_active flips false → true.
-- Normal UPDATEs that don't touch is_active pass through unaffected.
-- Raises a descriptive exception naming the specific failed condition.

CREATE OR REPLACE FUNCTION public.check_activation_requirements()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Determine whether we need to run checks.
  -- INSERT: only if is_active = true on creation.
  -- UPDATE: only if is_active is being flipped to true.
  -- All other cases: pass through immediately.
  IF NOT (
    NEW.is_active = true AND (
      TG_OP = 'INSERT'
      OR (TG_OP = 'UPDATE' AND OLD.is_active IS DISTINCT FROM NEW.is_active)
    )
  ) THEN
    RETURN NEW;
  END IF;

  IF NEW.food_handler_cert_url IS NULL THEN
    RAISE EXCEPTION 'Cannot activate: food_handler_cert_url is missing';
  END IF;

  IF NEW.food_handler_cert_expires_at IS NULL OR
     NEW.food_handler_cert_expires_at <= current_date THEN
    RAISE EXCEPTION 'Cannot activate: food_handler_cert has expired or expiry date is missing';
  END IF;

  IF NEW.cottage_food_attestation_at IS NULL THEN
    RAISE EXCEPTION 'Cannot activate: cottage_food_attestation_at is missing';
  END IF;

  IF NEW.chef_agreement_accepted_at IS NULL THEN
    RAISE EXCEPTION 'Cannot activate: chef_agreement_accepted_at is missing';
  END IF;

  IF NEW.stripe_payouts_enabled IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Cannot activate: stripe_payouts_enabled is false';
  END IF;

  IF NEW.labeling_acknowledged_at IS NULL THEN
    RAISE EXCEPTION 'Cannot activate: labeling_acknowledged_at is missing';
  END IF;

  IF NEW.sells_tcs_foods = true AND NEW.dshs_registration_id IS NULL THEN
    RAISE EXCEPTION 'Cannot activate: sells_tcs_foods is true but dshs_registration_id is missing';
  END IF;

  IF NEW.suspended_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot activate: restaurant is suspended (suspended_at is set)';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_activation ON public.home_restaurants;

CREATE TRIGGER trg_check_activation
  BEFORE INSERT OR UPDATE ON public.home_restaurants
  FOR EACH ROW EXECUTE FUNCTION public.check_activation_requirements();
