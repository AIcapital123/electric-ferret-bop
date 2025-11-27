import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

type SyncBody = {
  // Optional filters
  formIds?: string[]        // limit to specific form IDs
  startDate?: string        // YYYY-MM-DD
  endDate?: string          // YYYY-MM-DD
  limit?: number            // max entries per form
  action?: "bulk_sync" | "webhook" | string
}

type CognitoForm = {
  Id: string
  Name: string
}

type CognitoEntry = Record<string, any> & {
  EntryId?: string | number
  EntryNumber?: number
  DateCreated?: string
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function cleanCurrency(val: any): number {
  if (typeof val === "number") return val
  if (typeof val === "string") {
    const s = val.replace(/[^0-9.]/g, "")
    const n = parseFloat(s)
    return isNaN(n) ? 0 : n
  }
  return 0
}

function firstNonEmpty(...vals: Array<any>): string | null {
  for (const v of vals) {
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v)
  }
  return null
}

function pickEntry(entry: CognitoEntry, keys: string[]): any {
  for (const k of keys) {
    const v = entry[k]
    if (v !== undefined && v !== null && String(v).trim() !== "") return v
  }
  return null
}

function parseDealFromEntry(entry: CognitoEntry, form: CognitoForm) {
  // Extract common fields from flexible CognitoForms schemas
  const legal_company_name = firstNonEmpty(
    pickEntry(entry, ["BusinessName","CompanyName","LegalBusinessName","Company","Business","OrganizationName","EntityName","CorporateName","LLCName","TradeName","DBAName"]),
    pickEntry(entry, ["Business","Company"])
  )

  const firstName = firstNonEmpty(
    pickEntry(entry, ["FirstName","OwnerFirstName","ApplicantFirstName","ContactFirstName"])
  )
  const lastName = firstNonEmpty(
    pickEntry(entry, ["LastName","OwnerLastName","ApplicantLastName","ContactLastName"])
  )
  const client_name = firstNonEmpty(
    pickEntry(entry, ["ClientName","ApplicantName","ContactName","Name"]),
    [firstName, lastName].filter(Boolean).join(" ").trim() || null
  )

  const emailRaw = firstNonEmpty(
    pickEntry(entry, ["Email","EmailAddress","ContactEmail","BusinessEmail","PrimaryEmail","OwnerEmail","ApplicantEmail"])
  )
  const email = emailRaw ? (emailRaw.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)?.[1] || emailRaw) : null

  const phoneRaw = firstNonEmpty(
    pickEntry(entry, ["Phone","PhoneNumber","ContactPhone","BusinessPhone","PrimaryPhone","Mobile","CellPhone","Telephone","WorkPhone"])
  )
  const phone = phoneRaw ? phoneRaw.replace(/[^\d\-\(\)\s\+\.]/g, "").trim() : null

  const loan_amount = cleanCurrency(firstNonEmpty(
    pickEntry(entry, ["LoanAmount","FundingAmount","AmountRequested","RequestedAmount","AmountNeeded","LoanRequest","CapitalNeeded","FinancingAmount","Amount"])
  ))

  // Determine loan type heuristically from form name or known purpose fields
  const purpose = firstNonEmpty(pickEntry(entry, ["Purpose","LoanPurpose","FundingPurpose"]))
  const context = [purpose, form?.Name].filter(Boolean).join(" ").toLowerCase()
  let loan_type = "Business Loan"
  if (/\bequipment\b/.test(context)) loan_type = "Equipment Financing"
  else if (/working\s+capital/.test(context)) loan_type = "Working Capital"
  else if (/\bmca\b|merchant\s+cash\s+advance/.test(context)) loan_type = "Merchant Cash Advance"
  else if (/real\s+estate|cre|commercial\s+property/.test(context)) loan_type = "Commercial Real Estate (CRE)"
  else if (/sba\s*7/.test(context)) loan_type = "SBA 7(a)"
  else if (/sba\s*504/.test(context)) loan_type = "SBA 504"
  else if (/loc|line\s+of\s+credit/.test(context)) loan_type = "Line of Credit (LOC)"

  const date_submitted = (() => {
    const raw = firstNonEmpty(entry.DateCreated, entry.SubmissionDate, entry.SubmittedAt)
    if (raw) {
      const d = new Date(String(raw))
      if (!isNaN(d.getTime())) return d.toISOString().split("T")[0]
    }
    return new Date().toISOString().split("T")[0]
  })()

  // IDs
  const cognito_entry_id = String(firstNonEmpty(entry.EntryId, entry.EntryNumber, entry.id, entry.Id) || "")
  const form_id = form?.Id ? String(form.Id) : null
  const form_name = form?.Name || null

  return {
    legal_company_name,
    client_name,
    email,
    phone,
    loan_amount,
    loan_type,
    status: "new",
    source: "CognitoForms",
    date_submitted,
    cognito_entry_id,
    form_id,
    form_name,
    form_data: entry,
  }
}

