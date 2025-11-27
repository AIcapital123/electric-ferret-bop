import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

type Body = {
  q?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  maxResults?: number;
  test?: boolean;
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function toGmailDate(d?: string): string | undefined {
  if (!d) return undefined;
  // Gmail uses YYYY/MM/DD in query filters
  return d.replace(/-/g, "/");
}

function detectLoanType(subject: string): string {
  const types = [
    "Personal Loan",
    "Business Loan",
    "Equipment Leasing",
    "Hard Money",
    "Commercial Real Estate",
  ];
  const lower = subject.toLowerCase();
  for (const t of types) {
    if (lower.includes(t.toLowerCase())) return t;
  }
  return "Personal Loan";
}

function extractEmailParts(fromHeader?: string): { name?: string; email?: string } {
  if (!fromHeader) return {};
  const emailMatch = fromHeader.match(/<([^>]+)>/);
  const email = emailMatch ? emailMatch[1] : undefined;
  const name = fromHeader.replace(/<[^>]+>/, "").trim().replace(/^"|"$/g, "") || undefined;
  return { name, email };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("🚀 Gmail sync started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !supabaseKey) {
      return json({ error: "Supabase env not set" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Manual auth since verify_jwt=false
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "No authorization header" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userRes, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userRes?.user) {
      return json({ error: "Invalid user token" }, 401);
    }
    const user = userRes.user;
    console.log("✅ User authenticated:", user.email);

    const body: Body = await req.json().catch(() => ({}));
    const maxResults = Math.max(1, Math.min(100, Number(body.maxResults || 25)));

    // Load Google account credentials
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .single();

    if (accountError || !account) {
      console.error("No connected Gmail account", accountError);
      return json({ error: "No Gmail account connected" }, 400);
    }

    let accessToken = account.access_token as string;
    const expiresAt = account.expires_at as number | null;

    // Refresh if expired
    if (expiresAt && Date.now() > expiresAt * 1000) {
      console.log("🔄 Refreshing token");
      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
          client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
          refresh_token: account.refresh_token ?? "",
          grant_type: "refresh_token",
        }),
      });

      if (!refreshResponse.ok) {
        const errText = await refreshResponse.text();
        console.error("Failed to refresh token:", errText);
        return json({ error: "token_refresh_failed" }, 500);
      }

      const refreshJson = await refreshResponse.json();
      accessToken = refreshJson.access_token;

      const newExpiresAt =
        typeof refreshJson.expires_in === "number"
          ? Math.floor(Date.now() / 1000) + Number(refreshJson.expires_in)
          : null;

      const { error: updateError } = await supabase
        .from("accounts")
        .update({ access_token: accessToken, expires_at: newExpiresAt })
        .eq("user_id", user.id)
        .eq("provider", "google");
      if (updateError) {
        console.error("Failed to persist refreshed token:", updateError);
      }
    }

    // Build Gmail search query
    let query = body.q || "";
    const after = toGmailDate(body.startDate);
    const before = toGmailDate(body.endDate);
    const range: string[] = [];
    if (after) range.push(`after:${after}`);
    if (before) range.push(`before:${before}`);
    if (range.length > 0) {
      query = query ? `${query} ${range.join(" ")}` : range.join(" ");
    }

    // Fetch messages list
    const params = new URLSearchParams();
    params.set("maxResults", String(maxResults));
    if (query) params.set("q", query);

    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`;
    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listRes.ok) {
      const errText = await listRes.text();
      console.error("List messages failed:", errText);
      return json({ error: "gmail_list_failed" }, 500);
    }

    const listJson = await listRes.json();
    const messages: { id: string }[] = listJson.messages || [];
    if (messages.length === 0) {
      console.log("No messages found");
      return json({ parsed: [], inserted: 0 }, 200);
    }

    const parsed: any[] = [];
    let inserted = 0;

    for (const msg of messages) {
      const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`;
      const detailRes = await fetch(detailUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!detailRes.ok) {
        console.warn("Skip message (detail fetch failed):", msg.id);
        continue;
      }
      const detailJson = await detailRes.json();

      const headers: { name: string; value: string }[] =
        detailJson?.payload?.headers || [];
      const getHeader = (n: string) =>
        headers.find((h) => h.name.toLowerCase() === n.toLowerCase())?.value;

      const subject = getHeader("Subject") || "(no subject)";
      const from = getHeader("From") || "";
      const dateHeader = getHeader("Date");
      const { name: clientName, email: clientEmail } = extractEmailParts(from);
      const loanType = detectLoanType(subject);

      // Normalize to YYYY-MM-DD (UTC date)
      let dateSubmitted = new Date().toISOString().split("T")[0];
      if (dateHeader) {
        const dt = new Date(dateHeader);
        if (!isNaN(dt.getTime())) {
          dateSubmitted = dt.toISOString().split("T")[0];
        }
      }

      // Check duplicate by gmail_message_id
      const { data: existing, error: existingError } = await supabase
        .from("deals")
        .select("id")
        .eq("gmail_message_id", msg.id)
        .limit(1);
      if (existingError) {
        console.error("Duplicate check failed:", existingError);
      }
      const already = Array.isArray(existing) && existing.length > 0;

      if (!already && !body.test) {
        const { error: insError } = await supabase.from("deals").insert({
          date_submitted: dateSubmitted,
          loan_type: loanType,
          legal_company_name: "N/A",
          client_name: clientName || "Unknown",
          client_email: clientEmail || null,
          loan_amount_sought: 0,
          status: "New",
          source: "Gmail",
          gmail_message_id: msg.id,
          raw_email: JSON.stringify({
            subject,
            from,
            snippet: detailJson?.snippet,
          }),
        });
        if (insError) {
          console.error("Insert deal failed:", insError);
        } else {
          inserted += 1;
        }
      }

      parsed.push({
        date_submitted: dateSubmitted,
        loan_type: loanType,
        legal_company_name: "N/A",
        client_name: clientName || "Unknown",
        client_email: clientEmail || undefined,
        client_phone: undefined,
        loan_amount_sought: 0,
      });
    }

    console.log(`✅ Sync complete. parsed=${parsed.length}, inserted=${inserted}`);
    return json({ parsed, inserted }, 200);
  } catch (e) {
    console.error("sync-gmail exception:", e);
    return json({ error: "internal_error" }, 500);
  }
});