import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Deal {
  id: string;
  legal_company_name: string;
  client_name?: string | null;
  loan_amount_sought: number;
  loan_type?: string | null;
  client_email: string | null;
  client_phone: string | null;
  status: string;
  created_at: string;
  raw_email?: string | null;
  source?: string | null;
  cognito_entry_id?: string | null;
  cognito_form_id?: string | null;
  cognito_entry_number?: number | null;
  gmail_message_id?: string | null;
}

const DEAL_STATUSES = [
  { value: 'New', label: 'New', color: 'bg-blue-100 text-blue-800' },
  { value: 'Contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'Qualified', label: 'Qualified', color: 'bg-green-100 text-green-800' },
  { value: 'Documentation', label: 'Documentation', color: 'bg-purple-100 text-purple-800' },
  { value: 'Underwriting', label: 'Underwriting', color: 'bg-orange-100 text-orange-800' },
  { value: 'Approved', label: 'Approved', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'Funded', label: 'Funded', color: 'bg-gray-100 text-gray-800' },
  { value: 'Declined', label: 'Declined', color: 'bg-red-100 text-red-800' },
];

const LOAN_TYPES = [
  'Business Loan',
  'Equipment Financing',
  'Working Capital',
  'Real Estate',
  'Merchant Cash Advance',
  'SBA Loan',
  'Line of Credit',
];

const DATE_RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '60', label: 'Last 60 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '180', label: 'Last 6 months' },
  { value: '365', label: 'Last year' },
  { value: 'all', label: 'All time' },
];

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

      const amount = Number(deal.loan_amount_sought) || 0;
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
      <div className="w-44 bg-blue-900 flex flex-col">
        <div className="p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-2">
              <span className="text-blue-900 font-bold text-lg">G</span>
            </div>
            <h1 className="text-white font-bold text-lg">GoKapital</h1>
          </div>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          <a href="#" className="bg-blue-800 text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
            <span className="mr-3">📊</span>
            Dashboard
          </a>
          <a href="#" className="text-blue-200 hover:bg-blue-800 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
            <span className="mr-3">💼</span>
            Deals
          </a>
          <a href="#" className="text-blue-200 hover:bg-blue-800 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
            <span className="mr-3">📈</span>
            Analytics
          </a>
          <a href="#" className="text-blue-200 hover:bg-blue-800 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md">
            <span className="mr-3">⚙️</span>
            Settings
          </a>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium text-gray-900">LiveDealTracker</span>
              <select className="ml-4 text-sm border-0 bg-transparent">
                <option>English</option>
              </select>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => syncCognitoForms()}
                disabled={syncing}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
              >
                <span className="mr-2">📧</span>
                {syncing ? 'Syncing...' : 'Sync Emails'}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
              >
                <span className="mr-2">🔄</span>
                Refresh
              </button>
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-gray-600 hover:text-gray-800"
              >
                <span className="text-lg">👤</span>
              </button>
            </div>
          </div>
        </div>

        {/* Page Title */}
        <div className="bg-white px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">GK Live Deal Tracker</h1>
            {lastSync && <div className="text-sm text-gray-500">Last sync: {lastSync}</div>}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-sm font-medium text-gray-900 flex items-center">
                <span className="mr-2">🔽</span>
                Filters
              </h2>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-6 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    {DATE_RANGES.map(range => (
                      <option key={range.value} value={range.value}>{range.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loan Type</label>
                  <select
                    value={loanType}
                    onChange={(e) => setLoanType(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="all">All types</option>
                    {LOAN_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Amount</label>
                  <input
                    type="number"
                    placeholder="Min Amount"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Amount</label>
                  <input
                    type="number"
                    placeholder="Max Amount"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="all">All statuses</option>
                    {DEAL_STATUSES.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                  <input
                    type="text"
                    placeholder="Search deals..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {filteredDeals.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredDeals.length)} of {filteredDeals.length} results ({itemsPerPage} per page)
                </div>
                <div className="flex items-center space-x-4">
                  <button onClick={resetFilters} className="text-sm text-blue-600 hover:text-blue-800">
                    Reset Filters
                  </button>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="disabled:opacity-50"
                    >
                      Prev page
                    </button>
                    <span>|</span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="disabled:opacity-50"
                    >
                      Next page
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Submitted</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Legal Company Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedDeals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        <div className="text-center">
                          <span className="text-4xl mb-4 block">📋</span>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No deals found</h3>
                          <p className="text-gray-500 mb-4">
                            {deals.length === 0
                              ? 'Click "Sync Emails" to import deals from CognitoForms.'
                              : 'Try adjusting your filters to see more results.'}
                          </p>
                          {deals.length === 0 && (
                            <button
                              onClick={() => syncCognitoForms()}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                            >
                              Sync CognitoForms Now
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedDeals.map((deal) => {
                      const statusCfg = DEAL_STATUSES.find(s => s.value === deal.status) || DEAL_STATUSES[0];
                      return (
                        <tr key={deal.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(deal.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {deal.loan_type || 'Business Loan'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {deal.legal_company_name}
                            </div>
                            {deal.cognito_entry_number && (
                              <div className="text-xs text-gray-500">Entry #{deal.cognito_entry_number}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {deal.client_name || (deal.client_email ? deal.client_email.split('@')[0] : 'N/A')}
                            </div>
                            {deal.client_email && (
                              <div className="text-xs text-gray-500">{deal.client_email}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(Number(deal.loan_amount_sought) || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={deal.status}
                              onChange={(e) => updateStatus(deal.id, e.target.value)}
                              className="text-sm border border-gray-300 rounded-md px-2 py-1"
                            >
                              {DEAL_STATUSES.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getSourceBadge(deal)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-center">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
                  >
                    &lt; Previous
                  </button>
                  <span className="px-3 py-1 bg-blue-600 text-white text-sm rounded">
                    {currentPage}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
                  >
                    Next &gt;
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>      
    </div>
  );
}