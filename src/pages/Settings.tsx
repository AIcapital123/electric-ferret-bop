import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useErrorLog, clearErrors } from '@/lib/error-log';
import { emailSyncService } from '@/components/email-sync/email-sync-service';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/language/language-provider';

export default function SettingsPage() {
  const errors = useErrorLog();
  const [testMode, setTestMode] = useState(true);
  const [query, setQuery] = useState<string>('');
  const { t } = useLanguage();

  useEffect(() => {
    const cfg = emailSyncService.getConfig();
    setTestMode(!!cfg.test);
    setQuery(cfg.query || '');
  }, []);

  const saveConfig = () => {
    emailSyncService.setConfig({ test: testMode, query });
  };

  const runTest = async () => {
    await emailSyncService.syncEmails();
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1">
        <AppHeader />
        <div className="container mx-auto p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('parsing_sync_configuration')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{t('test_mode')}</div>
                  <div className="text-xs text-muted-foreground">{t('test_mode_desc')}</div>
                </div>
                <Switch checked={testMode} onCheckedChange={setTestMode} />
              </div>
              <div>
                <div className="text-sm font-medium mb-2">{t('gmail_search_query')}</div>
                <Input
                  placeholder='from:notifications@cognitoforms.com subject:(application) newer_than:30d'
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveConfig}>{t('save')}</Button>
                <Button variant="outline" onClick={runTest}>{t('run_test_sync')}</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('detailed_error_log')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end mb-3">
                <Button variant="outline" size="sm" onClick={clearErrors}>{t('clear_log')}</Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>{t('time')}</TableHead>
                      <TableHead>{t('source')}</TableHead>
                      <TableHead>{t('code')}</TableHead>
                      <TableHead>{t('message')}</TableHead>
                      <TableHead>{t('details')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">{t('no_errors_logged_yet')}</TableCell>
                      </TableRow>
                    ) : (
                      errors.map(err => (
                        <TableRow key={err.id}>
                          <TableCell>{new Date(err.timestamp).toLocaleString()}</TableCell>
                          <TableCell>{err.source}</TableCell>
                          <TableCell>{err.code || '-'}</TableCell>
                          <TableCell className="max-w-md truncate">{err.message}</TableCell>
                          <TableCell className="max-w-md truncate">
                            {err.details ? JSON.stringify(err.details) : '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </SidebarProvider>
  );
}