import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Sidebar from './dashboard/Sidebar';
import Header from './dashboard/Header';
import PageTitle from './dashboard/PageTitle';
import Filters from './dashboard/Filters';
import DealTable from './dashboard/DealTable';
import Pagination from './dashboard/Pagination';
import { DEAL_STATUSES } from './dashboard/constants';
import type { Deal } from './dashboard/types';

export default function Dashboard() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  // Filters
  const [dateRange, setDateRange] = useState('30');
  const [loanType, setLoanType] = useState('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  useEffect(() => {
    checkAuth();
    fetchDeals();
    const savedSync = localStorage.getItem('lastCognitoSync');
    if (savedSync) setLastSync(savedSync);
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = '/login';
    }
  };

  const fetchDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDeals((data || []) as Deal[]);
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

      const days = customDays || (dateRange !== 'all' ? parseInt(dateRange) : 30);

      const { data, error } = await supabase.functions.invoke('cognito-sync', {
        headers: { Authorization: `Bearer ${session.access_token}`, 'x-days': String(days) },
        method: 'GET',
      });

      if (error) throw error;

      const now = new Date().toLocaleString();
      setLastSync(now);
      localStorage.setItem('lastCognitoSync', now);

      const message = `CognitoForms sync completed!\n\n` +
        `✅ ${data.processed} new deals processed\n` +
        `⏭️ ${data.skipped} deals skipped\n` +
        `❌ ${data.errors || 0} errors\n` +
        `📋 ${data.forms_checked} forms checked\n` +
        `📅 Date range: Last ${data.date_range_days} days`;
      alert(message);
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
      const { error } = await supabase
        .from('deals')
        .update({ status: newStatus })
        .eq('id', dealId);
      if (error) throw error;
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, status: newStatus } : d));
    } catch (e) {
      console.error('Error updating status:', e);
      alert('Failed to update status');
    }
  };

  const resetFilters = () => {
    setDateRange('30');
    setLoanType('all');
    setMinAmount('');
    setMaxAmount('');
    setStatusFilter('all');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      if (dateRange !== 'all') {
        const dealDate = new Date(deal.created_at);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - parseInt(dateRange));
        if (dealDate < cutoff) return false;
      }
      if (statusFilter !== 'all' && deal.status !== statusFilter) return false;

      if (loanType !== 'all') {
        const type = (deal.loan_type || '').toString();
        if (type !== loanType) return false;
      }

      const amount = Number(deal.loan_amount ?? deal.loan_amount_sought) || 0;
      if (minAmount && amount < parseInt(minAmount)) return false;
      if (maxAmount && amount > parseInt(maxAmount)) return false;

      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const text = [
          deal.legal_company_name,
          deal.client_name || '',
          deal.client_email || '',
          deal.client_phone || '',
          deal.loan_type || '',
        ].join(' ').toLowerCase();
        if (!text.includes(s)) return false;
      }
      return true;
    });
  }, [deals, dateRange, statusFilter, loanType, minAmount, maxAmount, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredDeals.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDeals = filteredDeals.slice(startIndex, startIndex + itemsPerPage);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

  const getSourceBadge = (deal: Deal) => {
    if (deal.cognito_entry_id) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
          CognitoForms
        </span>
      );
    }
    if (deal.gmail_message_id) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <span className="w-2 h-2 bg-blue-400 rounded-full mr-1"></span>
          Gmail (Legacy)
        </span>
      );
    }
    if (deal.source === 'test_data') {
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

  if (loading) {
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Header
          syncing={syncing}
          onSync={() => syncCognitoForms()}
          onRefresh={() => window.location.reload()}
          onSignOut={() => supabase.auth.signOut()}
        />

        <PageTitle lastSync={lastSync} />

        <div className="flex-1 p-6">
          <Filters
            dateRange={dateRange}
            setDateRange={setDateRange}
            loanType={loanType}
            setLoanType={setLoanType}
            minAmount={minAmount}
            setMinAmount={setMinAmount}
            maxAmount={maxAmount}
            setMaxAmount={setMaxAmount}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            itemsInfo={{ startIndex, itemsPerPage, total: filteredDeals.length }}
            onPrevPage={() => setCurrentPage(Math.max(1, currentPage - 1))}
            onNextPage={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            canPrev={currentPage > 1}
            canNext={currentPage < totalPages}
            onReset={resetFilters}
          />

          <DealTable
            deals={paginatedDeals}
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