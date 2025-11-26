import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { useDeals } from '@/hooks/use-deals';
import MetricCard from '@/components/kpi/MetricCard';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function DealsPage() {
  const { data: deals = [] } = useDeals();
  const navigate = useNavigate();

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
            <MetricCard title="Total Deals" value={totalDeals} />
            <MetricCard title="New Deals" value={newDeals} />
            <MetricCard title="Funded Deals" value={fundedDeals} />
            <MetricCard title="Avg Amount" value={`$${avgAmount.toLocaleString()}`} />
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Date Submitted</TableHead>
                      <TableHead>Loan Type</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deals.map(deal => (
                      <TableRow key={deal.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/deals/${deal.id}`)}>
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