import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Sidebar from './dashboard/Sidebar';
import Header from './dashboard/Header';
import PageTitle from './dashboard/PageTitle';
import Filters from './dashboard/Filters';
import DealTable from './dashboard/DealTable';
import Pagination from './dashboard/Pagination';
import { DEAL_STATUSES, LOAN_TYPES } from './dashboard/constants';
import type { Deal } from './dashboard/types';

type FiltersState = {
  dateRange: string // 'all' or days number string
  loanType: string
  minAmount: string
  maxAmount: string
  statusFilter: string
  searchTerm: string
}

type ListDealsResponse = {
  deals: Deal[]
  page: number
  pageSize: number
  total: number
}

export default function Dashboard() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const [filters, setFilters] = useState<FiltersState>({
    dateRange: '30',
    loanType: 'all',
    minAmount: '',
    maxAmount: '',
    statusFilter: 'all',
    searchTerm: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const [totalResults, setTotalResults] = useState(0);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    fetchDeals();
    const savedSync = localStorage.getItem('lastCognitoSync');
    if (savedSync) setLastSync(savedSync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filters.dateRange, filters.loanType, filters.minAmount, filters.maxAmount, filters.statusFilter, filters.searchTerm]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = '/login';
    }
  };

  const buildFiltersPayload = () => {
    const f: any = {};
    if (filters.loanType !== 'all') f.loanType = filters.loanType;
    if (filters.statusFilter !== 'all') f.status = filters.statusFilter;
    if (filters.minAmount) f.minAmount = Number(filters.minAmount);
    if (filters.maxAmount) f.maxAmount = Number(filters.maxAmount);
    if (filters.dateRange !== 'all') {
      const today = new Date();
      const start = new Date();
      start.setDate(today.getDate() - parseInt(filters.dateRange));
      const toYmd = (d: Date) => d.toISOString().slice(0, 10);
      f.dateRange = { start: toYmd(start), end: toYmd(today) };
    }
    if (filters.searchTerm.trim()) f.search = filters.searchTerm.trim();
    return f;
  };

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('list-deals', {
        body: { filters: buildFiltersPayload(), page: currentPage, pageSize: itemsPerPage },
      });
      if (error) throw error;
      const res = data as ListDealsResponse;
      setDeals(res.deals || []);
      setTotalResults(res.total || 0);
    } catch (e) {
      console.error('Error fetching deals:', e);
    } finally {
      setLoading(false);
    }
  };

  const syncCognitoForms = async (customDays?: number) => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const days = customDays || (filters.dateRange !== 'all' ? parseInt(filters.dateRange) : 30);
      const { data, error } = await supabase.functions.invoke('cognito-sync', {
        headers: { Authorization: `Bearer ${session.access_token}`, 'x-days': String(days) },
        method: 'GET',
      });

      if (error) throw error;

      const now = new Date().toLocaleString();
      setLastSync(now);
      localStorage.setItem('lastCognitoSync', now);

      alert(`CognitoForms sync completed! Processed: ${data.processed}, Skipped: ${data.skipped}, Errors: ${data.errors || 0}`);
      fetchDeals();
    } catch (e) {
      console.error('CognitoForms sync error:', e);
      alert('CognitoForms sync failed: ' + (e as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  const updateStatus = async (dealId: string, newStatus: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('update-deal-status', {
        body: { id: dealId, status: newStatus },
      });
      if (error) throw error;
      const updated = (data as { deal: Deal }).deal;
      setDeals(prev => prev.map(d => d.id === dealId ? updated : d));
    } catch (e) {
      console.error('Error updating status:', e);
      alert('Failed to update status');
    }
  };

  const resetFilters = () => {
    setFilters({
      dateRange: '30',
      loanType: 'all',
      minAmount: '',
      maxAmount: '',
      statusFilter: 'all',
      searchTerm: '',
    });
    setCurrentPage(1);
  };

  const filteredDeals = useMemo(() => deals, [deals]);
  const totalPages = Math.max(1, Math.ceil(totalResults / itemsPerPage));

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

  const getSourceBadge = (deal: Deal) => {
    const source = (deal.source || '').toLowerCase();
    if (deal.cognito_entry_id || source === 'cognitoforms') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
          CognitoForms
        </span>
      );
    }
    if (source === 'gmail' || source === 'gmail (legacy)' || deal.gmail_message_id) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <span className="w-2 h-2 bg-blue-400 rounded-full mr-1"></span>
          Gmail (Legacy)
        </span>
      );
    }
    if (source === 'test_data') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <span className="w-2 h-2 bg-purple-400 rounded-full mr-1"></span>
          Demo
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <span className="w-2 h-2 bg-gray-400 rounded-full mr-1"></span>
        Manual
      </span>
    );
  };

  if (loading && !deals.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading GoKapital CRM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex font-inter">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header
          syncing={syncing}
          onSync={() => syncCognitoForms()}
          onRefresh={() => fetchDeals()}
          onSignOut={() => supabase.auth.signOut()}
        />

        <PageTitle lastSync={lastSync} />

        <div className="flex-1 p-6">
          <Filters
            dateRange={filters.dateRange}
            setDateRange={(v) => { setFilters(p => ({ ...p, dateRange: v })); setCurrentPage(1); }}
            loanType={filters.loanType}
            setLoanType={(v) => { setFilters(p => ({ ...p, loanType: v })); setCurrentPage(1); }}
            minAmount={filters.minAmount}
            setMinAmount={(v) => { setFilters(p => ({ ...p, minAmount: v })); setCurrentPage(1); }}
            maxAmount={filters.maxAmount}
            setMaxAmount={(v) => { setFilters(p => ({ ...p, maxAmount: v })); setCurrentPage(1); }}
            statusFilter={filters.statusFilter}
            setStatusFilter={(v) => { setFilters(p => ({ ...p, statusFilter: v })); setCurrentPage(1); }}
            searchTerm={filters.searchTerm}
            setSearchTerm={(v) => { setFilters(p => ({ ...p, searchTerm: v })); setCurrentPage(1); }}
            itemsInfo={{ startIndex: (currentPage - 1) * itemsPerPage, itemsPerPage, total: totalResults }}
            onPrevPage={() => setCurrentPage(Math.max(1, currentPage - 1))}
            onNextPage={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            canPrev={currentPage > 1}
            canNext={currentPage < totalPages}
            onReset={resetFilters}
          />

          <DealTable
            deals={filteredDeals}
            onUpdateStatus={updateStatus}
            formatCurrency={formatCurrency}
            getSourceBadge={getSourceBadge}
            onSyncNow={() => syncCognitoForms()}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPrev={() => setCurrentPage(Math.max(1, currentPage - 1))}
            onNext={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          />
        </div>
      </div>
    </div>
  );
}