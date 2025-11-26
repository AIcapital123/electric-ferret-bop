import { useState } from 'react'
import { useDeals } from '@/hooks/use-deals'
import { DealFilters } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Filter, RefreshCw, Cloud } from 'lucide-react'
import { format } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language/language-provider'
import { emailSyncService } from '@/components/email-sync/email-sync-service'

export function DealsDashboard() {
  const [filters, setFilters] = useState<DealFilters>({})
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const { data: deals, isLoading, error, refetch } = useDeals(filters)
  const { t } = useLanguage()
  const navigate = useNavigate()

  const handleFilterChange = (key: keyof DealFilters, value: any) => {
    const newFilters = { ...filters, [key]: value }
    if (value === '' || value === undefined) {
      delete newFilters[key]
    }
    setFilters(newFilters)
  }

  const applyDateFilter = () => {
    if (dateRange?.from && dateRange?.to) {
      handleFilterChange('dateRange', {
        start: format(dateRange.from, 'yyyy-MM-dd'),
        end: format(dateRange.to, 'yyyy-MM-dd')
      })
    }
  }

  const resetFilters = () => {
    setFilters({})
    setDateRange(undefined)
  }

  const syncEmailsNow = async () => {
    await emailSyncService.syncEmails()
    toast.success('Email sync started')
    refetch()
  }

  if (error) {
    toast.error('Failed to load deals')
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      new: 'default' as const,
      in_progress: 'secondary' as const,
      funded: 'outline' as const,
      lost: 'destructive' as const
    }
    return <Badge variant={variants[status as keyof typeof variants] || 'default'}>
      {status.replace('_', ' ').toUpperCase()}
    </Badge>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('app_title')}</h1>
        <div className="flex items-center gap-2">
          <Button onClick={syncEmailsNow} size="sm">
            <Cloud className="h-4 w-4 mr-2" />
            Sync Emails
          </Button>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('refresh')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('filters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Date Range */}
            <div className="md:col-span-2 lg:col-span-2">
              <label className="text-sm font-medium mb-2 block">{t('date_range')}</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from && dateRange?.to
                      ? `${format(dateRange.from, "PP")} - ${format(dateRange.to, "PP")}`
                      : t('select_date_range')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={(range) => setDateRange(range)}
                    numberOfMonths={2}
                    className="rounded-md"
                  />
                  <div className="flex justify-end gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={() => setDateRange(undefined)}>
                      {t('clear')}
                    </Button>
                    <Button size="sm" onClick={applyDateFilter}>
                      {t('apply')}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Loan Type */}
            <div>
              <label className="text-sm font-medium mb-2 block">{t('loan_type')}</label>
              <Select
                value={filters.loanType || 'all'}
                onValueChange={(value) => handleFilterChange('loanType', value === 'all' ? undefined : value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="Personal Loan">Personal Loan</SelectItem>
                  <SelectItem value="Business Loan">Business Loan</SelectItem>
                  <SelectItem value="Equipment Leasing">Equipment Leasing</SelectItem>
                  <SelectItem value="Hard Money">Hard Money</SelectItem>
                  <SelectItem value="Commercial Real Estate">Commercial Real Estate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Min Amount */}
            <div>
              <label className="text-sm font-medium mb-2 block">{t('min_amount')}</label>
              <Input
                type="number"
                placeholder={t('min_amount')}
                value={filters.minAmount || ''}
                onChange={(e) => handleFilterChange('minAmount', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>

            {/* Max Amount */}
            <div>
              <label className="text-sm font-medium mb-2 block">{t('max_amount')}</label>
              <Input
                type="number"
                placeholder={t('max_amount')}
                value={filters.maxAmount || ''}
                onChange={(e) => handleFilterChange('maxAmount', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>

            {/* Status */}
            <div>
              <label className="text-sm font-medium mb-2 block">{t('status')}</label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => handleFilterChange('status', value === 'all' ? undefined : value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="funded">Funded</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end mt-4 gap-2">
            <Button onClick={resetFilters} variant="outline" size="sm">
              {t('reset_filters')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deals Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[160px]">{t('table_date_submitted')}</TableHead>
                  <TableHead>{t('table_loan_type')}</TableHead>
                  <TableHead>{t('table_company_name')}</TableHead>
                  <TableHead>{t('table_client_name')}</TableHead>
                  <TableHead className="text-right">{t('table_loan_amount')}</TableHead>
                  <TableHead>{t('table_status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      {t('loading_deals')}
                    </TableCell>
                  </TableRow>
                ) : (deals?.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      {t('no_deals_found')}
                    </TableCell>
                  </TableRow>
                ) : (
                  deals?.map((deal, idx) => (
                    <TableRow
                      key={deal.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50 transition-colors",
                        idx % 2 === 1 ? "bg-muted/30" : ""
                      )}
                      onClick={() => navigate(`/deals/${deal.id}`)}
                    >
                      <TableCell>{format(new Date(deal.date_submitted), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{deal.loan_type}</TableCell>
                      <TableCell>{deal.legal_company_name}</TableCell>
                      <TableCell>{deal.client_name}</TableCell>
                      <TableCell className="text-right">
                        ${Number(deal.loan_amount_sought || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(deal.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}