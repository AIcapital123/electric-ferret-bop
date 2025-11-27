-- Create deals table if it doesn't exist
CREATE TABLE IF NOT EXISTS deals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    date_submitted DATE NOT NULL,
    loan_type TEXT NOT NULL,
    legal_company_name TEXT NOT NULL,
    client_name TEXT NOT NULL,
    loan_amount DECIMAL NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add CognitoForms support columns to deals table
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'gmail',
ADD COLUMN IF NOT EXISTS cognito_entry_id TEXT,
ADD COLUMN IF NOT EXISTS form_id TEXT,
ADD COLUMN IF NOT EXISTS form_name TEXT,
ADD COLUMN IF NOT EXISTS form_data JSONB,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS revenue DECIMAL,
ADD COLUMN IF NOT EXISTS time_in_business TEXT;

-- Create index for CognitoForms entry ID
CREATE INDEX IF NOT EXISTS idx_deals_cognito_entry_id ON deals(cognito_entry_id);

-- Create index for source
CREATE INDEX IF NOT EXISTS idx_deals_source ON deals(source);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_deals_date_submitted ON deals(date_submitted);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_loan_amount ON deals(loan_amount);

-- Create function to generate sample deals for test accounts
CREATE OR REPLACE FUNCTION generate_sample_deals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
  i integer;
  sample_companies text[] := ARRAY['Acme Corp', 'Tech Solutions Inc', 'Global Retail LLC', 'Manufacturing Plus', 'Service Pro Industries', 'Digital Ventures', 'Supply Chain Co', 'Consulting Group', 'Innovations Ltd', 'Commerce Hub'];
  sample_names text[] := ARRAY['John Smith', 'Maria Garcia', 'David Johnson', 'Sarah Williams', 'Michael Brown', 'Jennifer Davis', 'Robert Miller', 'Lisa Wilson', 'James Moore', 'Patricia Taylor'];
  loan_types text[] := ARRAY['Working Capital', 'Equipment Financing', 'Business Expansion', 'Real Estate', 'Line of Credit', 'SBA Loan', 'Invoice Financing'];
  statuses text[] := ARRAY['Application Submitted', 'Reviewing', 'Approved', 'Funded', 'Denied', 'More Information Needed'];
  industries text[] := ARRAY['Technology', 'Retail', 'Manufacturing', 'Healthcare', 'Construction', 'Restaurant', 'Professional Services', 'Transportation', 'Wholesale', 'Real Estate'];
BEGIN
  -- Get the current user's ID
  user_id := auth.uid();
  
  -- Generate 50 sample deals with varied data
  FOR i IN 1..50 LOOP
    INSERT INTO deals (
      user_id,
      date_submitted,
      loan_type,
      legal_company_name,
      client_name,
      loan_amount,
      status,
      source,
      email,
      phone,
      industry,
      revenue,
      time_in_business,
      created_at,
      updated_at
    ) VALUES (
      user_id,
      CURRENT_DATE - INTERVAL '1 day' * (random() * 60)::integer, -- Random date within last 60 days
      loan_types[1 + floor(random() * array_length(loan_types, 1))::integer],
      sample_companies[1 + floor(random() * array_length(sample_companies, 1))::integer] || ' ' || i,
      sample_names[1 + floor(random() * array_length(sample_names, 1))::integer],
      (random() * 900000 + 10000)::integer, -- Random amount between 10k and 910k
      statuses[1 + floor(random() * array_length(statuses, 1))::integer],
      'sample',
      'contact' || i || '@example.com',
      '555-' || lpad((random() * 999)::integer::text, 3, '0') || '-' || lpad((random() * 9999)::integer::text, 4, '0'),
      industries[1 + floor(random() * array_length(industries, 1))::integer],
      (random() * 5000000 + 100000)::integer, -- Random revenue between 100k and 5.1M
      (random() * 20 + 1)::integer || ' years', -- Random years between 1 and 21
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );
  END LOOP;
END;
$$;

-- Create or replace the deals view for dashboard
CREATE OR REPLACE VIEW deals_dashboard AS
SELECT 
  id,
  user_id,
  date_submitted,
  loan_type,
  legal_company_name,
  client_name,
  loan_amount,
  status,
  source,
  email,
  phone,
  industry,
  revenue,
  time_in_business,
  created_at,
  updated_at
FROM deals
WHERE date_submitted >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date_submitted DESC;

-- Grant permissions
GRANT SELECT ON deals_dashboard TO authenticated;
