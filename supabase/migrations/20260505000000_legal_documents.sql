-- =============================================================================
-- Migration: legal_documents
-- Created:   2026-05-05
-- Purpose:   Versioned legal document storage with public read access.
--            Content for v1.0.0 is seeded separately via scripts/seed_legal_v1.ts.
-- Apply:     Paste into Supabase SQL Editor. Expect: "Success. No rows returned."
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.legal_documents (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type      text        NOT NULL,
  -- 'chef_agreement' | 'terms_of_service' | 'privacy_policy'
  version       text        NOT NULL,
  -- semver string e.g. '1.0.0'
  content_md    text        NOT NULL,
  effective_at  timestamptz NOT NULL DEFAULT now(),
  superseded_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_documents
  ADD CONSTRAINT legal_documents_doc_type_check
  CHECK (doc_type IN ('chef_agreement', 'terms_of_service', 'privacy_policy'));

-- One live version per doc_type at a time (superseded_at IS NULL = live)
CREATE UNIQUE INDEX IF NOT EXISTS legal_documents_one_live_per_type
  ON public.legal_documents (doc_type)
  WHERE superseded_at IS NULL;

CREATE INDEX IF NOT EXISTS legal_documents_doc_type_idx
  ON public.legal_documents (doc_type, effective_at DESC);

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

-- Public read — no auth required; used by server-side anon client
CREATE POLICY "legal_documents_public_read"
  ON public.legal_documents
  FOR SELECT
  USING (true);

-- No INSERT/UPDATE policies = denied for anon and authenticated users.
-- Seeding and version updates use the service role, which bypasses RLS.

COMMIT;
