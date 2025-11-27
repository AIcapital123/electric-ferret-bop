import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-days',
};

const COGNITO_CONFIG = {
  organizationId: '6f375664-c614-432c-849e-884e88423227',
  integrationId: '2539ddc3-6ea3-49ce-88f4-e9156c1cab7e',
  clientId: '3de3f830-cbc7-46e6-b96e-5f0167721830',
  apiToken: 'eyJhbGciOiJIUzI1NiIsImtpZCI6Ijg4YmYzNWNmLWM3ODEtNDQ3ZC1hYzc5LWMyODczMjNkNzg3ZCIsInR5cCI6IkpXVCJ9.eyJvcmdhbml6YXRpb25JZCI6IjZmMzc1NjY0LWM2MTQtNDMyYy04NDllLTg4NGU4ODQyMzIyNyIsImludGVncmF0aW9uSWQiOiIyNTM5ZGRjMy02ZWEzLTQ5Y2UtODhmNC1lOTE1NmMxY2FiN2UiLCJjbGllbnRJZCI6IjNkZTNmODMwLWNiYzctNDZlNi1iOTZlLTVmMDE2NzcyMTgzMCIsImp0aSI6ImEyMTNjYWM1LTA1NDAtNGJjNS1iYjkyLTc1MTI1NmU4NzAxNCIsImlhdCI6MTc2NDI1MzIzMCwiaXNzIjoiaHR0cHM6Ly93d3cuY29nbml0b2Zvcm1zLmNvbS8iLCJhdWQiOiJhcGkifQ.uh0f0oHcImThsxut9i8BCv7go1hfXvXAt7uUCjhYvfY'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🚀 CognitoForms sync started');

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !supabaseKey) {
      return json({ success: false, error: 'Supabase env not set' }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ success: false, error: 'No authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return json({ success: false, error: 'Invalid user token' }, 401);
    }

    console.log('✅ User authenticated:', user.email);

    // Webhook (POST)
    if (req.method === 'POST') {
      const submission = await req.json();
      console.log('📥 Webhook received:', submission);

      const dealData = parseCognitoSubmissionEnhanced(submission, user.id);

      if (dealData.cognito_entry_id) {
        const { data: existing } = await supabase
          .from('deals')
          .select('id')
          .eq('cognito_entry_id', dealData.cognito_entry_id)
          .limit(1);
        if (Array.isArray(existing) && existing.length > 0) {
          return json({ success: true, message: 'Entry already exists', deal_id: existing[0].id }, 200);
        }
      }

      const { data, error } = await supabase.from('deals').insert(dealData).select('id').limit(1);
      if (error) {
        console.error('❌ Database error:', error);
        return json({ success: false, error: 'Database error' }, 500);
      }

      console.log('✅ New deal created via webhook:', dealData.legal_company_name);
      return json({ success: true, deal_id: data?.[0]?.id }, 200);
    }

    // Manual sync (GET) with default 30 days; supports ?days and x-days header
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const headerDays = req.headers.get('x-days') || undefined;
      const daysBack = parseInt(url.searchParams.get('days') || headerDays || '30');
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (Number.isFinite(daysBack) ? daysBack : 30));
      console.log(`📅 Syncing entries since ${startDate.toISOString()} (${daysBack} days)`);

      const formsResponse = await fetch(
        `https://www.cognitoforms.com/api/organizations/${COGNITO_CONFIG.organizationId}/forms`,
        {
          headers: {
            Authorization: `Bearer ${COGNITO_CONFIG.apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!formsResponse.ok) {
        const t = await formsResponse.text();
        console.error('❌ CognitoForms API error:', t);
        return json({ success: false, error: `CognitoForms API error: ${formsResponse.status}` }, 500);
      }

      const forms = await formsResponse.json();
      console.log(`📋 Found ${forms.length} forms`);

      let totalProcessed = 0;
      let totalSkipped = 0;
      let totalErrors = 0;

      for (const form of forms) {
        console.log(`📝 Processing form: ${form.Name} (ID: ${form.Id})`);

        const entriesResponse = await fetch(
          `https://www.cognitoforms.com/api/organizations/${COGNITO_CONFIG.organizationId}/forms/${form.Id}/entries?filter=DateCreated ge ${startDate.toISOString()}&orderBy=DateCreated desc`,
          {
            headers: {
              Authorization: `Bearer ${COGNITO_CONFIG.apiToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!entriesResponse.ok) {
          console.error(`❌ Error fetching entries for form ${form.Id}: ${entriesResponse.status}`);
          totalErrors++;
          continue;
        }

        const entries = await entriesResponse.json();
        console.log(`📊 Found ${entries.length} entries for form ${form.Name}`);

        for (const entry of entries) {
          try {
            const { data: existing } = await supabase
              .from('deals')
              .select('id')
              .eq('cognito_entry_id', entry.Id)
              .limit(1);
            const already = Array.isArray(existing) && existing.length > 0;
            if (already) {
              totalSkipped++;
              continue;
            }

            const dealData = parseCognitoSubmissionEnhanced(entry, user.id, form);
            const { error } = await supabase.from('deals').insert(dealData);
            if (error) {
              console.error('❌ Insert error:', error);
              totalErrors++;
            } else {
              totalProcessed++;
              console.log('✅ Processed:', dealData.legal_company_name);
            }
          } catch (entryError) {
            console.error('❌ Error processing entry:', entryError);
            totalErrors++;
          }
        }
      }

      console.log(`✅ Sync complete: ${totalProcessed} new, ${totalSkipped} skipped, ${totalErrors} errors`);
      return json({
        success: true,
        processed: totalProcessed,
        skipped: totalSkipped,
        errors: totalErrors,
        forms_checked: forms.length,
        date_range_days: daysBack,
        sync_date: new Date().toISOString(),
      }, 200);
    }

    return json({ success: false, error: 'Method not allowed' }, 405);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    return json({ success: false, error: (error as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Enhanced parsing while preserving existing schema fields and status casing
function parseCognitoSubmissionEnhanced(entry: any, userId: string, form?: any) {
  const fieldData = extractComprehensiveFieldData(entry);
  const status = determineInitialStatus(fieldData);
  const loanType = determineLoanType(fieldData, entry, form);
  const clientName = extractClientName(fieldData, entry);

  const createdIso = new Date(entry.DateCreated || entry.DateSubmitted || Date.now()).toISOString();

  return {
    cognito_entry_id: entry.Id ?? null,
    cognito_entry_number: entry.Number ?? null,
    cognito_form_id: form?.Id ?? entry.FormId ?? null,

    legal_company_name: fieldData.companyName || `Company ${entry.Number || entry.Id}`,
    client_name: clientName || null,
    client_email: fieldData.email || null,
    client_phone: cleanPhoneNumber(fieldData.phone),

    loan_type: loanType,
    loan_amount_sought: fieldData.loanAmount || 0,

    status, // Title Case statuses to match existing data
    source: 'CognitoForms',

    created_at: createdIso,
    raw_email: JSON.stringify({
      form_name: form?.Name || 'CognitoForms',
      cognito_form_id: form?.Id || entry.FormId,
      cognito_entry_number: entry.Number,
      source: 'cognitoforms_api',
      parsed_fields: fieldData,
      loan_type: loanType,
      sync_date: new Date().toISOString(),
    }),
  };
}

function extractComprehensiveFieldData(entry: any) {
  const data: {
    companyName: string | null;
    email: string | null;
    phone: string | null;
    loanAmount: number;
    businessType?: string | null;
    industry?: string | null;
    timeInBusiness?: string | null;
    monthlyRevenue?: number | null;
    creditScore?: number | null;
    purpose?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } = {
    companyName: null,
    email: null,
    phone: null,
    loanAmount: 0,
  };

  const searchLocations = [entry.Fields || {}, entry.Data || {}, entry, entry.FormData || {}];

  const mapping: Record<string, string[]> = {
    companyName: ['BusinessName','CompanyName','LegalBusinessName','Company','Business','OrganizationName','EntityName','Name','ClientName','BusinessLegalName','DBAName','TradeName','CorporateName','LLCName','PartnershipName'],
    email: ['Email','EmailAddress','ContactEmail','BusinessEmail','PrimaryEmail','OwnerEmail','ApplicantEmail','MainEmail','WorkEmail'],
    phone: ['Phone','PhoneNumber','ContactPhone','BusinessPhone','PrimaryPhone','Mobile','CellPhone','Telephone','WorkPhone','OfficePhone','MainPhone'],
    loanAmount: ['LoanAmount','FundingAmount','AmountRequested','RequestedAmount','AmountNeeded','LoanRequest','CapitalNeeded','FinancingAmount','Amount','FundingNeeded','LoanSize','CreditAmount','AdvanceAmount'],
    firstName: ['FirstName','First','FName','OwnerFirstName','ApplicantFirstName','ContactFirstName','PrimaryFirstName'],
    lastName: ['LastName','Last','LName','OwnerLastName','ApplicantLastName','ContactLastName','PrimaryLastName','Surname'],
    purpose: ['Purpose','LoanPurpose','FundingPurpose'],
    businessType: ['BusinessType','EntityType','BusinessStructure','LegalStructure','CompanyType','OrganizationType'],
    industry: ['Industry','BusinessIndustry','Sector','BusinessSector','IndustryType','BusinessCategory','NAICS','SIC'],
    monthlyRevenue: ['MonthlyRevenue','MonthlyIncome','Revenue','MonthlyGrossRevenue','AverageMonthlyRevenue','MonthlyGrossIncome','MonthlyDeposits'],
    timeInBusiness: ['TimeInBusiness','YearsInBusiness','BusinessAge','YearsOperating','MonthsInBusiness','BusinessDuration','OperatingYears'],
  };

  for (const loc of searchLocations) {
    if (!loc || typeof loc !== 'object') continue;

    for (const [key, fields] of Object.entries(mapping)) {
      if ((data as any)[key]) continue;
      for (const f of fields) {
        const v = (loc as any)[f];
        if (v === undefined || v === null) continue;

        if (key === 'loanAmount') {
          const n = parseCurrency(v);
          if (n > 0) { (data as any)[key] = n; break; }
        } else if (key === 'email') {
          if (typeof v === 'string' && v.includes('@')) { (data as any)[key] = v.trim().toLowerCase(); break; }
        } else if (key === 'phone') {
          if (typeof v === 'string' && /\d/.test(v)) { (data as any)[key] = v.trim(); break; }
        } else if (typeof v === 'string' && v.trim()) {
          (data as any)[key] = v.trim(); break;
        } else if (typeof v === 'number' && v > 0) {
          (data as any)[key] = v; break;
        }
      }
    }
  }

  return data;
}

function determineInitialStatus(fieldData: any): string {
  let score = 0;
  if (fieldData.companyName) score += 2;
  if (fieldData.email) score += 2;
  if (fieldData.phone) score += 2;
  if (fieldData.loanAmount > 0) score += 3;
  if (fieldData.monthlyRevenue) score += 1;
  if (fieldData.timeInBusiness) score += 1;
  if (fieldData.industry) score += 1;

  if (score >= 8) return 'Qualified';
  if (score >= 6) return 'Contacted';
  return 'New';
}

function determineLoanType(fieldData: any, entry: any, form?: any): string {
  const map: Record<string, string[]> = {
    'Equipment Financing': ['equipment','machinery','vehicle','truck','construction'],
    'Working Capital': ['working capital','inventory','payroll','operating'],
    'Real Estate': ['real estate','property','building','commercial property'],
    'SBA Loan': ['sba','small business administration'],
    'Merchant Cash Advance': ['mca','merchant','cash advance','daily sales'],
    'Line of Credit': ['line of credit','loc','revolving credit'],
    'Business Loan': ['business loan','term loan','general business'],
  };

  if (form?.Name) {
    const name = String(form.Name).toLowerCase();
    for (const [loanType, keywords] of Object.entries(map)) {
      if (keywords.some(k => name.includes(k))) return loanType;
    }
  }

  const searchText = [
    fieldData.purpose,
    fieldData.businessType,
    fieldData.industry,
    entry.Purpose,
    entry.LoanPurpose,
    entry.FundingPurpose,
  ].filter(Boolean).join(' ').toLowerCase();

  for (const [loanType, keywords] of Object.entries(map)) {
    if (keywords.some(k => searchText.includes(k))) return loanType;
  }

  if (fieldData.loanAmount > 500000) return 'Real Estate';
  if (fieldData.loanAmount < 100000) return 'Working Capital';
  return 'Business Loan';
}

function extractClientName(fieldData: any, _entry: any): string | null {
  if (fieldData.firstName && fieldData.lastName) return `${fieldData.firstName} ${fieldData.lastName}`;
  if (fieldData.firstName) return fieldData.firstName;
  if (fieldData.email) {
    const base = String(fieldData.email).split('@')[0];
    return base.replace(/[._]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  }
  return null;
}

function cleanPhoneNumber(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+1 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  return phone.trim();
}

function parseCurrency(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const numStr = value.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(numStr);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}