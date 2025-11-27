import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-days',
};

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';
const COGNITO_API_KEY = Deno.env.get('COGNITO_API_KEY') ?? '';
const COGNITO_ORG_ID = Deno.env.get('COGNITO_ORG_ID') ?? '';

const INCLUDED_FORMS = new Set<string>([
  'Broker Referral Agreement',
  'Business Loan Application',
  'Business Term Loan',
  'Commercial Real Estate Application',
  'Equipment Leasing Application',
  'Hard Money Application',
  'Personal Loan Application',
  'Rental Property Application',
  'SBA Application',
].map(s => s.toLowerCase()));

const EXCLUDED_FORMS = new Set<string>([
  'ENCUESTA',
  'Funded Deal Report',
  'Payroll Registration and Commissions',
  'Questionnaire Development Loan',
  'ACH Debit Authorization Form',
  'Financiamiento de Bienes Raíces',
  'LABOR SURVEY',
].map(s => s.toLowerCase()));

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
    if (!COGNITO_API_KEY || !COGNITO_ORG_ID) {
      return json({ success: false, error: 'Missing Cognito env vars' }, 500);
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

    // Webhook (POST) → SYSTEM_USER_ID ownership
    if (req.method === 'POST') {
      const submission = await req.json();
      console.log('📥 Webhook received:', submission);

      const dealData = parseCognitoSubmissionEnhanced(submission, SYSTEM_USER_ID);

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

      const { data, error } = await supabase
        .from('deals')
        .insert(dealData)
        .select('id')
        .limit(1);
      if (error) {
        console.error('❌ Database error:', error);
        return json({ success: false, error: 'Database error' }, 500);
      }

      console.log('✅ New deal created via webhook:', dealData.legal_company_name);
      return json({ success: true, deal_id: data?.[0]?.id }, 200);
    }

    // Manual sync (GET) → initiating user's ownership
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const headerDays = req.headers.get('x-days') || undefined;
      const daysBack = parseInt(url.searchParams.get('days') || headerDays || '30');
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (Number.isFinite(daysBack) ? daysBack : 30));
      console.log(`📅 Syncing entries since ${startDate.toISOString()} (${daysBack} days)`);

      // List forms
      const formsResponse = await fetch(
        `https://www.cognitoforms.com/api/organizations/${COGNITO_ORG_ID}/forms`,
        {
          headers: {
            Authorization: `Bearer ${COGNITO_API_KEY}`,
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
      const usableForms = (forms || []).filter((f: any) => {
        const name = String(f.Name || '').toLowerCase();
        if (EXCLUDED_FORMS.has(name)) return false;
        if (INCLUDED_FORMS.size > 0) return INCLUDED_FORMS.has(name);
        return true;
      });

      console.log(`📋 Found ${forms.length} forms; using ${usableForms.length}`);

      let totalProcessed = 0;
      let totalSkipped = 0;
      let totalErrors = 0;

      for (const form of usableForms) {
        console.log(`📝 Processing form: ${form.Name} (ID: ${form.Id})`);

        const entriesResponse = await fetch(
          `https://www.cognitoforms.com/api/organizations/${COGNITO_ORG_ID}/forms/${form.Id}/entries?filter=DateCreated ge ${startDate.toISOString()}&orderBy=DateCreated desc`,
          {
            headers: {
              Authorization: `Bearer ${COGNITO_API_KEY}`,
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
        forms_checked: usableForms.length,
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

// Enhanced parsing while preserving existing schema fields; authoritative amount fields
function parseCognitoSubmissionEnhanced(entry: any, userId: string, form?: any) {
  const fieldData = extractComprehensiveFieldData(entry);
  const statusTitleCase = determineInitialStatusTitleCase(fieldData);
  const loanType = determineLoanType(fieldData, entry, form);
  const clientName = extractClientName(fieldData, entry);
  const createdIso = new Date(entry.DateCreated || entry.DateSubmitted || Date.now()).toISOString();

  const revenueAnnual = fieldData.monthlyRevenue ? Math.round(fieldData.monthlyRevenue * 12) : null;

  const cognitoRaw = {
    form_name: form?.Name || 'CognitoForms',
    cognito_form_id: form?.Id || entry.FormId,
    cognito_entry_number: entry.Number,
    source: 'cognitoforms_api',
    parsed_fields: fieldData,
    loan_type: loanType,
    sync_date: new Date().toISOString(),
    raw_entry: entry,
  };

  return {
    // Cognito refs
    cognito_entry_id: entry.Id ?? null,
    cognito_entry_number: entry.Number ?? null,
    cognito_form_id: form?.Id ?? entry.FormId ?? null,

    // Primary fields
    legal_company_name: fieldData.companyName || `Company ${entry.Number || entry.Id}`,
    client_name: clientName || null,
    client_email: fieldData.email || null,
    client_phone: cleanPhoneNumber(fieldData.phone),

    // Authoritative numeric fields
    loan_amount: fieldData.loanAmount || 0,
    revenue_annual: revenueAnnual,

    // Compatibility fields (if your UI still relies on loan_amount_sought)
    loan_amount_sought: fieldData.loanAmount || 0,

    // Classification
    loan_type: loanType,
    status: statusTitleCase, // Keep Title Case to match existing UI components
    source: 'CognitoForms',

    // Extras / future-proof
    use_of_funds: fieldData.purpose || null,
    industry: fieldData.industry || null,
    state: fieldData.state || null,
    notes_internal: null,
    assigned_to: null,

    // Storage
    created_at: createdIso,
    cognito_raw: cognitoRaw,
    raw_email: JSON.stringify(cognitoRaw),
    user_id: userId,
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
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
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
    purpose: ['Purpose','LoanPurpose','FundingPurpose','UseOfFunds','Use_Of_Funds'],
    businessType: ['BusinessType','EntityType','BusinessStructure','LegalStructure','CompanyType','OrganizationType'],
    industry: ['Industry','BusinessIndustry','Sector','BusinessSector','IndustryType','BusinessCategory','NAICS','SIC'],
    monthlyRevenue: ['MonthlyRevenue','MonthlyIncome','Revenue','MonthlyGrossRevenue','AverageMonthlyRevenue','MonthlyGrossIncome','MonthlyDeposits'],
    timeInBusiness: ['TimeInBusiness','YearsInBusiness','BusinessAge','YearsOperating','MonthsInBusiness','BusinessDuration','OperatingYears'],
    address: ['Address','AddressLine1','StreetAddress'],
    city: ['City','Town'],
    state: ['State','Province','Region'],
    zip: ['Zip','PostalCode','ZipCode'],
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

function determineInitialStatusTitleCase(fieldData: any): string {
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
    'Commercial Real Estate (CRE)': ['real estate','property','building','commercial property'],
    'SBA 7(a)': ['sba 7(a)'],
    'SBA 504': ['sba 504'],
    'Merchant Cash Advance': ['mca','merchant','cash advance','daily sales'],
    'Line of Credit (LOC)': ['line of credit','loc','revolving credit'],
    'Term Loan': ['term loan','business loan','general business'],
    'Personal Loan': ['personal loan'],
    'Factoring': ['factoring','receivables'],
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
    entry.UseOfFunds,
  ].filter(Boolean).join(' ').toLowerCase();

  for (const [loanType, keywords] of Object.entries(map)) {
    if (keywords.some(k => searchText.includes(k))) return loanType;
  }

  if (fieldData.loanAmount > 500000) return 'Commercial Real Estate (CRE)';
  if (fieldData.loanAmount < 100000) return 'Working Capital';
  return 'Term Loan';
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