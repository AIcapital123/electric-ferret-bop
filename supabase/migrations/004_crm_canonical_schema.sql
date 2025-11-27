-- Canonical schema updates for deals table

-- Add missing canonical columns if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deals' AND column_name='loan_amount') THEN
    ALTER TABLE public.deals ADD COLUMN loan_amount numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deals' AND column_name='revenue_annual') THEN
    ALTER TABLE public.deals ADD COLUMN revenue_annual numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deals' AND column_name='notes_internal') THEN
    ALTER TABLE public.deals ADD COLUMN notes_internal text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deals' AND column_name='assigned_to') THEN
    ALTER TABLE public.deals ADD COLUMN assigned_to text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deals' AND column_name='email') THEN
    ALTER TABLE public.deals ADD COLUMN email text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deals' AND column_name='phone') THEN
    ALTER TABLE public.deals ADD COLUMN phone text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deals' AND column_name='industry') THEN
    ALTER TABLE public.deals ADD COLUMN industry text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deals' AND column_name='state') THEN
    ALTER TABLE public.deals ADD COLUMN state text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deals' AND column_name='fico_score') THEN
    ALTER TABLE public.deals ADD COLUMN fico_score integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deals' AND column_name='use_of_funds') THEN
    ALTER TABLE public.deals ADD COLUMN use_of_funds text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deals' AND column_name='cognito_raw') THEN
    ALTER TABLE public.deals ADD COLUMN cognito_raw jsonb;
  END IF;
END $$;

-- Migrate legacy loan_amount_sought into loan_amount
UPDATE public.deals
SET loan_amount = COALESCE(loan_amount, loan_amount_sought)
WHERE loan_amount IS NULL AND loan_amount_sought IS NOT NULL;

-- Normalize legacy statuses to canonical values
UPDATE public.deals SET status = 'new' WHERE status ILIKE 'new%';
UPDATE public.deals SET status = 'in_review' WHERE status ILIKE 'under review%' OR status ILIKE 'in%review%';
UPDATE public.deals SET status = 'missing_docs' WHERE status ILIKE 'missing%' OR status ILIKE 'missing information%';
UPDATE public.deals SET status = 'submitted' WHERE status ILIKE 'submitted%';
UPDATE public.deals SET status = 'approved' WHERE status ILIKE 'approved%';
UPDATE public.deals SET status = 'funded' WHERE status ILIKE 'funded%';
UPDATE public.deals SET status = 'declined' WHERE status ILIKE 'declined%' OR status ILIKE 'lost%' OR status ILIKE 'not interested%';

-- Backfill timestamps
UPDATE public.deals SET created_at = COALESCE(created_at, NOW()) WHERE created_at IS NULL;
UPDATE public.deals SET updated_at = COALESCE(updated_at, NOW()) WHERE updated_at IS NULL;

-- Ensure user_id never NULL; backfill and enforce NOT NULL
UPDATE public.deals SET user_id = '00000000-0000-0000-0000-000000000001' WHERE user_id IS NULL;
ALTER TABLE public.deals ALTER COLUMN user_id SET NOT NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS deals_status_idx ON public.deals (status);
CREATE INDEX IF NOT EXISTS deals_created_at_idx ON public.deals (created_at);
CREATE INDEX IF NOT EXISTS deals_loan_amount_idx ON public.deals (loan_amount);
CREATE UNIQUE INDEX IF NOT EXISTS deals_cognito_entry_id_uq ON public.deals (cognito_entry_id);

-- Create system user profile if missing (ownership for webhook ingestions)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000001') THEN
    INSERT INTO public.profiles (id, full_name, role) VALUES ('00000000-0000-0000-0000-000000000001', 'System User', 'assistant');
  END IF;
END $$;

-- RLS policies per requirements
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Helper: is_admin() based on email or app_metadata.role
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  u RECORD;
BEGIN
  SELECT id, email, app_metadata INTO u FROM auth.users WHERE id = uid;
  IF u IS NULL THEN
    RETURN FALSE;
  END IF;

  IF (lower(u.email) IN ('chris@gokapital.com','deals@gokapital.com','info@gokapital.com')) THEN
    RETURN TRUE;
  END IF;

  IF (COALESCE(u.app_metadata->>'role','') = 'admin') THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- SELECT: all authenticated users can read all deals
DROP POLICY IF EXISTS deals_select_all ON public.deals;
CREATE POLICY deals_select_all ON public.deals
FOR SELECT TO authenticated
USING (true);

-- INSERT: authenticated users may insert deals only for themselves (manual ingestion)
DROP POLICY IF EXISTS deals_insert ON public.deals;
CREATE POLICY deals_insert ON public.deals
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE collaborative fields: allow for all authenticated users provided sensitive fields are unchanged
DROP POLICY IF EXISTS deals_update_collab ON public.deals;
CREATE POLICY deals_update_collab ON public.deals
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (
  public.is_admin(auth.uid())
  OR (
    NEW.client_name IS NOT DISTINCT FROM OLD.client_name
    AND NEW.legal_company_name IS NOT DISTINCT FROM OLD.legal_company_name
    AND NEW.email IS NOT DISTINCT FROM OLD.email
    AND NEW.phone IS NOT DISTINCT FROM OLD.phone
  )
);

-- UPDATE sensitive fields: only admins
DROP POLICY IF EXISTS deals_update_admin_sensitive ON public.deals;
CREATE POLICY deals_update_admin_sensitive ON public.deals
FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- DELETE: only admins
DROP POLICY IF EXISTS deals_delete_admin ON public.deals;
CREATE POLICY deals_delete_admin ON public.deals
FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));