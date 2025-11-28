import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

type CreateTestAccountResponse = {
  success: boolean
  session?: {
    access_token: string
    refresh_token: string
    expires_at?: number
    token_type?: string
    user?: unknown
  }
  email?: string
  password?: string
  error?: string
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)]
}

function companyName(): string {
  const prefixes = ["Go", "Blue", "Prime", "Vertex", "Apex", "Nova", "Bright", "Quantum", "Summit", "Atlas"]
  const suffixes = ["Capital", "Solutions", "Holdings", "Industries", "Enterprises", "Group", "Partners", "Logistics", "Systems", "Dynamics"]
  const legalTypes = ["LLC", "Inc", "Corp", "Ltd"]
  return `${pick(prefixes)}${pick(suffixes)} ${pick(legalTypes)}`
}

function personName(): string {
  const first = ["Alex", "Jordan", "Taylor", "Chris", "Morgan", "Sam", "Jamie", "Riley", "Avery", "Casey"]
  const last = ["Smith", "Johnson", "Lee", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson"]
  return `${pick(first)} ${pick(last)}`
}

function loanType(): string {
  return pick([
    "Merchant Cash Advance",
    "Term Loan",
    "Line of Credit (LOC)",
    "Factoring",
    "Equipment Financing",
    "SBA 7(a)",
    "SBA 504",
    "Commercial Real Estate (CRE)",
    "Personal Loan",
    "Business Credit Card",
    "Other"
  ])
}

function status(): string {
  return pick(["new", "in_review", "missing_docs", "submitted", "approved", "funded", "declined"])
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ success: false, error: "Missing Supabase env vars" }, 500)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)
    const publicClient = anonKey ? createClient(supabaseUrl, anonKey) : null

    // Create unique test user
    const email = `demo-${Date.now()}@test.gokapital-crm.com`
    const password = "TestAccount123!"

    const { data: createdUser, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Demo User", source: "test_data" },
    })

    if (createErr || !createdUser.user) {
      return json({ success: false, error: createErr?.message || "Failed to create user" }, 500)
    }

    const userId = createdUser.user.id

    // Seed 50 deals (canonical schema)
    const rows = Array.from({ length: 50 }).map(() => ({
      legal_company_name: companyName(),
      client_name: personName(),
      loan_amount: randomInt(15000, 500000),
      loan_type: loanType(),
      status: status(),
      source: "test_data",
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    const { error: insertErr } = await admin.from("deals").insert(rows)
    if (insertErr) {
      return json({ success: false, error: insertErr.message || "Failed to insert deals" }, 500)
    }

    // Try to sign the user in to get session tokens if anon key exists
    if (publicClient) {
      const { data: signInData, error: signInErr } = await publicClient.auth.signInWithPassword({
        email,
        password,
      })
      if (!signInErr && signInData.session) {
        const sess = signInData.session
        return json({
          success: true,
          session: {
            access_token: sess.access_token,
            refresh_token: sess.refresh_token,
            expires_at: (sess.expires_at as number | null) ?? undefined,
            token_type: "bearer",
            user: sess.user,
          },
          email,
          password,
        }, 200)
      }
    }

    // If anon key missing or sign-in failed, still return credentials for client-side sign in
    return json({
      success: true,
      email,
      password,
    }, 200)
  } catch (e) {
    console.error("create-test-account error:", e)
    return json({ success: false, error: (e as Error).message }, 500)
  }
})