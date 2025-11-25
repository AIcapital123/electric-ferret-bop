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
import { CalendarIcon, Filter, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

export function DealsDashboard() {
  const [filters, setFilters] = useState<DealFilters>({})
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({})
  const { data: deals, isLoading, error, refetch } = useDeals(filters)

  const navigate = useNavigate()

  const handleFilterChange = (key: keyof DealFilters, value: any) => {
    const newFilters = { ...filters, [key]: value }
    if (value === '' || value === undefined) {
      delete newFilters[key]
    }
    setFilters(newFilters)
  }

  const applyDateFilter = () => {
    if (dateRange.start && dateRange.end) {
      handleFilterChange('dateRange', {
        start: format(dateRange.start, 'yyyy-MM-dd'),
        end: format(dateRange.end, 'yyyy-MM-dd')
      })
    }
  }

  const resetFilters = () => {
    setFilters({})
    setDateRange({})
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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">LiveDealUpdate CRM</h1>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.start ? format(dateRange.start, "PP") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.start}
                      onSelect={(date) => setDateRange({ ...dateRange, start: date })}
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.end ? format(dateRange.end, "PP") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.end}
                      onSelect={(date) => setDateRange({ ...dateRange, end: date })}
                    />
                  </PopoverContent>
                </Popover>
                <Button onClick={applyDateFilter} size="sm">Apply</Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Loan Type</label>
              <Select
                value={filters.loanType || ''}
                onValueChange={(value) => handleFilterChange('loanType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="Personal Loan">Personal Loan</SelectItem>
                  <SelectItem value="Business Loan">Business Loan</SelectItem>
                  <SelectItem value="Equipment Leasing">Equipment Leasing</SelectItem>
                  <SelectItem value="Hard Money">Hard Money</SelectItem>
                  <SelectItem value="Commercial Real Estate">Commercial Real Estate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Min Amount</label>
              <Input
                type="number"
                placeholder="Min amount"
                value={filters.minAmount || ''}
                onChange={(e) => handleFilterChange('minAmount', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Max Amount</label>
              <Input
                type="number"
                placeholder="Max amount"
                value={filters.maxAmount || ''}
                onChange={(e) => handleFilterChange('maxAmount', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => handleFilterChange('status', value === 'all' ? undefined : value)}
              >
                <SelectTrigger>
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
          <div className="flex justify-end mt-4">
            <Button onClick={resetFilters} variant="outline" size="sm">
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deals Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Date Submitted</TableHead>
                  <TableHead>Loan Type</TableHead>
                  <TableHead>Legal Company Name</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead className="text-right">Loan Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading deals...
                    </TableCell>
                  </TableRow>
                ) : deals?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No deals found
                    </TableCell>
                  </TableRow>
                ) : (
                  deals?.map((deal) => (
                    <TableRow
                      key={deal.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/deals/${deal.id}`)}
                    >
                      <TableCell>{format(new Date(deal.date_submitted), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{deal.loan_type}</TableCell>
                      <TableCell>{deal.legal_company_name}</TableCell>
                      <TableCell>{deal.client_name}</TableCell>
                      <TableCell className="text-right">
                        ${deal.loan_amount_sought.toLocaleString()}
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