// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
}

type Body = { dealId?: string }

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

    const body: Body = await req.json().catch(() => ({}))
    if (!body.dealId) {
      return json({ error: "Missing dealId" }, 400)
    }

    const { data, error } = await supabase
      .from("deal_notes")
      .select("*")
      .eq("deal_id", body.dealId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("list-deal-notes error:", error)
      return json({ error: "query_failed" }, 500)
    }

    return json({ notes: data ?? [] }, 200)
  } catch (e) {
    console.error("list-deal-notes exception:", e)
    return json({ error: "internal_error" }, 500)
  }
})