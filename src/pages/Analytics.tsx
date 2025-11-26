import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { useDeals } from '@/hooks/use-deals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import * as Recharts from 'recharts';
import { useLanguage } from '@/components/language/language-provider';

export default function AnalyticsPage() {
  const { data: dealsData } = useDeals();
  const deals = dealsData?.deals ?? [];
  const { t } = useLanguage();

  const chartData = deals.map(d => ({
    date: d.date_submitted,
    amount: Number(d.loan_amount_sought || 0),
    status: d.status,
  }));

  const config = {
    amount: { label: 'Loan Amount', color: 'hsl(var(--primary))' },
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1">
        <AppHeader />
        <div className="container mx-auto p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('loan_amount_over_time')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={config}>
                <Recharts.LineChart data={chartData}>
                  <Recharts.XAxis dataKey="date" />
                  <Recharts.YAxis />
                  <Recharts.CartesianGrid strokeDasharray="3 3" />
                  <Recharts.Line type="monotone" dataKey="amount" stroke="var(--color-amount)" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </Recharts.LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </main>
    </SidebarProvider>
  );
}