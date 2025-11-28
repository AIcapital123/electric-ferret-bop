import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

type SyncBody = {
  formIds?: string[]
  startDate?: string
  endDate?: string
  limit?: number
  action?: "bulk_sync" | "webhook" | "diagnostic" | string
  orgId?: string | null
}

type CognitoForm = {
  Id: string
  Name: string
}

type CognitoOrg = {
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
    const raw = firstNonEmpty(entry.DateCreated, (entry as any).SubmissionDate, (entry as any).SubmittedAt)
    if (raw) {
      const d = new Date(String(raw))
      if (!isNaN(d.getTime())) return d.toISOString().split("T")[0]
    }
    return new Date().toISOString().split("T")[0]
  })()

  const cognito_entry_id = String(firstNonEmpty(entry.EntryId, entry.EntryNumber, (entry as any).id, (entry as any).Id) || "")
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
  const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = (data && (data.Message || data.error)) || `HTTP ${res.status}`
    throw new Error(`${msg} at ${url}`)
  }
  return data
}

function isGuidLike(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '').trim()
}

async function resolveOrgIdByNameOrSlug(provided: string, apiKey: string): Promise<string | null> {
  if (!provided) return null
  try {
    const orgsUrl = `https://www.cognitoforms.com/api/v1/organizations`
    const orgs = await fetchJSON(orgsUrl, apiKey) as CognitoOrg[]
    if (!Array.isArray(orgs)) return null
    const target = slugify(provided)
    const found = orgs.find(o => o.Name === provided) 
      || orgs.find(o => slugify(o.Name) === target)
    return found?.Id ?? null
  } catch (e) {
    console.warn("cognito-sync: Unable to list organizations to resolve name/slug; your token may not allow org listing.", { error: (e as Error).message })
    return null
  }
}

// Decode base64url without verifying (we only need organizationId claim)
function base64UrlDecode(str: string): string {
  const pad = '='.repeat((4 - (str.length % 4)) % 4)
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad
  return atob(b64)
}

function extractOrgIdFromJwtPayload(payload: Record<string, any>): string | null {
  const candidates = [
    "organizationId","OrganizationId",
    "organization","Organization",
    "orgId","OrgId",
    "org","Org"
  ]

  for (const key of candidates) {
    const val = payload[key]
    if (!val) continue
    if (typeof val === "string" && isGuidLike(val)) return val
    if (typeof val === "object" && val !== null) {
      const maybeId = (val as any).Id || (val as any).id
      if (typeof maybeId === "string" && isGuidLike(maybeId)) return maybeId
    }
  }
  return null
}

