-- Authoritative numeric fields
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS loan_amount NUMERIC;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS revenue_annual NUMERIC;

-- Future-proof Cognito fields (additive)
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS use_of_funds TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS notes_internal TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS cognito_raw JSONB;

-- Optional enrichment fields
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS business_type TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS time_in_business TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS monthly_revenue NUMERIC;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS employees_count INTEGER;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS dba_name TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS naics_code TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS sic_code TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS ein_last4 TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS ownership_percent NUMERIC;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS years_in_business NUMERIC;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS deposit_count INTEGER;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS average_daily_balance NUMERIC;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS existing_debt_amount NUMERIC;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS rent_or_mortgage NUMERIC;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS attachments_meta JSONB;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS bank_statements_months INTEGER;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_deals_status_created ON public.deals(status, created_at);
CREATE INDEX IF NOT EXISTS idx_deals_loan_type ON public.deals(loan_type);
CREATE INDEX IF NOT EXISTS idx_deals_created_date ON public.deals ((DATE(created_at)));
CREATE INDEX IF NOT EXISTS idx_deals_amount ON public.deals(loan_amount);
CREATE INDEX IF NOT EXISTS idx_deals_source ON public.deals(source);
CREATE INDEX IF NOT EXISTS idx_deals_user ON public.deals(user_id);