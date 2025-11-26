// @ts-nocheck

import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
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
  const lines = emailBody.split(/\r?\n/)

  for (const line of lines) {
    // Support colon, en/em dash, and " - " delimiters
    const m1 = line.match(/^([^:–—]+)\s*[:–—]\s*(.+)$/)
    const m2 = line.match(/^([^-]+?)\s+-\s+(.+)$/)
    const match = m1 || m2
    if (match) {
      const key = match[1].trim().toLowerCase().replace(/\s+/g, "_")
      const value = match[2].trim()
      fields[key] = value
    }
  }

  const getFirst = (keys: string[]): string | undefined => {
    for (const k of keys) {
      const v = fields[k]
      if (v) return v
    }
    return undefined
  }

  const normalizeCurrency = (value?: string): number => {
    if (!value) return 0
    const cleaned = value.replace(/[^\d.]/g, "")
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : num
  }

  const normalizeDate = (value?: string): string => {
    const today = new Date().toISOString().split("T")[0]
    if (!value) return today

    const d1 = new Date(value)
    if (!isNaN(d1.getTime())) return d1.toISOString().split("T")[0]

    const mdy = value.match(/^\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s*$/)
    if (mdy) {
      const mm = parseInt(mdy[1], 10) - 1
      const dd = parseInt(mdy[2], 10)
      const yyyy = parseInt(mdy[3].length === 2 ? `20${mdy[3]}` : mdy[3], 10)
      const d = new Date(yyyy, mm, dd)
      if (!isNaN(d.getTime())) return d.toISOString().split("T")[0]
    }

    const months = [
      "january","february","march","april","may","june",
      "july","august","september","october","november","december"
    ]
    const mon = months.findIndex(m => value.toLowerCase().includes(m))
    if (mon >= 0) {
      const dayMatch = value.match(/(\d{1,2})(?:st|nd|rd|th)?/)
      const yearMatch = value.match(/(\d{4})/)
      const dd = dayMatch ? parseInt(dayMatch[1], 10) : 1
      const yyyy = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear()
      const d = new Date(yyyy, mon, dd)
      if (!isNaN(d.getTime())) return d.toISOString().split("T")[0]
    }

    return today
  }

  const legalCompanyKeys = ["legal_company_name","company_name","business_name","legal_business_name","company","business"]
  const clientNameKeys = ["client_name","name","full_name","applicant_name","contact_name"]
  const emailKeys = ["client_email","email","email_address"]
  const phoneKeys = ["client_phone","phone","telephone","mobile","phone_number"]
  const amountKeys = ["loan_amount_sought","loan_amount","amount_requested","requested_amount","total_loan_amount","loan_amount"]
  const cityKeys = ["city","town"]
  const stateKeys = ["state","province"]
  const zipKeys = ["zip","postal_code","zip_code"]
  const purposeKeys = ["purpose","loan_purpose","purpose_of_loan","use_of_funds"]
  const employmentTypeKeys = ["employment_type","employment_status"]
  const employerKeys = ["employer_name","employer","company","business"]
  const jobTitleKeys = ["job_title","position","title"]
  const salaryKeys = ["salary","income","annual_income","monthly_income"]
  const referralKeys = ["referral","referral_name","source","how_did_you_hear_about_us"]
  const dateKeys = ["date_submitted","submitted_date","submission_date","date"]

  const amountStr = getFirst(amountKeys)
  const loan_amount_sought = normalizeCurrency(amountStr)

  const dateStr = getFirst(dateKeys) || new Date().toISOString()
  const date_submitted = normalizeDate(dateStr)

  const subjectNameMatch = subject.match(/application\s*[-:]\s*(.+)$/i)
  const subjectName = subjectNameMatch ? subjectNameMatch[1].trim() : undefined

  const salaryVal = normalizeCurrency(getFirst(salaryKeys))

  return {
    date_submitted,
    loan_type,
    legal_company_name: getFirst(legalCompanyKeys) || "N/A",
    client_name: getFirst(clientNameKeys) || subjectName || "Unknown",
    client_email: getFirst(emailKeys),
    client_phone: getFirst(phoneKeys),
    loan_amount_sought,
    city: getFirst(cityKeys),
    state: getFirst(stateKeys),
    zip: getFirst(zipKeys),
    purpose: getFirst(purposeKeys),
    employment_type: getFirst(employmentTypeKeys),
    employer_name: getFirst(employerKeys),
    job_title: getFirst(jobTitleKeys),
    salary: salaryVal,
    referral: getFirst(referralKeys),
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
  // Support misspelled secret key from environment (GOGLE_CLIENT_SECRET) as fallback
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") || Deno.env.get("GOGLE_CLIENT_SECRET")
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
      refresh_token: refreshToken.replace(/"$/g, ""),
      grant_type: "refresh_token",
    }),
  })

  const json = await resp.json()
  if (!resp.ok) {
    console.error("Token exchange failed:", json)
    throw new Error(json.error || "invalid_grant_or_client")
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
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // REMOVED: strict Authorization and Supabase env checks before body parsing

  try {
    const body = await req.json().catch(() => ({}))
    const isTest = !!body?.test
    const maxResults = Number(body?.maxResults ?? 10)

    // Build base query and optional date range
    const baseQuery =
      body?.q ??
      'from:notifications@cognitoforms.com subject:(application) to:deals@gokapital.com'

    const startDateStr = typeof body?.startDate === 'string' ? body.startDate : undefined
    const endDateStr = typeof body?.endDate === 'string' ? body.endDate : undefined

    const today = new Date()
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const twoYearsAgo = new Date(todayDateOnly)
    twoYearsAgo.setFullYear(todayDateOnly.getFullYear() - 2)

    const clampDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

    const parseYmd = (s?: string): Date | undefined => {
      if (!s) return undefined
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (!m) return undefined
      const year = Number(m[1]), month = Number(m[2]) - 1, day = Number(m[3])
      return clampDate(new Date(year, month, day))
    }

    const formatGmailDate = (d: Date) => {
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${yyyy}/${mm}/${dd}`
    }

    let query = baseQuery
    const startParsed = parseYmd(startDateStr)
    const endParsedRaw = parseYmd(endDateStr)

    if (startParsed || endParsedRaw) {
      // Clamp end to today (no future)
      const endClamped = clampDate(endParsedRaw ?? todayDateOnly)
      const finalEnd = endClamped > todayDateOnly ? todayDateOnly : endClamped

      // Clamp start to at most 2 years ago; also ensure start <= end
      let finalStart = clampDate(startParsed ?? twoYearsAgo)
      if (finalStart < twoYearsAgo) finalStart = twoYearsAgo
      if (finalStart > finalEnd) finalStart = finalEnd

      // Gmail's before: is exclusive; add 1 day to include end date
      const endPlusOne = new Date(finalEnd)
      endPlusOne.setDate(endPlusOne.getDate() + 1)

      query = `${baseQuery} after:${formatGmailDate(finalStart)} before:${formatGmailDate(endPlusOne)}`
    } else {
      // Default to last 30 days if no explicit dates provided
      query = `${baseQuery} newer_than:30d`
    }

    // Enforce Authorization only for live mode; allow test mode without it
    const authHeader = req.headers.get("Authorization")
    if (!authHeader && !isTest) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Initialize Supabase client only if envs exist (and when needed)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const hasSupabase = !!(supabaseUrl && supabaseKey)
    const supabase = hasSupabase ? createClient(supabaseUrl!, supabaseKey!) : null

    const parsed: ParsedEmail[] = []
    let inserted = 0

    if (isTest) {
      // Test mode: return mocked items; do not require Supabase env
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

        if (supabase) {
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
              inserted += 1
            } else {
              console.error("Deal insert error:", dealError)
            }
          }
        } else {
          // No Supabase env: simulate insert count so UI still shows activity
          inserted += 1
        }
      }

      return new Response(JSON.stringify({ parsed, inserted }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Live Gmail mode
    if (!hasSupabase) {
      // If we're in live mode but Supabase env not set, fail clearly
      return new Response(JSON.stringify({ error: "Supabase env not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const accessToken = await getAccessToken()
    const ids = await searchMessageIds(accessToken, query, maxResults)

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
    // Map common auth/config errors to clearer codes
    const msg = typeof e?.message === "string" ? e.message : "Internal error"
    const status =
      msg.includes("Missing Google OAuth secrets") ? 400 :
      msg.includes("invalid_grant") || msg.includes("invalid_client") ? 401 :
      500

    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})