import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

type Body = { id?: string; status?: string };

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      return json({ error: "Supabase env not set" }, 500);
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: Body = await req.json().catch(() => ({}));
    if (!body.id || typeof body.status !== "string" || !body.status.trim()) {
      return json({ error: "Missing id or status" }, 400);
    }

    const { data, error } = await supabase
      .from("deals")
      .update({ status: body.status })
      .eq("id", body.id)
      .select("id, status")
      .single();

    if (error) {
      console.error("update-deal-status error:", error);
      return json({ error: "update_failed" }, 500);
    }

    return json({ deal: data }, 200);
  } catch (e) {
    console.error("update-deal-status exception:", e);
    return json({ error: "internal_error" }, 500);
  }
});