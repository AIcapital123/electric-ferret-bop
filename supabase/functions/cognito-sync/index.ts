import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Verify user authentication for GET/POST
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

    if (req.method === 'POST') {
      // Webhook: receives an entry JSON
      const submission = await req.json();
      console.log('📥 Webhook received:', submission);

      const dealData = parseCognitoSubmission(submission, user.id);

      // Prevent duplicates by cognito_entry_id
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

    if (req.method === 'GET') {
      // Manual sync across organization forms (last 30 days)
      console.log('🔄 Manual sync requested');

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

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      for (const form of forms) {
        console.log(`📝 Processing form: ${form.Name} (ID: ${form.Id})`);

        const entriesResponse = await fetch(
          `https://www.cognitoforms.com/api/organizations/${COGNITO_CONFIG.organizationId}/forms/${form.Id}/entries?filter=DateCreated ge ${thirtyDaysAgo.toISOString()}`,
          {
            headers: {
              Authorization: `Bearer ${COGNITO_CONFIG.apiToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!entriesResponse.ok) {
          console.error(`❌ Error fetching entries for form ${form.Id}`);
          continue;
        }

        const entries = await entriesResponse.json();
        console.log(`📊 Found ${entries.length} entries for form ${form.Name}`);

        for (const entry of entries) {
          try {
            // Duplicate check
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

            const dealData = parseCognitoSubmission(entry, user.id, form);
            const { error } = await supabase.from('deals').insert(dealData);
            if (error) {
              console.error('❌ Insert error:', error);
              totalSkipped++;
            } else {
              totalProcessed++;
              console.log('✅ Processed:', dealData.legal_company_name);
            }
          } catch (entryError) {
            console.error('❌ Error processing entry:', entryError);
            totalSkipped++;
          }
        }
      }

      console.log(`✅ Sync complete: ${totalProcessed} new, ${totalSkipped} skipped`);
      return json({ success: true, processed: totalProcessed, skipped: totalSkipped, forms_checked: forms.length }, 200);
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

function parseCognitoSubmission(entry: any, userId: string, form?: any) {
  console.log('🔍 Parsing entry:', entry.Number || entry.Id);

  const fieldData = extractFieldData(entry);

  const createdIso = new Date(entry.DateCreated || entry.DateSubmitted || Date.now()).toISOString();

  // Prepare payload aligned with existing deals schema
  const payload = {
    cognito_entry_id: entry.Id ?? null,
    cognito_entry_number: entry.Number ?? null,
    cognito_form_id: form?.Id ?? entry.FormId ?? null,

    legal_company_name: fieldData.companyName || `Company ${entry.Number || entry.Id}`,
    client_email: fieldData.email || null,
    client_phone: fieldData.phone || null,
    loan_amount_sought: fieldData.loanAmount || 0,

    status: 'New',
    source: 'CognitoForms',

    created_at: createdIso,
    raw_email: JSON.stringify({
      form_name: form?.Name || 'CognitoForms',
      cognito_form_id: form?.Id || entry.FormId,
      cognito_entry_number: entry.Number,
      source: 'cognitoforms_api',
      parsed_fields: fieldData,
    }),
  };

  return payload;
}

function extractFieldData(entry: any) {
  const data = {
    companyName: null as string | null,
    email: null as string | null,
    phone: null as string | null,
    loanAmount: 0 as number,
  };

  const fields = entry.Fields || entry;
  const companyFields = [
    'BusinessName', 'CompanyName', 'LegalBusinessName', 'Company', 'Business',
    'OrganizationName', 'EntityName', 'Name', 'ClientName',
  ];
  const emailFields = ['Email', 'EmailAddress', 'ContactEmail', 'BusinessEmail', 'PrimaryEmail'];
  const phoneFields = ['Phone', 'PhoneNumber', 'ContactPhone', 'BusinessPhone', 'PrimaryPhone', 'Mobile', 'CellPhone', 'Telephone'];
  const amountFields = ['LoanAmount', 'FundingAmount', 'AmountRequested', 'RequestedAmount', 'AmountNeeded', 'LoanRequest', 'CapitalNeeded', 'FinancingAmount', 'Amount'];

  const searchLocations = [fields, entry, entry.Data || {}];

  for (const location of searchLocations) {
    if (!location || typeof location !== 'object') continue;

    if (!data.companyName) {
      for (const field of companyFields) {
        if (location[field] && typeof location[field] === 'string') {
          data.companyName = String(location[field]).trim();
          break;
        }
      }
    }

    if (!data.email) {
      for (const field of emailFields) {
        if (location[field] && typeof location[field] === 'string' && String(location[field]).includes('@')) {
          data.email = String(location[field]).trim();
          break;
        }
      }
    }

    if (!data.phone) {
      for (const field of phoneFields) {
        if (location[field] && typeof location[field] === 'string') {
          data.phone = String(location[field]).trim();
          break;
        }
      }
    }

    if (!data.loanAmount) {
      for (const field of amountFields) {
        if (location[field] !== undefined && location[field] !== null) {
          const amt = parseCurrency(location[field]);
          if (amt > 0) {
            data.loanAmount = amt;
            break;
          }
        }
      }
    }
  }

  return data;
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