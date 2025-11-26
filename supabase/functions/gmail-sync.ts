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

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/")
  // Pad base64 string
  const pad = normalized.length % 4
  const padded = pad ? normalized + "====".slice(pad) : normalized
  try {
    return atob(padded)
  } catch {
    return ""
  }
}

function extractPlainTextFromPayload(payload: any): string {
  if (!payload) return ""
  // If payload has parts, search for text/plain first, fallback to text/html
  const parts = payload.parts || []
  let text = ""

  const findPart = (p: any): string => {
    if (!p) return ""
    if (p.mimeType === "text/plain" && p.body?.data) {
      return decodeBase64Url(p.body.data)
    }
    if (p.mimeType === "text/html" && p.body?.data) {
      const html = decodeBase64Url(p.body.data)
      // Basic HTML to text fallback
      return html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim()
    }
    if (p.parts && p.parts.length) {
      for (const child of p.parts) {
        const res = findPart(child)
        if (res) return res
      }
    }
    return ""
  }

  // Try direct body
  if (payload.body?.data) {
    text = decodeBase64Url(payload.body.data)
    if (text) return text
  }

  for (const p of parts) {
    const res = findPart(p)
    if (res) return res
  }

  return text || ""
}

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")
  const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN")

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Google OAuth secrets")
  }

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken.replace(/"$/g, ""), // guard against trailing quote
      grant_type: "refresh_token",
    }),
  })

  const json = await resp.json()
  if (!resp.ok) {
    console.error("Token exchange failed:", json)
    throw new Error("invalid_grant_or_client")
  }
  return json.access_token as string
}

type GmailMessageHeader = { name: string; value: string }

function headerValue(headers: GmailMessageHeader[], name: string): string | undefined {
  const h = headers.find((x) => x.name?.toLowerCase() === name.toLowerCase())
  return h?.value
}

async function searchMessageIds(accessToken: string, q: string, maxResults = 10): Promise<string[]> {
  const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages")
  url.searchParams.set("q", q)
  url.searchParams.set("maxResults", String(maxResults))

  const resp = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const json = await resp.json()
  if (!resp.ok) {
    console.error("Gmail search error:", json)
    throw new Error("gmail_search_failed")
  }
  const messages = (json.messages || []) as { id: string }[]
  return messages.map((m) => m.id)
}

async function getMessage(accessToken: string, id: string): Promise<any> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  const json = await resp.json()
  if (!resp.ok) {
    console.error("Gmail get message error:", json)
    throw new Error("gmail_get_message_failed")
  }
  return json
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

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
    const maxResults = Number(body?.maxResults ?? 10)
    const query =
      body?.q ??
      'from:notifications@cognitoforms.com subject:(application) to:deals@gokapital.com newer_than:30d'

    const parsed: ParsedEmail[] = []

    if (isTest) {
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

      for (const msg of inbox) {
        const p = parseCognitoFormsEmail(msg.body, msg.subject)
        parsed.push(p)

        const { data: existing } = await supabase
          .from("emails")
          .select("id")
          .eq("message_id", msg.message_id)
          .maybeSingle()

        if (!existing) {
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

          if (!dealError) {
            await supabase.from("emails").insert({
              deal_id: dealInsert?.id,
              message_id: msg.message_id,
              subject: msg.subject,
              from_address: msg.from,
              to_addresses: msg.to,
              sent_at: msg.sent_at,
              raw_body: msg.body,
            })
          } else {
            console.error("Deal insert error:", dealError)
          }
        }
      }

      return new Response(JSON.stringify({ parsed, inserted: parsed.length }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Live Gmail mode
    const accessToken = await getAccessToken()
    const ids = await searchMessageIds(accessToken, query, maxResults)

    let inserted = 0
    for (const id of ids) {
      const gm = await getMessage(accessToken, id)
      const headers = (gm.payload?.headers || []) as GmailMessageHeader[]
      const from = headerValue(headers, "From") || ""
      const subject = headerValue(headers, "Subject") || ""
      const to = headerValue(headers, "To") || ""
      const date = headerValue(headers, "Date") || new Date().toISOString()
      const sent_at = new Date(date).toISOString()

      // Filter again defensively
      const isCognito =
        from.includes("cognitoforms.com") || from.includes("notifications@cognitoforms.com")
      const hasLoanType =
        /(Personal Loan|Business Loan|Equipment Leasing|Hard Money|Commercial Real Estate)/i.test(subject)
      const hasApplication = /application/i.test(subject)
      if (!(isCognito && hasApplication)) {
        continue
      }

      const bodyText = extractPlainTextFromPayload(gm.payload)
      const p = parseCognitoFormsEmail(bodyText, subject)
      parsed.push(p)

      // Idempotency: skip if email message_id already stored
      const { data: existing } = await supabase
        .from("emails")
        .select("id")
        .eq("message_id", gm.id)
        .maybeSingle()

      if (existing) continue

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

      await supabase.from("emails").insert({
        deal_id: dealInsert?.id,
        message_id: gm.id,
        subject,
        from_address: from,
        to_addresses: to,
        sent_at,
        raw_body: bodyText,
      })

      inserted += 1
    }

    return new Response(JSON.stringify({ parsed, inserted }), {
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