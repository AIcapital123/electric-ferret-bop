// @ts-nocheck

import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

// ------------------------------------
// CORS
// ------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
}

// ------------------------------------
// Types
// ------------------------------------
type DealRecord = {
  client_name: string
  client_email?: string
  client_phone?: string
  business_name?: string
  business_type?: string
  employer?: string
  job_title?: string
  city?: string
  state?: string
  zip?: string
  loan_type?: string
  loan_amount_sought?: number
  loan_purpose?: string
  annual_income?: number
  status: string
  stage: string
  source: string
  gmail_message_id: string
  raw_email: string
  ai_derived: boolean
  notes?: string
}

type GmailMessageHeader = { name: string; value: string }

type SyncRequestBody = {
  test?: boolean
  q?: string
  maxResults?: number
  startDate?: string
  endDate?: string
}

type EmailMeta = {
  message_id: string
  subject: string
  from: string
  to: string
  sent_at: string
  raw_body: string
}

// ------------------------------------
// Date utilities (defined once)
// ------------------------------------
function clampDate(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function parseYmd(s?: string): Date | undefined {
  if (!s) return undefined
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return undefined
  const year = Number(m[1]), month = Number(m[2]) - 1, day = Number(m[3])
  return clampDate(new Date(year, month, day))
}

function formatGmailDate(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}/${mm}/${dd}`
}

// ------------------------------------
// General utils
// ------------------------------------
function headerValue(headers: GmailMessageHeader[], name: string): string | undefined {
  const h = headers.find((x) => x.name?.toLowerCase() === name.toLowerCase())
  return h?.value
}

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/")
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
  const parts = payload.parts || []

  const findPart = (p: any): string => {
    if (!p) return ""
    if (p.mimeType === "text/plain" && p.body?.data) {
      return decodeBase64Url(p.body.data)
    }
    if (p.mimeType === "text/html" && p.body?.data) {
      const html = decodeBase64Url(p.body.data)
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

  if (payload.body?.data) {
    const text = decodeBase64Url(payload.body.data)
    if (text) return text
  }

  for (const p of parts) {
    const res = findPart(p)
    if (res) return res
  }

  return ""
}

// ------------------------------------
// Parsing: CognitoForms emails to Deal records
// ------------------------------------
function normalizeCurrency(value?: string): number {
  if (!value) return 0
  const cleaned = value.replace(/[^\d.]/g, "")
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

function normalizeLoanType(input?: string): string {
  const s = (input || "").toLowerCase()
  
  const patterns: { type: string; matchers: RegExp[] }[] = [
    { type: "Personal Loan", matchers: [/personal\s+loan/i] },
    { type: "Business Loan", matchers: [/business\s+loan/i, /working\s+capital/i, /term\s+loan/i, /startup\s+loan/i] },
    { type: "Equipment Leasing", matchers: [/equipment\s+leasing/i, /equipment\s+financ(e|ing)/i, /equipment\s+loan/i] },
    { type: "Hard Money", matchers: [/hard\s+money/i, /bridge\s+loan/i, /fix\s*&?\s*flip/i, /\bbridge\b/i] },
    { type: "Commercial Real Estate", matchers: [/commercial\s+real\s+estate/i, /\bcre\b/i, /commercial\s+re/i, /commercial\s+mortgage/i] },
  ]

  for (const p of patterns) {
    if (p.matchers.some((rx) => rx.test(s))) return p.type
  }
  return "Other"
}

function parseEmailToDeal(emailBody: string, subject: string, messageId: string): DealRecord {
  const fields: Record<string, string> = {}
  const lines = emailBody.split(/\r?\n/)

  for (const line of lines) {
    const m1 = line.match(/^([^:–—]+)\s*[:–—]\s*(.+)$/)
    const m2 = line.match(/^([^-]+?)\s+-\s+(.+)$/)
    const match = m1 || m2
    if (match) {
      const key = match[1].trim().toLowerCase().replace(/\s+/g, "_")
      const value = match[2].trim()
      if (value) fields[key] = value
    }
  }

  const getFirst = (keys: string[]): string | undefined => {
    for (const k of keys) {
      if (fields[k]) return fields[k]
    }
    return undefined
  }

  // Field mappings with aliases
  const clientNameKeys = ["client_name", "name", "applicant_name", "full_name", "first_name", "contact_name"]
  const emailKeys = ["email", "client_email", "applicant_email", "email_address"]
  const phoneKeys = ["phone", "client_phone", "phone_number", "mobile", "cell", "telephone"]
  const businessNameKeys = ["legal_company_name", "company_name", "business_name", "legal_business_name", "company", "business"]
  const employerKeys = ["employer", "employer_name"]
  const jobTitleKeys = ["job_title", "position", "title", "occupation"]
  const incomeKeys = ["income", "annual_income", "yearly_income", "salary", "monthly_income"]
  const purposeKeys = ["purpose", "use_of_funds", "loan_purpose", "purpose_of_loan"]
  const referralKeys = ["referral", "referred_by", "how_did_you_hear_about_us", "source", "referral_name"]
  const cityKeys = ["city", "town"]
  const stateKeys = ["state", "province"]
  const zipKeys = ["zip", "postal_code", "zip_code"]
  const amountKeys = ["loan_amount_sought", "loan_amount", "amount_requested", "requested_amount", "total_loan_amount"]
  const businessTypeKeys = ["business_type", "industry", "type_of_business"]

  // Extract values
  const client_name = getFirst(clientNameKeys) || extractNameFromSubject(subject) || "Unknown"
  const client_email = getFirst(emailKeys)
  const client_phone = getFirst(phoneKeys)
  const business_name = getFirst(businessNameKeys)
  const business_type = getFirst(businessTypeKeys)
  const employer = getFirst(employerKeys)
  const job_title = getFirst(jobTitleKeys)
  const city = getFirst(cityKeys)
  const state = getFirst(stateKeys)
  const zip = getFirst(zipKeys)
  const loan_purpose = getFirst(purposeKeys)
  const referral = getFirst(referralKeys)

  // Loan type from subject
  const loan_type = normalizeLoanType(subject) !== "Other" ? normalizeLoanType(subject) : normalizeLoanType(emailBody)

  // Amount
  const amountStr = getFirst(amountKeys)
  const loan_amount_sought = normalizeCurrency(amountStr)

  // Income - handle monthly vs annual
  const incomeStr = getFirst(incomeKeys)
  let annual_income = 0
  if (incomeStr) {
    const rawIncome = normalizeCurrency(incomeStr)
    // Check if it's monthly income
    const incomeKey = incomeKeys.find(k => fields[k])
    if (incomeKey && (incomeKey.includes("monthly") || incomeStr.toLowerCase().includes("month"))) {
      annual_income = rawIncome * 12
    } else {
      annual_income = rawIncome
    }
  }

  // Build source with referral info
  let source = "CognitoForms"
  if (referral) {
    source = `CognitoForms (Referral: ${referral})`
  }

  // Collect extra fields for notes
  const coreFields = new Set([
    ...clientNameKeys, ...emailKeys, ...phoneKeys, ...businessNameKeys,
    ...employerKeys, ...jobTitleKeys, ...incomeKeys, ...purposeKeys,
    ...referralKeys, ...cityKeys, ...stateKeys, ...zipKeys, ...amountKeys,
    ...businessTypeKeys, "date_submitted", "submitted_date", "submission_date", "date"
  ])
  
  const extraFields: string[] = []
  for (const [key, value] of Object.entries(fields)) {
    if (!coreFields.has(key) && value) {
      extraFields.push(`${key.replace(/_/g, " ")}: ${value}`)
    }
  }

  let notes = ""
  if (extraFields.length > 0) {
    notes = `[Auto-imported from CognitoForms]\n\nAdditional Info:\n${extraFields.join("\n")}`
  }

  return {
    client_name,
    client_email,
    client_phone,
    business_name,
    business_type,
    employer,
    job_title,
    city,
    state,
    zip,
    loan_type,
    loan_amount_sought,
    loan_purpose,
    annual_income: annual_income || undefined,
    status: "New",
    stage: "Lead",
    source,
    gmail_message_id: messageId,
    raw_email: emailBody.substring(0, 10000), // Limit size
    ai_derived: false,
    notes: notes || undefined,
  }
}

function extractNameFromSubject(subject: string): string | undefined {
  const match = subject.match(/application\s*[-:–—]\s*(.+)$/i)
  if (match) return match[1].trim()
  return undefined
}

function isCognitoApplicationEmail(from: string, _subject: string): boolean {
  return from.includes("cognitoforms.com") || from.includes("notifications@cognitoforms.com")
}

// ------------------------------------
// Gmail query helpers
// ------------------------------------
function buildGmailQuery(body: SyncRequestBody): string {
  const baseQuery = body?.q ?? "from:notifications@cognitoforms.com to:deals@gokapital.com"

  const today = clampDate(new Date())
  const twoYearsAgo = clampDate(new Date(today.getFullYear() - 2, today.getMonth(), today.getDate()))

  const startParsed = parseYmd(body?.startDate)
  const endParsedRaw = parseYmd(body?.endDate)

  if (startParsed || endParsedRaw) {
    const endClamped = clampDate(endParsedRaw ?? today)
    const finalEnd = endClamped > today ? today : endClamped

    let finalStart = clampDate(startParsed ?? twoYearsAgo)
    if (finalStart < twoYearsAgo) finalStart = twoYearsAgo
    if (finalStart > finalEnd) finalStart = finalEnd

    const endPlusOne = new Date(finalEnd)
    endPlusOne.setDate(endPlusOne.getDate() + 1)

    return `${baseQuery} after:${formatGmailDate(finalStart)} before:${formatGmailDate(endPlusOne)}`
  }

  // Default: last 30 days
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  return `${baseQuery} after:${formatGmailDate(thirtyDaysAgo)} before:${formatGmailDate(tomorrow)}`
}

// ------------------------------------
// Environment & clients
// ------------------------------------
async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")
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

function createSupabaseClientOrNull() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  return supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null
}

// ------------------------------------
// Gmail API helpers
// ------------------------------------
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

function extractEmailMetaFromGmailMessage(gm: any): EmailMeta {
  const headers = (gm.payload?.headers || []) as GmailMessageHeader[]
  const from = headerValue(headers, "From") || ""
  const subject = headerValue(headers, "Subject") || ""
  const to = headerValue(headers, "To") || ""
  const date = headerValue(headers, "Date") || new Date().toISOString()
  const sent_at = new Date(date).toISOString()
  const raw_body = extractPlainTextFromPayload(gm.payload)

  return { message_id: gm.id, subject, from, to, sent_at, raw_body }
}

// ------------------------------------
// Database helpers with deduplication
// ------------------------------------
async function findExistingDeal(supabase: any, deal: DealRecord): Promise<any | null> {
  // Check by gmail_message_id first
  const { data: byMessageId } = await supabase
    .from("deals")
    .select("*")
    .eq("gmail_message_id", deal.gmail_message_id)
    .maybeSingle()
  
  if (byMessageId) return byMessageId

  // Check by email
  if (deal.client_email) {
    const { data: byEmail } = await supabase
      .from("deals")
      .select("*")
      .eq("client_email", deal.client_email)
      .maybeSingle()
    if (byEmail) return byEmail
  }

  // Check by phone
  if (deal.client_phone) {
    const { data: byPhone } = await supabase
      .from("deals")
      .select("*")
      .eq("client_phone", deal.client_phone)
      .maybeSingle()
    if (byPhone) return byPhone
  }

  return null
}

async function mergeDeal(supabase: any, existing: any, newDeal: DealRecord): Promise<boolean> {
  const updates: Record<string, any> = {}

  // Only fill empty fields
  const fillableFields = [
    "client_name", "client_email", "client_phone", "business_name", "business_type",
    "employer", "job_title", "city", "state", "zip", "loan_type", "loan_amount_sought",
    "loan_purpose", "annual_income"
  ]

  for (const field of fillableFields) {
    if (!existing[field] && (newDeal as any)[field]) {
      updates[field] = (newDeal as any)[field]
    }
  }

  // Append to notes
  if (newDeal.notes) {
    const existingNotes = existing.notes || ""
    const timestamp = new Date().toISOString()
    updates.notes = existingNotes + `\n\n--- Merged ${timestamp} ---\n${newDeal.notes}`
  }

  // Append to raw_email history
  if (newDeal.raw_email) {
    const existingRaw = existing.raw_email || ""
    const timestamp = new Date().toISOString()
    updates.raw_email = existingRaw + `\n\n--- Email ${timestamp} ---\n${newDeal.raw_email}`
  }

  if (Object.keys(updates).length === 0) return false

  const { error } = await supabase
    .from("deals")
    .update(updates)
    .eq("id", existing.id)

  if (error) {
    console.error("Merge deal error:", error)
    return false
  }
  return true
}

async function insertDeal(supabase: any, deal: DealRecord): Promise<boolean> {
  const { error } = await supabase.from("deals").insert(deal)
  
  if (error) {
    console.error("Insert deal error:", error)
