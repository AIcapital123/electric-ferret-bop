-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure deals table exists (create minimal schema if missing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deals') THEN
    CREATE TABLE public.deals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      date_submitted DATE,
      loan_type TEXT,
      legal_company_name TEXT,
      client_name TEXT,
      client_email TEXT,
      client_phone TEXT,
      loan_amount_sought NUMERIC,
      status TEXT DEFAULT 'New',
      source TEXT DEFAULT 'Manual',
      gmail_message_id TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  END IF;
END $$;

-- Add enhanced Cognito fields (safe IF NOT EXISTS pattern)
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS cognito_entry_id TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS cognito_form_id TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS cognito_raw JSONB;

-- Ensure core fields exist (safe-add)
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS loan_type TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS legal_company_name TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS loan_amount_sought NUMERIC;

-- Associate to user (owner)
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Ensure created_at column (some projects already have one)
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- updated_at auto-update trigger
CREATE OR REPLACE FUNCTION public.deal_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'deal_updated_at_trg'
  ) THEN
    CREATE TRIGGER deal_updated_at_trg
      BEFORE UPDATE ON public.deals
      FOR EACH ROW
      EXECUTE FUNCTION public.deal_set_updated_at();
  END IF;
END $$;

-- Unique index for duplicate protection across forms
CREATE UNIQUE INDEX IF NOT EXISTS deals_unique_cognito ON public.deals (cognito_form_id, cognito_entry_id)
WHERE cognito_form_id IS NOT NULL AND cognito_entry_id IS NOT NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS deals_created_at_idx ON public.deals (created_at DESC);
CREATE INDEX IF NOT EXISTS deals_status_idx ON public.deals (status);
CREATE INDEX IF NOT EXISTS deals_loan_type_idx ON public.deals (loan_type);
CREATE INDEX IF NOT EXISTS deals_loan_amount_idx ON public.deals (loan_amount_sought);
CREATE INDEX IF NOT EXISTS deals_user_idx ON public.deals (user_id);
CREATE INDEX IF NOT EXISTS deals_source_idx ON public.deals (source);

-- Enable RLS
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Policies:
-- Allow authenticated users to read their own deals or test_data they own.
CREATE POLICY deals_select_own ON public.deals
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Allow service role (edge functions) full DML via postgres bypass; optional admin can be added separately.

-- Optional: Allow inserting by service clients only (handled by service role; no policy needed).