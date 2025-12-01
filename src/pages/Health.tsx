"use client";

import React, { useEffect, useMemo, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { showError, showSuccess } from "@/utils/toast";

type DiagnosticResult = {
  orgId: string | null;
  orgSource: string;
  formsCount: number;
  hasOrgInToken: boolean;
} | null;

type SyncResult = {
  processed: number;
  created: number;
  updated: number;
  replacedSource?: string | null;
} | null;

export default function HealthPage() {
  const [supabaseUrl] = useState<string>(() => (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "fallback");
  const [hasAnon] = useState<boolean>(() => !!(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined));
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  const [orgInput, setOrgInput] = useState<string>("");
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult>(null);
  const [syncResult, setSyncResult] = useState<SyncResult>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSessionEmail(session?.user?.email ?? null);
    };
    init();

    const fromEnv = (import.meta.env.VITE_COGNITO_ORG_ID as string | undefined)?.trim() || "";
    const fromStorage = (typeof window !== "undefined" && window.localStorage.getItem("cognito_org_id")) || "";
    setOrgInput((fromStorage || fromEnv || "").trim());
  }, []);

  const orgOverride = useMemo(() => orgInput.trim() || undefined, [orgInput]);

  const saveOrgOverride = () => {
    const val = orgInput.trim();
    if (typeof window !== "undefined") {
      window.localStorage.setItem("cognito_org_id", val);
    }
    showSuccess(val ? "Saved Cognito organization override" : "Cleared Cognito organization override");
  };

  const runDiagnostic = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      showError("Not authenticated");
      return;
    }

    const { error, data } = await supabase.functions.invoke("cognito-sync", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: { action: "diagnostic", orgId: orgOverride },
    });

    if (error) {
      showError(error.message || "Diagnostic failed");
      return;
    }

    const result: DiagnosticResult = {
      orgId: (data as any)?.orgId ?? null,
      orgSource: (data as any)?.orgSource ?? "unknown",
      formsCount: (data as any)?.formsCount ?? 0,
      hasOrgInToken: !!(data as any)?.hasOrgInToken,
    };
    setDiagnostic(result);

    if (!result.orgId || result.formsCount === 0) {
      showError("Diagnostic: org not accessible or no forms found — check GUID or token permissions.");
    } else {
      showSuccess(`Diagnostic OK: ${result.formsCount} forms accessible (${result.orgSource})`);
    }
  };

  const runSampleSync = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      showError("Not authenticated");
      return;
    }

    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { error, data } = await supabase.functions.invoke("cognito-sync", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: { action: "bulk_sync", orgId: orgOverride, limit: 1, startDate },
    });

    if (error) {
      showError(error.message || "Sample sync failed");
      return;
    }

    const result: SyncResult = {
      processed: (data as any)?.processed ?? 0,
      created: (data as any)?.created ?? 0,
      updated: (data as any)?.updated ?? 0,
      replacedSource: (data as any)?.replacedSource ?? null,
    };
    setSyncResult(result);

    showSuccess(
      `Sample sync: ${result.processed} processed, ${result.created} created, ${result.updated} updated${result.replacedSource ? ` • replaced ${result.replacedSource}` : ""}`
    );
  };

  const checkDealStats = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      showError("Not authenticated");
      return;
    }

    const { error, data } = await supabase.functions.invoke("deal-stats", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: {},
    });

    if (error) {
      showError(error.message || "Deal stats failed");
      return;
    }

    setStats(data);
    showSuccess("Deal stats fetched");
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1">
        <AppHeader />
        <div className="container mx-auto p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Environment & Session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-md border bg-muted/30">
                  <div className="text-sm font-medium">Supabase URL</div>
                  <div className="text-xs text-muted-foreground break-words">{supabaseUrl}</div>
                </div>
                <div className="p-3 rounded-md border bg-muted/30">
                  <div className="text-sm font-medium">Anon Key Present</div>
                  <div className="text-xs text-muted-foreground">{hasAnon ? "Yes" : "No (using fallback)"}</div>
                </div>
              </div>
              <div className="p-3 rounded-md border bg-muted/30">
                <div className="text-sm font-medium">Current Session</div>
                <div className="text-xs text-muted-foreground">{sessionEmail ?? "No active session"}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cognito Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={orgInput}
                  onChange={(e) => setOrgInput(e.target.value)}
                  placeholder="Cognito org GUID or name"
                  className="w-72"
                />
                <Button variant="outline" size="sm" onClick={saveOrgOverride}>Save</Button>
                <Button variant="outline" size="sm" onClick={runDiagnostic}>Run Diagnostic</Button>
              </div>
              {diagnostic && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-md border bg-muted/30">
                    <div className="text-sm font-medium">Resolved Org ID</div>
                    <div className="text-xs text-muted-foreground break-words">{diagnostic.orgId || "-"}</div>
                  </div>
                  <div className="p-3 rounded-md border bg-muted/30">
                    <div className="text-sm font-medium">Resolution Source</div>
                    <div className="text-xs text-muted-foreground">{diagnostic.orgSource}</div>
                  </div>
                  <div className="p-3 rounded-md border bg-muted/30">
                    <div className="text-sm font-medium">Forms Accessible</div>
                    <div className="text-xs text-muted-foreground">{diagnostic.formsCount}</div>
                  </div>
                  <div className="p-3 rounded-md border bg-muted/30">
                    <div className="text-sm font-medium">Org in Token Claim</div>
                    <div className="text-xs text-muted-foreground">{diagnostic.hasOrgInToken ? "Yes" : "No"}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sample Sync & Deal Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={runSampleSync}>Run Sample Sync (limit 1)</Button>
                <Button variant="outline" size="sm" onClick={checkDealStats}>Check Deal Stats</Button>
              </div>
              {syncResult && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-md border bg-muted/30">
                    <div className="text-sm font-medium">Processed</div>
                    <div className="text-xs text-muted-foreground">{syncResult.processed}</div>
                  </div>
                  <div className="p-3 rounded-md border bg-muted/30">
                    <div className="text-sm font-medium">Created</div>
                    <div className="text-xs text-muted-foreground">{syncResult.created}</div>
                  </div>
                  <div className="p-3 rounded-md border bg-muted/30">
                    <div className="text-sm font-medium">Updated</div>
                    <div className="text-xs text-muted-foreground">{syncResult.updated}</div>
                  </div>
                  <div className="p-3 rounded-md border bg-muted/30">
                    <div className="text-sm font-medium">Replaced Source</div>
                    <div className="text-xs text-muted-foreground">{syncResult.replacedSource || "-"}</div>
                  </div>
                </div>
              )}
              {stats && (
                <div className="p-3 rounded-md border bg-muted/30">
                  <div className="text-sm font-medium mb-1">Deal Stats</div>
                  <pre className="whitespace-pre-wrap text-xs leading-relaxed overflow-auto max-h-64">
                    {JSON.stringify(stats, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </SidebarProvider>
  );
}