function getOrgIdFromJwt(token: string | null | undefined): string | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const payloadJson = base64UrlDecode(parts[1])
    const payload = JSON.parse(payloadJson) as Record<string, any>
    const id = extractOrgIdFromJwtPayload(payload)
    return id && isGuidLike(id) ? id : null
  } catch {
    return null
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").trim()
    const serviceRoleKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim()
    const apiKey = ((Deno.env.get("COGNITO_API_KEY") ?? Deno.env.get("COGNITO_API_TOKEN") ?? "") as string).trim()
    const orgIdRawEnv = ((Deno.env.get("COGNITO_ORG_ID") ?? "") as string).trim()

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("cognito-sync: Missing Supabase env SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
      return json({ success: false, error: "Supabase env not set (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing)" }, 500)
    }
    if (!apiKey) {
      console.error("cognito-sync: Missing CognitoForms API key secret")
      return json({ success: false, error: "CognitoForms secret missing (COGNITO_API_KEY or COGNITO_API_TOKEN)" }, 500)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const body: SyncBody = await req.json().catch(() => ({}))
    const limit = Math.min(Math.max(Number(body.limit ?? 100), 1), 500)

    // Build orgId candidates in priority order:
    // 1) orgId from request body (explicit override)
    // 2) organizationId from integration token
    // 3) env GUID (COGNITO_ORG_ID if guid)
    // 4) env name/slug resolution (COGNITO_ORG_ID if not guid)
    const explicitOrgId = (body.orgId && typeof body.orgId === "string" ? body.orgId.trim() : null) || null
    const orgFromToken = getOrgIdFromJwt(apiKey)
    const envGuid = isGuidLike(orgIdRawEnv) ? orgIdRawEnv : null
    const resolvedName = envGuid ? null : await resolveOrgIdByNameOrSlug(orgIdRawEnv, apiKey)
    const explicitResolved = explicitOrgId && !isGuidLike(explicitOrgId) ? (await resolveOrgIdByNameOrSlug(explicitOrgId, apiKey)) : null

    const candidates: Array<{ id: string, source: "explicit" | "explicit_resolved_name" | "token_claim" | "env_guid" | "resolved_name" }> = []
    if (explicitOrgId && isGuidLike(explicitOrgId)) candidates.push({ id: explicitOrgId, source: "explicit" })
    if (explicitResolved) candidates.push({ id: explicitResolved, source: "explicit_resolved_name" })
    if (orgFromToken) candidates.push({ id: orgFromToken, source: "token_claim" })
    if (envGuid) candidates.push({ id: envGuid, source: "env_guid" })
    if (resolvedName) candidates.push({ id: resolvedName, source: "resolved_name" })

    if (candidates.length === 0) {
      console.error("cognito-sync: Unable to resolve organization identifier", { providedEnv: orgIdRawEnv })
      return json({ success: false, error: "Invalid CognitoForms organization identifier (no valid GUID from token, body, or env/slug)" }, 400)
    }

    // Try each candidate until forms listing succeeds
    let orgId: string | null = null
    let orgSource: "explicit" | "explicit_resolved_name" | "token_claim" | "env_guid" | "resolved_name" | "discover" | "unknown" = "unknown"
    let forms: CognitoForm[] = []

    for (const c of candidates) {
      const formsUrl = `https://www.cognitoforms.com/api/v1/organizations/${c.id}/forms`
      try {
        const fetched = await fetchJSON(formsUrl, apiKey) as CognitoForm[]
        if (Array.isArray(fetched)) {
          orgId = c.id
          orgSource = c.source
          forms = fetched
          break
        }
      } catch (e) {
        console.warn("cognito-sync: Failed to list forms for candidate orgId", { candidate: c, error: (e as Error).message })
      }
    }

    // FINAL FALLBACK: discover an accessible organization by listing all orgs and testing forms
    let orgsCount: number | undefined = undefined
    if (!orgId) {
      try {
        const orgsUrl = `https://www.cognitoforms.com/api/v1/organizations`
        const orgs = await fetchJSON(orgsUrl, apiKey) as CognitoOrg[]
        if (Array.isArray(orgs)) {
          orgsCount = orgs.length
          for (const o of orgs) {
            try {
              const url = `https://www.cognitoforms.com/api/v1/organizations/${o.Id}/forms`
              const fetched = await fetchJSON(url, apiKey) as CognitoForm[]
              if (Array.isArray(fetched)) {
                orgId = o.Id
                orgSource = "discover"
                forms = fetched
                console.info("cognito-sync: discovered accessible org via listing", { orgId, orgName: o.Name })
                break
              }
            } catch (e) {
              // continue to next org
            }
          }
        }
      } catch (e) {
        console.warn("cognito-sync: organization listing not permitted or failed", { error: (e as Error).message })
      }
    }

    // Log diagnostic info (no secrets)
    console.info("cognito-sync: resolved CognitoForms organization", {
      orgId,
      orgSource,
      hasOrgInToken: !!orgFromToken,
      candidatesCount: candidates.length,
    })

    if (!orgId) {
      return json({
        success: false,
        error: "Unable to access forms for any resolved organization ID",
        details: {
          hasOrgInToken: !!orgFromToken,
          candidates: candidates.map(c => c.source),
          orgsCount
        }
      }, 404)
    }

    // If diagnostic mode, return org info and forms count without running a full sync
    if (body.action === "diagnostic") {
      return json({
        success: true,
        diagnostic: true,
        orgId,
        orgSource,
        hasOrgInToken: !!orgFromToken,
        formsCount: Array.isArray(forms) ? forms.length : 0,
        orgsCount
      }, 200)
    }

    const selectedForms = Array.isArray(body.formIds) && body.formIds.length > 0
      ? forms.filter((f) => body.formIds!.includes(String(f.Id)))
      : forms

    let created = 0
    let updated = 0
    let processed = 0

    const start = body.startDate ? new Date(body.startDate) : null
    const end = body.endDate ? new Date(body.endDate) : null

    for (const form of selectedForms) {
      const entriesUrlBase = `https://www.cognitoforms.com/api/v1/organizations/${orgId}/forms/${form.Id}/entries`
      const entriesUrl = `${entriesUrlBase}?limit=${limit}`
      const entries: CognitoEntry[] = await fetchJSON(entriesUrl, apiKey)

      for (const entry of entries) {
        processed++

        if (start || end) {
          const when = entry.DateCreated ? new Date(String(entry.DateCreated)) : null
          if (when) {
            if (start && when < start) continue
            if (end && when > end) continue
          }
        }

        const parsed = parseDealFromEntry(entry, form)
        if (!parsed.legal_company_name) continue

        const { data: existing } = await supabase
          .from("deals")
          .select("id, legal_company_name, loan_amount, loan_type, status, source, cognito_entry_id, form_id")
          .eq("cognito_entry_id", parsed.cognito_entry_id)
          .eq("form_id", parsed.form_id)
          .limit(1)

        if (Array.isArray(existing) && existing.length > 0) {
          const target = existing[0]
          const updates: Record<string, any> = {}
          const fields = ["legal_company_name","client_name","email","phone","loan_amount","loan_type","status","source","date_submitted","form_name","form_data"]
          for (const f of fields) {
            const v = (parsed as any)[f]
            if (v !== undefined && v !== null && String(v) !== "" ) {
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

    // Replace other source: remove Gmail deals so only CognitoForms remains
    let replacedSource: string | null = null
    try {
      const { error: delErr } = await supabase.from("deals").delete().eq("source", "Gmail")
      if (!delErr) {
        replacedSource = "Gmail"
        console.log("🧹 Removed Gmail deals to keep CognitoForms-only view")
      } else {
        console.warn("⚠️ Failed to delete Gmail deals:", delErr)
      }
    } catch (cleanupErr) {
      console.warn("⚠️ Cleanup error (Gmail delete):", cleanupErr)
    }

    return json({
      success: true,
      processed,
      created,
      updated,
      orgId,
      orgSource,
      replacedSource,
      message: `Cognito sync: ${processed} entries • ${created} created, ${updated} updated${replacedSource ? ` • replaced ${replacedSource}` : ""}`
    }, 200)
  } catch (e) {
    console.error("cognito-sync error:", e)
    return json({ success: false, error: (e as Error).message || "internal_error" }, 500)
  }
})