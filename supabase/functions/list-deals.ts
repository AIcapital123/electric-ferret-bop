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

    let q = supabase.from("deals").select("*").order("created_at", { ascending: false })

    if (filters.loanType) {
      q = q.eq("loan_type", filters.loanType)
    }
    if (filters.status) {
      q = q.eq("status", filters.status)
    }
    if (filters.minAmount !== undefined) {
      q = q.gte("loan_amount_sought", filters.minAmount)
    }
    if (filters.maxAmount !== undefined) {
      q = q.lte("loan_amount_sought", filters.maxAmount)
    }
    if (filters.dateRange?.start) {
      q = q.gte("date_submitted", filters.dateRange.start)
    }
    if (filters.dateRange?.end) {
      q = q.lte("date_submitted", filters.dateRange.end)
    }

    const { data, error } = await q
    if (error) {
      console.error("list-deals error:", error)
      return json({ error: "query_failed" }, 500)
    }

    return json({ deals: data ?? [] }, 200)
  } catch (e) {
    console.error("list-deals exception:", e)
    return json({ error: "internal_error" }, 500)
  }
})