import { useState, useEffect } from 'react'
import { useDeals } from '@/hooks/use-deals'
import { DealFilters } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Filter, RefreshCw, Cloud } from 'lucide-react'
import { format, subDays, subMonths } from 'date-fns'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language/language-provider'
import { emailSyncService } from '@/components/email-sync/email-sync-service'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination'

export function DealsDashboard() {
  const [filters, setFilters] = useState<DealFilters>({})
  const [page, setPage] = useState<number>(1)
  const { data, isLoading, error, refetch } = useDeals(filters, page)
  const deals = data?.deals || []
  const total = data?.total || 0
  const pageSize = data?.pageSize || 25
  const maxPages = Math.max(1, Math.ceil(total / pageSize))

  const { t } = useLanguage()
  const navigate = useNavigate()

  useEffect(() => {
    // Reset to first page when filters change
    setPage(1)
  }, [filters.loanType, filters.minAmount, filters.maxAmount, filters.status, filters.dateRange?.start, filters.dateRange?.end])

  const handleFilterChange = (key: keyof DealFilters, value: any) => {
    const newFilters = { ...filters, [key]: value }
    if (value === '' || value === undefined) {
      delete newFilters[key]
    }
    setFilters(newFilters)
  }

  const resetFilters = () => {
    setFilters({})
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

  // Date range presets
  type PresetKey =
    | '1w' | '2w'
    | '1m' | '2m' | '3m' | '6m' | '12m' | '18m' | '24m'

  const applyPreset = (preset: PresetKey | 'none') => {
    const today = new Date()
    if (preset === 'none') {
      handleFilterChange('dateRange', undefined)
      return
    }
    let start: Date = today
    switch (preset) {
      case '1w':
        start = subDays(today, 7)
        break
      case '2w':
        start = subDays(today, 14)
        break
      case '1m':
        start = subMonths(today, 1)
        break
      case '2m':
        start = subMonths(today, 2)
        break
      case '3m':
        start = subMonths(today, 3)
        break
      case '6m':
        start = subMonths(today, 6)
        break
      case '12m':
        start = subMonths(today, 12)
        break
      case '18m':
        start = subMonths(today, 18)
        break
      case '24m':
        start = subMonths(today, 24)
        break
    }
    handleFilterChange('dateRange', {
      start: format(start, 'yyyy-MM-dd'),
      end: format(today, 'yyyy-MM-dd')
    })
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
            {/* Date Range Presets */}
            <div className="md:col-span-2 lg:col-span-2">
              <label className="text-sm font-medium mb-2 block">{t('date_range')}</label>
              <Select
                value={
                  filters.dateRange
                    ? 'custom'
                    : 'none'
                }
                onValueChange={(value) => {
                  if (value === 'none') {
                    applyPreset('none')
                  } else if (value === '1w' || value === '2w' || value === '1m' || value === '2m' || value === '3m' || value === '6m' || value === '12m' || value === '18m' || value === '24m') {
                    applyPreset(value as PresetKey)
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All time</SelectItem>
                  <SelectItem value="1w">1 week ago</SelectItem>
                  <SelectItem value="2w">2 weeks ago</SelectItem>
                  <SelectItem value="1m">1 month ago</SelectItem>
                  <SelectItem value="2m">2 months ago</SelectItem>
                  <SelectItem value="3m">3 months ago</SelectItem>
                  <SelectItem value="6m">6 months ago</SelectItem>
                  <SelectItem value="12m">12 months ago</SelectItem>
                  <SelectItem value="18m">18 months ago</SelectItem>
                  <SelectItem value="24m">24 months ago</SelectItem>
                </SelectContent>
              </Select>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 gap-2">
            <div className="text-sm text-muted-foreground">
              Showing {Math.min(pageSize, deals.length)} of {total} results (25 per page)
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={resetFilters} variant="outline" size="sm">
                {t('reset_filters')}
              </Button>
            </div>
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
                ) : deals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      {t('no_deals_found')}
                    </TableCell>
                  </TableRow>
                ) : (
                  deals.map((deal, idx) => (
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

      {/* Pagination */}
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)) }}
              className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
            />
          </PaginationItem>
          {Array.from({ length: Math.min(5, maxPages) }, (_, i) => {
            // Show a sliding window of up to 5 pages around current
            const start = Math.max(1, Math.min(page - 2, maxPages - 4))
            const pageNum = start + i
            return (
              <PaginationItem key={pageNum}>
                <PaginationLink
                  href="#"
                  isActive={pageNum === page}
                  onClick={(e) => { e.preventDefault(); setPage(pageNum) }}
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            )
          })}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(maxPages, p + 1)) }}
              className={page >= maxPages ? 'pointer-events-none opacity-50' : ''}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}