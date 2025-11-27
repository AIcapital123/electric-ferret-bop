-- Enhanced fields (non-breaking additions)
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS loan_type TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS business_type TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS monthly_revenue NUMERIC;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS time_in_business TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS credit_score INTEGER;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS zip_code TEXT;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_deals_loan_type ON public.deals(loan_type);
CREATE INDEX IF NOT EXISTS idx_deals_created_date ON public.deals ((DATE(created_at)));
CREATE INDEX IF NOT EXISTS idx_deals_status_created ON public.deals(status, created_at);
CREATE INDEX IF NOT EXISTS idx_deals_amount_range ON public.deals(loan_amount_sought);