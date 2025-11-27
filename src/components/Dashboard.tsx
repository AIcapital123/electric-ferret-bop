import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import EmailParsingInstructions from './EmailParsingInstructions';

interface Deal {
  id: string;
  legal_company_name: string;
  loan_amount_sought: number;
  client_email: string | null;
  client_phone: string | null;
  status: string;
  created_at: string;
  raw_email?: string | null;
  source?: string | null;
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

export default function Dashboard() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    checkAuth();
    fetchDeals();
    const channel = supabase
      .channel('deals-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, () => fetchDeals())
      .subscribe();

    const saved = localStorage.getItem('lastGmailSync');
    if (saved) setLastSync(saved);

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = '/login';
      return;
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
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncGmail = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('sync-gmail', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      const now = new Date().toLocaleString();
      setLastSync(now);
      localStorage.setItem('lastGmailSync', now);

      alert(`Sync completed: ${data.processed} new deals, ${data.skipped} skipped`);
      fetchDeals();
    } catch (error: any) {
      console.error('Sync error:', error);
      alert('Sync failed: ' + (error?.message || 'Unknown error'));
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

      setDeals(deals.map(d => d.id === dealId ? { ...d, status: newStatus } : d));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

  const getStatusConfig = (status: string) => DEAL_STATUSES.find(s => s.value === status) || DEAL_STATUSES[0];

  const filteredDeals = deals.filter(d => filter === 'all' || d.status === filter);

  const stats = DEAL_STATUSES.map(status => ({
    ...status,
    count: deals.filter(d => d.status === status.value).length,
    total: deals
      .filter(d => d.status === status.value)
      .reduce((sum, d) => sum + (Number(d.loan_amount_sought) || 0), 0),
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Single Header - No Duplicate Sync Buttons */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">GoKapital CRM</h1>
              <p className="mt-1 text-sm text-gray-500">
                {deals.length} deals • Last sync: {lastSync || 'Never'}
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={syncGmail}
                disabled={syncing}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-md font-medium flex items-center"
              >
                {syncing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Syncing...
                  </>
                ) : (
                  'Sync Gmail'
                )}
              </button>
              <button
                onClick={() => supabase.auth.signOut()}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Email Parsing Instructions */}
        <EmailParsingInstructions />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.slice(0, 4).map((stat) => (
            <div key={stat.value} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full ${stat.color} flex items-center justify-center`}>
                      <span className="text-sm font-medium">{stat.count}</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate capitalize">
                        {stat.label}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {formatCurrency(stat.total)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="bg-white shadow rounded-lg mb-6 p-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="all">All Deals ({deals.length})</option>
            {DEAL_STATUSES.map(status => (
              <option key={status.value} value={status.value}>
                {status.label} ({deals.filter(d => d.status === status.value).length})
              </option>
            ))}
          </select>
        </div>

        {/* Deals List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredDeals.length === 0 ? (
              <li className="px-6 py-12 text-center">
                <p className="text-gray-500 text-lg">
                  {deals.length === 0 ? 'No deals found. Click "Sync Gmail" to import deals.' : 'No deals match your filter.'}
                </p>
              </li>
            ) : (
              filteredDeals.map((deal) => {
                const statusConfig = getStatusConfig(deal.status);
                return (
                  <li key={deal.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center min-w-0 flex-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                        <div className="ml-4 min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {deal.legal_company_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {deal.client_email && <span className="mr-4">{deal.client_email}</span>}
                            {deal.client_phone && <span>{deal.client_phone}</span>}
                          </div>
                          {deal.source && (
                            <div className="text-xs text-gray-400">
                              Source: {deal.source}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(Number(deal.loan_amount_sought) || 0)}
                        </div>
                        <select
                          value={deal.status}
                          onChange={(e) => updateStatus(deal.id, e.target.value)}
                          className="text-sm border border-gray-300 rounded-md px-2 py-1"
                        >
                          {DEAL_STATUSES.map(status => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                        <div className="text-sm text-gray-500">
                          {new Date(deal.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}