import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { useDeals } from '@/hooks/use-deals';
import MetricCard from '@/components/kpi/MetricCard';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/components/language/language-provider';

export default function DealsPage() {
  const { data: deals = [] } = useDeals();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const totalDeals = deals.length;
  const avgAmount = deals.length > 0 ? Math.round(deals.reduce((s, d) => s + (d.loan_amount_sought || 0), 0) / deals.length) : 0;
  const newDeals = deals.filter(d => d.status === 'new').length;
  const fundedDeals = deals.filter(d => d.status === 'funded').length;

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1">
        <AppHeader />
        <div className="container mx-auto p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard title={t('metrics_total_deals')} value={totalDeals} />
            <MetricCard title={t('metrics_new_deals')} value={newDeals} />
            <MetricCard title={t('metrics_funded_deals')} value={fundedDeals} />
            <MetricCard title={t('metrics_avg_amount')} value={`$${avgAmount.toLocaleString()}`} />
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>{t('table_date_submitted')}</TableHead>
                      <TableHead>{t('table_loan_type')}</TableHead>
                      <TableHead>{t('table_company_name')}</TableHead>
                      <TableHead>{t('table_client_name')}</TableHead>
                      <TableHead className="text-right">{t('table_loan_amount')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deals.map((deal, idx) => (
                      <TableRow
                        key={deal.id}
                        className={`cursor-pointer hover:bg-muted/50 transition-colors ${idx % 2 === 1 ? 'bg-muted/30' : ''}`}
                        onClick={() => navigate(`/deals/${deal.id}`)}
                      >
                        <TableCell>{format(new Date(deal.date_submitted), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{deal.loan_type}</TableCell>
                        <TableCell>{deal.legal_company_name}</TableCell>
                        <TableCell>{deal.client_name}</TableCell>
                        <TableCell className="text-right">${deal.loan_amount_sought.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
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