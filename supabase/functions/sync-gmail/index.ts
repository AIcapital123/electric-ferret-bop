import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("🚀 Gmail sync started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !supabaseKey) {
      return json({ success: false, error: "Supabase env not set" }, 500);
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Require Authorization header and validate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return json({ success: false, error: "No authorization header" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userRes, error: userError } = await supabase.auth.getUser(token);
    const user = userRes?.user;
    if (userError || !user) {
      return json({ success: false, error: "Invalid user token" }, 401);
    }
    console.log("✅ User authenticated:", user.email);

    // Get Gmail access token from accounts table
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .single();

    if (accountError || !account) {
      return json({ success: false, error: "No Gmail account connected" }, 400);
    }

    let accessToken: string | null = account.access_token ?? null;

    // Refresh token if expired
    if (!accessToken || (account.expires_at && Date.now() > (account.expires_at as number) * 1000)) {
      console.log("🔄 Refreshing token");
      const clientId = Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
      const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";
      const refreshToken = account.refresh_token ?? "";
      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });

      const refreshData = await refreshResponse.json();
      if (refreshData.access_token) {
        accessToken = refreshData.access_token as string;
        const expiresIn = typeof refreshData.expires_in === "number" ? Number(refreshData.expires_in) : 3600;
        await supabase
          .from("accounts")
          .update({
            access_token: accessToken,
            expires_at: Math.floor(Date.now() / 1000) + expiresIn,
          })
          .eq("user_id", user.id)
          .eq("provider", "google");
      }
    }

    if (!accessToken) {
      return json({ success: false, error: "Failed to obtain Gmail access token" }, 400);
    }

    // Fetch emails from Gmail - Updated search query for CognitoForms and loan keywords
    console.log("📧 Fetching emails from Gmail");
    const query =
      'from:notifications@cognitoforms.com OR subject:"loan application" OR subject:"funding request" OR subject:"deal submission"';
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`;
    const gmailResponse = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!gmailResponse.ok) {
      return json({ success: false, error: `Gmail API error: ${gmailResponse.status}` }, 500);
    }

    const gmailData = await gmailResponse.json();
    const messages: { id: string }[] = gmailData.messages || [];
    console.log(`📬 Found ${messages.length} messages`);

    if (messages.length === 0) {
      return json(
        { success: true, message: "No new emails found", processed: 0, skipped: 0, total: 0 },
        200
      );
    }

    let processedCount = 0;
    let skippedCount = 0;

    for (const message of messages) {
      try {
        // Check if already processed
        const { data: existing } = await supabase
          .from("deals")
          .select("id")
          .eq("gmail_message_id", message.id)
          .limit(1);
        const already = Array.isArray(existing) && existing.length > 0;
        if (already) {
          skippedCount++;
          continue;
        }

        // Fetch full message
        const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`;
        const messageResponse = await fetch(detailUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!messageResponse.ok) {
          console.warn("Skip message (detail fetch failed):", message.id);
          skippedCount++;
          continue;
        }

        const messageData = await messageResponse.json();
        const emailBody = extractEmailBody(messageData);
        const subject = getSubject(messageData);
        const { name: fromName, email: fromEmail } = extractEmailParts(getHeader(messageData, "From") || "");

        console.log("📄 Processing email:", subject);

        // Enhanced parsing for CognitoForms submissions
        const parsed = parseCognitoFormsEmail(emailBody, subject);

        // Require at least a company name to proceed
        if (!parsed.legal_company_name || parsed.legal_company_name === "Unknown Company") {
          console.log("⚠️ Skipping email - no company name found");
          skippedCount++;
          continue;
        }

        // Prepare data for our deals schema
        const dateSubmitted = inferDateSubmitted(messageData);
        const insertPayload = {
          date_submitted: dateSubmitted,
          loan_type: "Business Loan",
          legal_company_name: cleanCompanyName(parsed.legal_company_name),
          client_name: fromName || null,
          client_email: cleanEmail(parsed.email || fromEmail || ""),
          client_phone: cleanPhone(parsed.phone || ""),
          loan_amount_sought: Number(parsed.loan_amount || 0),
          status: "New",
          source: "Gmail",
          gmail_message_id: messageData.id as string,
          raw_email: JSON.stringify({
            subject,
            snippet: messageData?.snippet,
            thread_id: messageData?.threadId,
            parsing_method: "cognitoforms",
            preview: (emailBody || "").slice(0, 1000),
          }),
        };

        const { error: insertError } = await supabase.from("deals").insert(insertPayload);
        if (insertError) {
          console.error("❌ Insert error:", insertError);
          skippedCount++;
        } else {
          processedCount++;
          console.log("✅ Processed deal:", insertPayload.legal_company_name);
        }
      } catch (emailError) {
        console.error("❌ Error processing email:", emailError);
        skippedCount++;
      }
    }

    console.log(`✅ Sync complete: ${processedCount} new, ${skippedCount} skipped`);

    // Replace other source: remove CognitoForms deals so only Gmail remains
    let replacedSource: string | null = null;
    try {
      const { error: delErr } = await supabase.from("deals").delete().eq("source", "CognitoForms");
      if (!delErr) {
        replacedSource = "CognitoForms";
        console.log("🧹 Removed CognitoForms deals to keep Gmail-only view");
      } else {
        console.warn("⚠️ Failed to delete CognitoForms deals:", delErr);
      }
    } catch (cleanupErr) {
      console.warn("⚠️ Cleanup error (CognitoForms delete):", cleanupErr);
    }

    return json(
      {
        success: true,
        processed: processedCount,
        skipped: skippedCount,
        total: messages.length,
        replacedSource,
        message:
          `Gmail sync: ${processedCount} new, ${skippedCount} skipped${replacedSource ? ` • replaced ${replacedSource}` : ""}`,
      },
      200
    );
  } catch (error) {
    console.error("❌ Fatal error:", error);
    return json({ success: false, error: (error as Error).message }, 500);
  }
});

