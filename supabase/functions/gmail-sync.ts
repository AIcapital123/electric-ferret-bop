// @ts-nocheck

import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

type ParsedEmail = {
  date_submitted: string
  loan_type: string
  legal_company_name: string
  client_name: string
  client_email?: string
  client_phone?: string
  loan_amount_sought: number
  city?: string
  state?: string
  zip?: string
  purpose?: string
  employment_type?: string
  employer_name?: string
  job_title?: string
  salary?: number
  referral?: string
}

function parseCognitoFormsEmail(emailBody: string, subject: string): ParsedEmail {
  const loanTypeMatch = subject.match(/(Personal Loan|Business Loan|Equipment Leasing|Hard Money|Commercial Real Estate)/i)
  const loan_type = loanTypeMatch ? loanTypeMatch[1] : "Unknown"

  const fields: Record<string, string> = {}
  const lines = emailBody.split(/\n|\r\n/)

  for (const line of lines) {
    const match = line.match(/^([^:–]+)[:–]\s*(.+)$/)
    if (match) {
      const key = match[1].trim().toLowerCase().replace(/\s+/g, "_")
      const value = match[2].trim()
      fields[key] = value
    }
  }

  const amountStr = fields.loan_amount_sought || fields.amount || fields["loan_amount"] || "0"
  const loan_amount_sought = parseFloat(amountStr.replace(/[$,\s]/g, "")) || 0

  const dateStr = fields.date_submitted || fields.submitted_date || new Date().toISOString()
  const date_submitted = new Date(dateStr).toISOString().split("T")[0]

  const salaryVal = fields.salary ? parseFloat(fields.salary.replace(/[$,\s]/g, "")) : undefined

  return {
    date_submitted,
    loan_type,
    legal_company_name: fields.legal_company_name || fields.company_name || "N/A",
    client_name:
      fields.client_name ||
      fields.name ||
      `${fields.first_name || ""} ${fields.last_name || ""}`.trim() ||
      "Unknown",
    client_email: fields.client_email || fields.email,
    client_phone: fields.client_phone || fields.phone,
    loan_amount_sought,
    city: fields.city,
    state: fields.state,
    zip: fields.zip,
    purpose: fields.purpose || fields.loan_purpose,
    employment_type: fields.employment_type,
    employer_name: fields.employer_name,
    job_title: fields.job_title,
    salary: salaryVal,
    referral: fields.referral || fields.referral_name,
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  // Manual auth check (verify_jwt is false by default)
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: "Supabase env not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const body = await req.json().catch(() => ({}))
    const isTest = !!body?.test

    // For this test, simulate a Gmail message payload
    const inbox = [
      {
        from: "notifications@cognitoforms.com",
        subject: "Personal Loan Application - John Doe",
        body: `Legal Company Name: Doe Enterprises LLC
Client Name: John Doe
Email: john.doe@email.com
Phone: (555) 123-4567
Loan Amount Sought: $50,000
City: Miami
State: FL
Zip: 33101
Purpose: Business expansion
Employment Type: Self-employed
Employer Name: Doe Enterprises LLC
Job Title: Owner
Salary: $120,000
Referral: Google Search
Date Submitted: 2024-01-15`,
        message_id: "test-message-id-123",
        to: "deals@gokapital.com",
        sent_at: new Date().toISOString(),
      },
    ]

    const parsed: ParsedEmail[] = []
    for (const msg of inbox) {
      // Only parse CognitoForms submissions for demo
      const isCognito =
        msg.from.includes("cognitoforms.com") || msg.from.includes("notifications@cognitoforms.com")
      const hasLoanType =
        /(Personal Loan|Business Loan|Equipment Leasing|Hard Money|Commercial Real Estate)/i.test(msg.subject)
      const hasApplication = /application/i.test(msg.subject)

      if (!isTest && !(isCognito && hasLoanType && hasApplication)) continue

      const p = parseCognitoFormsEmail(msg.body, msg.subject)
      parsed.push(p)

      // Insert deal
      const { data: dealInsert, error: dealError } = await supabase
        .from("deals")
        .insert({
          date_submitted: p.date_submitted,
          loan_type: p.loan_type,
          legal_company_name: p.legal_company_name,
          client_name: p.client_name,
          client_email: p.client_email,
          client_phone: p.client_phone,
          loan_amount_sought: p.loan_amount_sought,
          city: p.city,
          state: p.state,
          zip: p.zip,
          purpose: p.purpose,
          employment_type: p.employment_type,
          employer_name: p.employer_name,
          job_title: p.job_title,
          salary: p.salary,
          referral: p.referral,
          source: "CognitoForms",
          status: "new",
        })
        .select("id")
        .single()

      if (dealError) {
        console.error("Deal insert error:", dealError)
        continue
      }

      // Insert raw email for reference
      await supabase.from("emails").insert({
        deal_id: dealInsert?.id,
        message_id: msg.message_id,
        subject: msg.subject,
        from_address: msg.from,
        to_addresses: msg.to,
        sent_at: msg.sent_at,
        raw_body: msg.body,
      })
    }

    return new Response(JSON.stringify({ parsed, inserted: parsed.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (e) {
    console.error("gmail-sync error:", e)
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})