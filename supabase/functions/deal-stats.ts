// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
}

type StatsResponse = {
  success: boolean
  total: number
  fundedThisMonth: number
  countsByStatus: Record<string, number>
  totalPipelineSum: number
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
      return json({ success: false, error: "Supabase env not set" }, 500)
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Compute basic totals using count-only queries
    const statuses = ["new","in_review","missing_docs","submitted","approved","funded","declined"]
    const countsByStatus: Record<string, number> = {}

    // Total deals
    const { count: total } = await supabase.from("deals").select("*", { count: "exact", head: true })

    // This month range (UTC)
    const start = new Date()
    start.setUTCDate(1)
    start.setUTCHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setUTCMonth(end.getUTCMonth() + 1)

    const { count: fundedThisMonth } = await supabase
      .from("deals")
      .select("*", { count: "exact", head: true })
      .eq("status", "funded")
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())

    // Status counts
    for (const s of statuses) {
      const { count } = await supabase
        .from("deals")
        .select("*", { count: "exact", head: true })
        .eq("status", s)
      countsByStatus[s] = count ?? 0
    }

    // Total pipeline sum (exclude declined), fetch in batches to avoid large payloads
    let totalPipelineSum = 0
    const batchSize = 1000
    let offset = 0

    while (true) {
      const { data, error } = await supabase
        .from("deals")
        .select("loan_amount,status")
        .neq("status", "declined")
        .order("created_at", { ascending: false })
        .range(offset, offset + batchSize - 1)

      if (error) {
        console.error("deal-stats sum error:", error)
        break
      }
      if (!data || data.length === 0) break

      for (const row of data) {
        const amt = Number((row as any).loan_amount || 0)
        if (!isNaN(amt)) totalPipelineSum += amt
      }

      if (data.length < batchSize) break
      offset += batchSize
    }

    const resp: StatsResponse = {
      success: true,
      total: total ?? 0,
      fundedThisMonth: fundedThisMonth ?? 0,
      countsByStatus,
      totalPipelineSum,
    }

    return json(resp, 200)
  } catch (e) {
    console.error("deal-stats exception:", e)
    return json({ success: false, error: "internal_error" }, 500)
  }
})