async function fetchJSON(url: string, apiKey: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.Message || data?.error || `HTTP ${res.status}`)
  }
  return data
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const apiKey = Deno.env.get("COGNITO_API_KEY") ?? ""
    const orgId = Deno.env.get("COGNITO_ORG_ID") ?? ""

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ success: false, error: "Supabase env not set" }, 500)
    }
    if (!apiKey || !orgId) {
      return json({ success: false, error: "CognitoForms secrets missing" }, 500)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const body: SyncBody = await req.json().catch(() => ({}))
    const limit = Math.min(Math.max(Number(body.limit ?? 100), 1), 500)

    // Get forms
    const formsUrl = `https://www.cognitoforms.com/api/v1/organizations/${orgId}/forms`
    const forms: CognitoForm[] = await fetchJSON(formsUrl, apiKey)

    const selectedForms = Array.isArray(body.formIds) && body.formIds.length > 0
      ? forms.filter((f) => body.formIds!.includes(String(f.Id)))
      : forms

    let created = 0
    let updated = 0
    let processed = 0

    // Date filters (optional)
    const start = body.startDate ? new Date(body.startDate) : null
    const end = body.endDate ? new Date(body.endDate) : null

    for (const form of selectedForms) {
      // Fetch entries for each form
      const entriesUrlBase = `https://www.cognitoforms.com/api/v1/organizations/${orgId}/forms/${form.Id}/entries`
      const entriesUrl = `${entriesUrlBase}?limit=${limit}`
      const entries: CognitoEntry[] = await fetchJSON(entriesUrl, apiKey)

      for (const entry of entries) {
        processed++
        // Optional date filter
        if (start || end) {
          const when = entry.DateCreated ? new Date(String(entry.DateCreated)) : null
          if (when) {
            if (start && when < start) continue
            if (end && when > end) continue
          }
        }

        const parsed = parseDealFromEntry(entry, form)
        if (!parsed.legal_company_name) {
          // Skip entries without company
          continue
        }

        // Deduplicate by cognito_entry_id + form_id
        const { data: existing } = await supabase
          .from("deals")
          .select("id, legal_company_name, loan_amount, loan_type, status, source, cognito_entry_id, form_id")
          .eq("cognito_entry_id", parsed.cognito_entry_id)
          .eq("form_id", parsed.form_id)
          .limit(1)

        if (Array.isArray(existing) && existing.length > 0) {
          const target = existing[0]
          // Merge minimal updates (avoid overwriting non-empty with empty)
          const updates: Record<string, any> = {}
          const fields = ["legal_company_name","client_name","email","phone","loan_amount","loan_type","status","source","date_submitted","form_name","form_data"]
          for (const f of fields) {
            const v = (parsed as any)[f]
            if (v !== undefined && v !== null && String(v) !== "" ) {
              // Only update if value changed
              if (String((target as any)[f] ?? "") !== String(v)) {
                updates[f] = v
              }
            }
          }
          if (Object.keys(updates).length > 0) {
            const { error: updErr } = await supabase
              .from("deals")
              .update(updates)
              .eq("id", target.id)
            if (!updErr) updated++
          }
        } else {
          const { error: insErr } = await supabase.from("deals").insert(parsed as any)
          if (!insErr) created++
        }
      }
    }

    return json({
      success: true,
      processed,
      created,
      updated,
      message: `Synced ${processed} entries • ${created} created, ${updated} updated`,
    }, 200)
  } catch (e) {
    console.error("cognito-sync error:", e)
    return json({ success: false, error: (e as Error).message || "internal_error" }, 500)
  }
})