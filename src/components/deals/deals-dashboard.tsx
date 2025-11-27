import { useState, useEffect, useRef } from 'react'
import { useDeals } from '@/hooks/use-deals'
import { Deal, DealFilters } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Filter, RefreshCw } from 'lucide-react'
import { format, subDays, subMonths } from 'date-fns'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language/language-provider'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import StatusTag from '@/components/deals/status-tag'
import { formatInTimeZone } from 'date-fns-tz'

export function DealsDashboard() {
  const [filters, setFilters] = useState<DealFilters>({})
  const [appliedFilters, setAppliedFilters] = useState<DealFilters>({})
  const [page, setPage] = useState<number>(1)
  const [appliedPage, setAppliedPage] = useState<number>(1)
  const [newDealsCount, setNewDealsCount] = useState<number>(0)

  const reminderTimersRef = useRef<Record<string, number>>({})
  const queryClient = useQueryClient()

  useEffect(() => {
    const today = new Date()
    const start = subMonths(today, 1)
    const preset = {
      dateRange: {
        start: format(start, 'yyyy-MM-dd'),
        end: format(today, 'yyyy-MM-dd')
      }
    }
    setFilters((prev) => ({ ...prev, ...preset }))
    setAppliedFilters((prev) => ({ ...prev, ...preset }))
  }, [])

  const { data, isLoading, error } = useDeals(appliedFilters, appliedPage)
  const deals = data?.deals || []
  const total = data?.total || 0
  const pageSize = data?.pageSize || 25
  const maxPages = Math.max(1, Math.ceil(total / pageSize))

  const { t } = useLanguage()
  const navigate = useNavigate()

  useEffect(() => {
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
    setPage(1)
  }

  const applyRefresh = () => {
    clearReminders()
    setAppliedFilters(filters)
    setAppliedPage(page)
  }

  const clearReminders = () => {
    const timers = reminderTimersRef.current
    Object.values(timers).forEach((id) => clearTimeout(id))
    reminderTimersRef.current = {}
  }

  if (error) {
    toast.error('Failed to load deals')
  }

  const getStatusBadge = (status: string) => {
    return <StatusTag status={status} />
  }

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

  useEffect(() => {
    const channel = supabase
      .channel('realtime-deals')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'deals' },
        (payload) => {
          const newDeal = payload.new as Deal
          const inRange =
            !appliedFilters.dateRange ||
            (
              newDeal.created_at >= appliedFilters.dateRange.start! &&
              newDeal.created_at <= appliedFilters.dateRange.end!
            )
          const loanTypeOk = !appliedFilters.loanType || newDeal.loan_type === appliedFilters.loanType
          const statusOk = !appliedFilters.status || newDeal.status === appliedFilters.status
          const minOk = appliedFilters.minAmount === undefined || Number(newDeal.loan_amount || 0) >= appliedFilters.minAmount
          const maxOk = appliedFilters.maxAmount === undefined || Number(newDeal.loan_amount || 0) <= appliedFilters.maxAmount

          if (inRange && loanTypeOk && statusOk && minOk && maxOk) {
            setNewDealsCount((c) => c + 1)
          }
        }
      )
      .subscribe()

    return () => {
      clearReminders()
      supabase.removeChannel(channel)
    }
  }, [appliedFilters, appliedPage])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('app_title')}</h1>
        <div className="flex items-center gap-2">
          {newDealsCount > 0 && (
            <div className="hidden sm:flex items-center gap-2 rounded-md bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1">
              <span className="text-sm">{newDealsCount} new {newDealsCount === 1 ? 'deal' : 'deals'}</span>
              <Button size="sm" variant="outline" onClick={() => { applyRefresh(); setNewDealsCount(0); }}>
                Refresh
              </Button>
            </div>
          )}
          <Button onClick={applyRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('refresh')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('filters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="md:col-span-2 lg:col-span-2">
              <label className="text-sm font-medium mb-2 block">{t('date_range')}</label>
              <Select
                value={filters.dateRange ? 'custom' : '1m'}
                onValueChange={(value) => {
                  if (value === 'none') {
                    applyPreset('none')
                  } else if (value === '1w' || value === '2w' || value === '1m' || value === '2m' || value === '3m' || value === '6m' || value === '12m' || value === '18m' || value === '24m') {
                    applyPreset(value as any)
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1 month ago</SelectItem>
                  <SelectItem value="1w">1 week ago</SelectItem>
                  <SelectItem value="2w">2 weeks ago</SelectItem>
                  <SelectItem value="2m">2 months ago</SelectItem>
                  <SelectItem value="3m">3 months ago</SelectItem>
                  <SelectItem value="6m">6 months ago</SelectItem>
                  <SelectItem value="12m">12 months ago</SelectItem>
                  <SelectItem value="18m">18 months ago</SelectItem>
                  <SelectItem value="24m">24 months ago</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
                  <SelectItem value="Merchant Cash Advance">Merchant Cash Advance</SelectItem>
                  <SelectItem value="Term Loan">Term Loan</SelectItem>
                  <SelectItem value="Line of Credit (LOC)">Line of Credit (LOC)</SelectItem>
                  <SelectItem value="Factoring">Factoring</SelectItem>
                  <SelectItem value="Equipment Financing">Equipment Financing</SelectItem>
                  <SelectItem value="SBA 7(a)">SBA 7(a)</SelectItem>
                  <SelectItem value="SBA 504">SBA 504</SelectItem>
                  <SelectItem value="Commercial Real Estate (CRE)">Commercial Real Estate (CRE)</SelectItem>
                  <SelectItem value="Personal Loan">Personal Loan</SelectItem>
                  <SelectItem value="Business Credit Card">Business Credit Card</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">{t('min_amount')}</label>
              <Input
                type="number"
                placeholder={t('min_amount')}
                value={filters.minAmount || ''}
                onChange={(e) => handleFilterChange('minAmount', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">{t('max_amount')}</label>
              <Input
                type="number"
                placeholder={t('max_amount')}
                value={filters.maxAmount || ''}
                onChange={(e) => handleFilterChange('maxAmount', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>

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
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="missing_docs">Missing Docs</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="funded">Funded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 gap-2">
            <div className="text-sm text-muted-foreground">
              Showing {Math.min(pageSize, deals.length)} of {total} results ({pageSize} per page)
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={resetFilters} variant="outline" size="sm">
                {t('reset_filters')}
              </Button>
              <Button onClick={() => setPage((p) => Math.max(1, p - 1))} variant="outline" size="sm" className={page <= 1 ? 'pointer-events-none opacity-50' : ''}>
                Prev page
              </Button>
              <Button onClick={() => setPage((p) => p + 1)} variant="outline" size="sm" className={page >= maxPages ? 'pointer-events-none opacity-50' : ''}>
                Next page
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
                      <TableCell>{formatInTimeZone(new Date(deal.created_at), 'America/New_York', 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{deal.loan_type}</TableCell>
                      <TableCell>{deal.legal_company_name}</TableCell>
                      <TableCell>{deal.client_name}</TableCell>
                      <TableCell className="text-right">
                        ${Number(deal.loan_amount || 0).toLocaleString()}
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

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => { e.preventDefault(); setAppliedPage((p) => Math.max(1, p - 1)); setPage((p) => Math.max(1, p - 1)); applyRefresh() }}
              className={appliedPage <= 1 ? 'pointer-events-none opacity-50' : ''}
            />
          </PaginationItem>
          {Array.from({ length: Math.min(5, maxPages) }, (_, i) => {
            const start = Math.max(1, Math.min(appliedPage - 2, maxPages - 4))
            const pageNum = start + i
            return (
              <PaginationItem key={pageNum}>
                <PaginationLink
                  href="#"
                  isActive={pageNum === appliedPage}
                  onClick={(e) => { e.preventDefault(); setAppliedPage(pageNum); setPage(pageNum); applyRefresh() }}
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            )
          })}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => { e.preventDefault(); setAppliedPage((p) => Math.min(maxPages, p + 1)); setPage((p) => Math.min(maxPages, p + 1)); applyRefresh() }}
              className={appliedPage >= maxPages ? 'pointer-events-none opacity-50' : ''}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}