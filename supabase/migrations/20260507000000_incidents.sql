-- Session 9: Incident response infrastructure

CREATE TABLE IF NOT EXISTS public.incidents (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_email    text NOT NULL,
  subject_chef_id   uuid REFERENCES public.home_restaurants(id) ON DELETE SET NULL,
  subject_order_id  uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  severity          text NOT NULL CHECK (severity IN ('P0','P1','P2','P3')),
  category          text NOT NULL CHECK (category IN (
                      'illness_report','allergen_mislabeling','foreign_object',
                      'spoilage_mold','fraud_misrepresentation','service_complaint','other'
                    )),
  status            text NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','closed')),
  description       text NOT NULL,
  resolution_notes  text,
  resolved_at       timestamptz,
  resolver_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_incidents_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.set_incidents_updated_at();

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Authenticated reporters can read their own incidents
CREATE POLICY incidents_reporter_select ON public.incidents FOR SELECT
  USING (auth.uid() = reporter_id);

-- FIX 2: Only authenticated users can INSERT with their own reporter_id.
-- Guest reports (reporter_id IS NULL) go through the API which uses service role (bypasses RLS).
-- This blocks anon-key spam directly against the table.
CREATE POLICY incidents_reporter_insert ON public.incidents FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);
