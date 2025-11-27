// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
}

type DealFilters = {
  dateRange?: { start: string; end: string }
  loanType?: string
  minAmount?: number
  maxAmount?: number
  status?: string
  search?: string
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!supabaseUrl || !supabaseKey) {
      return json({ error: "Supabase env not set" }, 500)
    }
    const supabase = createClient(supabaseUrl, supabaseKey)

    const body = await req.json().catch(() => ({}))
    const filters: DealFilters = body?.filters || {}
    const page: number = Math.max(1, Number(body?.page ?? 1))
    const pageSizeRaw: number = Number(body?.pageSize ?? 25)
    const pageSize: number = Math.min(100, Math.max(1, pageSizeRaw))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let q = supabase
      .from("deals")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })

    if (filters.loanType) {
      q = q.eq("loan_type", filters.loanType)
    }
    if (filters.status) {
      q = q.eq("status", filters.status)
    }
    if (filters.minAmount !== undefined) {
      q = q.gte("loan_amount", filters.minAmount)
    }
    if (filters.maxAmount !== undefined) {
      q = q.lte("loan_amount", filters.maxAmount)
    }
    if (filters.dateRange?.start) {
      q = q.gte("created_at", filters.dateRange.start)
    }
    if (filters.dateRange?.end) {
      q = q.lte("created_at", filters.dateRange.end)
    }
    if (filters.search && String(filters.search).trim() !== "") {
      const s = String(filters.search).trim()
      q = q.or([
        `client_name.ilike.%${s}%`,
        `legal_company_name.ilike.%${s}%`,
        `loan_type.ilike.%${s}%`,
        `status.ilike.%${s}%`,
        `email.ilike.%${s}%`,
        `phone.ilike.%${s}%`,
        `notes_internal.ilike.%${s}%`,
      ].join(","))
    }

    q = q.range(from, to)

    const { data, error, count } = await q
    if (error) {
      console.error("list-deals error:", error)
      return json({ error: "query_failed" }, 500)
    }

    return json({ deals: data ?? [], page, pageSize, total: count ?? 0 }, 200)
  } catch (e) {
    console.error("list-deals exception:", e)
    return json({ error: "internal_error" }, 500)
  }
})