// Helpers

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getHeader(messageData: any, name: string): string | undefined {
  const headers: { name: string; value: string }[] = messageData?.payload?.headers || [];
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
}

function extractEmailParts(fromHeader?: string): { name?: string; email?: string } {
  if (!fromHeader) return {};
  const emailMatch = fromHeader.match(/<([^>]+)>/);
  const email = emailMatch ? emailMatch[1] : undefined;
  const name = fromHeader.replace(/<[^>]+>/, "").trim().replace(/^"|"$/g, "") || undefined;
  return { name, email };
}

function inferDateSubmitted(messageData: any): string {
  const dateHeader = getHeader(messageData, "Date");
  let dateSubmitted = new Date().toISOString().split("T")[0];
  if (dateHeader) {
    const dt = new Date(dateHeader);
    if (!isNaN(dt.getTime())) dateSubmitted = dt.toISOString().split("T")[0];
  } else if (messageData.internalDate) {
    const dt = new Date(Number(messageData.internalDate));
    if (!isNaN(dt.getTime())) dateSubmitted = dt.toISOString().split("T")[0];
  }
  return dateSubmitted;
}

// Email body extraction
function extractEmailBody(messageData: any): string {
  const payload = messageData?.payload;

  if (payload?.body?.data) {
    return decodeBase64(payload.body.data);
  }

  const parts: any[] = payload?.parts || [];
  // Prefer text/plain
  for (const part of parts) {
    if (part.mimeType === "text/plain" && part?.body?.data) {
      return decodeBase64(part.body.data);
    }
  }
  // Fallback to text/html
  for (const part of parts) {
    if (part.mimeType === "text/html" && part?.body?.data) {
      return decodeBase64(part.body.data);
    }
  }
  // Nested parts
  for (const part of parts) {
    const nested = part?.parts || [];
    for (const n of nested) {
      if (n.mimeType === "text/plain" && n?.body?.data) {
        return decodeBase64(n.body.data);
      }
    }
  }
  return "";
}

function decodeBase64(data: string): string {
  try {
    return atob(data.replace(/-/g, "+").replace(/_/g, "/"));
  } catch (_e) {
    return "";
  }
}

// Enhanced parsing specifically for CognitoForms submissions
function parseCognitoFormsEmail(body: string, subject: string) {
  const parsed: {
    legal_company_name: string;
    email: string | null;
    phone: string | null;
    loan_amount: number;
  } = {
    legal_company_name: "Unknown Company",
    email: null,
    phone: null,
    loan_amount: 0,
  };

  // Strategy 1: CognitoForms key-value pairs
  const companyKV = extractCognitoField(body, [
    "Business Name",
    "Company Name",
    "Legal Business Name",
    "Business Legal Name",
    "Company",
    "Business",
    "Organization Name",
    "Entity Name",
  ]);
  if (companyKV) parsed.legal_company_name = companyKV;

  const emailKV = extractCognitoField(body, [
    "Email Address",
    "Email",
    "Contact Email",
    "Business Email",
    "Primary Email",
  ]);
  if (emailKV) parsed.email = emailKV;

  const phoneKV = extractCognitoField(body, [
    "Phone Number",
    "Phone",
    "Contact Phone",
    "Business Phone",
    "Primary Phone",
    "Mobile",
    "Cell Phone",
    "Telephone",
  ]);
  if (phoneKV) parsed.phone = phoneKV;

  const amountKV = extractCognitoField(body, [
    "Loan Amount",
    "Funding Amount",
    "Amount Requested",
    "Requested Amount",
    "Amount Needed",
    "Loan Request",
    "Capital Needed",
    "Financing Amount",
  ]);
  if (amountKV) parsed.loan_amount = parseCurrency(amountKV);

  // Strategy 2: HTML table parsing
  if (body.includes("<table") || body.includes("<tr>")) {
    const htmlData = parseHTMLTable(body);
    if (htmlData.company) parsed.legal_company_name = htmlData.company;
    if (htmlData.email) parsed.email = htmlData.email;
    if (htmlData.phone) parsed.phone = htmlData.phone;
    if (htmlData.amount) parsed.loan_amount = parseCurrency(htmlData.amount);
  }

  // Strategy 3: Line-by-line parsing
  if (parsed.legal_company_name === "Unknown Company") {
    const lineData = parseLineByLine(body);
    if (lineData.company) parsed.legal_company_name = lineData.company;
    if (lineData.email) parsed.email = lineData.email;
    if (lineData.phone) parsed.phone = lineData.phone;
    if (lineData.amount) parsed.loan_amount = parseCurrency(lineData.amount);
  }

  // Strategy 4: Subject fallback
  if (parsed.legal_company_name === "Unknown Company") {
    const subjectCompany = extractFromSubject(subject);
    if (subjectCompany) parsed.legal_company_name = subjectCompany;
  }

  // Cleanup
  if (parsed.legal_company_name) parsed.legal_company_name = cleanCompanyName(parsed.legal_company_name);
  if (parsed.email) parsed.email = cleanEmail(parsed.email);
  if (parsed.phone) parsed.phone = cleanPhone(parsed.phone);

  return parsed;
}

// Extract field using multiple possible labels
function extractCognitoField(text: string, fieldLabels: string[]): string | null {
  for (const label of fieldLabels) {
    const patterns = [
      new RegExp(`${label}[:\\s]*([^\\n\\r]+)`, "i"),
      new RegExp(`<strong>${label}</strong>[:\\s]*([^<\\n\\r]+)`, "i"),
      new RegExp(`<b>${label}</b>[:\\s]*([^<\\n\\r]+)`, "i"),
      new RegExp(`${label}\\s*:\\s*([^\\n\\r]+)`, "i"),
      new RegExp(`${label}\\s+([^\\n\\r]+)`, "i"),
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim()) return match[1].trim();
    }
  }
  return null;
}

// Parse HTML table format
function parseHTMLTable(html: string): any {
  const data: any = {};

  const companyPatterns = [
    /<td[^>]*>(?:Business Name|Company Name|Legal Business Name)[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i,
    /<strong>(?:Business Name|Company Name)[^<]*<\/strong>[^<]*<[^>]*>([^<]+)<\/?[^>]*>/i,
  ];
  for (const pattern of companyPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      data.company = match[1].trim();
      break;
    }
  }

  const emailMatch = html.match(/<td[^>]*>(?:Email|Email Address)[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i);
  if (emailMatch) data.email = emailMatch[1].trim();

  const phoneMatch = html.match(/<td[^>]*>(?:Phone|Phone Number)[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i);
  if (phoneMatch) data.phone = phoneMatch[1].trim();

  const amountMatch = html.match(/<td[^>]*>(?:Loan Amount|Amount)[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i);
  if (amountMatch) data.amount = amountMatch[1].trim();

  return data;
}

// Parse line-by-line format
function parseLineByLine(text: string): any {
  const lines = text.split("\n");
  const data: any = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.toLowerCase().includes("company") || line.toLowerCase().includes("business")) {
      if (line.includes(":")) {
        const parts = line.split(":");
        if (parts.length > 1) data.company = parts[1].trim();
      } else if (i + 1 < lines.length) {
        data.company = lines[i + 1].trim();
      }
    }

    const emailMatch = line.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) data.email = emailMatch[1];

    const phoneMatch = line.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
    if (phoneMatch) data.phone = phoneMatch[1];

    const amountMatch = line.match(/\$[\d,]+/);
    if (amountMatch) data.amount = amountMatch[0];
  }

  return data;
}

// Helper functions
function extractFromSubject(subject: string): string | null {
  const match = subject.match(/(?:from|by|for)\s+([^-\[\(]+)/i);
  return match ? match[1].trim() : null;
}

function cleanCompanyName(name: string): string {
  return name.replace(/^[:\-\s]+/, "").replace(/[:\-\s]+$/, "").replace(/\s+/g, " ").trim();
}

function cleanEmail(email: string): string {
  const match = email.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return match ? match[1] : email;
}

function cleanPhone(phone: string): string {
  return phone.replace(/[^\d\-\(\)\s\+\.]/g, "").trim();
}

function parseCurrency(value: string): number {
  if (!value) return 0;
  const numStr = value.replace(/[^0-9]/g, "");
  return parseInt(numStr) || 0;
}

function getSubject(messageData: any): string {
  const headers = messageData.payload?.headers || [];
  const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === "subject");
  return subjectHeader?.value || "";
}