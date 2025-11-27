import React from 'react';
import { Deal } from './types';
import { DEAL_STATUSES } from './constants';

type DealTableProps = {
  deals: Deal[];
  onUpdateStatus: (dealId: string, newStatus: string) => void;
  formatCurrency: (amount: number) => string;
  getSourceBadge: (deal: Deal) => React.ReactNode;
  onSyncNow: () => void;
};

export default function DealTable({
  deals,
  onUpdateStatus,
  formatCurrency,
  getSourceBadge,
  onSyncNow,
}: DealTableProps) {
  const hasDeals = deals.length > 0;

  return (
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
            {!hasDeals ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  <div className="text-center">
                    <span className="text-4xl mb-4 block">📋</span>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No deals found</h3>
                    <p className="text-gray-500 mb-4">
                      Click "Sync Emails" to import deals from CognitoForms.
                    </p>
                    <button
                      onClick={onSyncNow}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Sync CognitoForms Now
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              deals.map((deal) => {
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
                      {formatCurrency(Number(deal.loan_amount ?? deal.loan_amount_sought ?? 0))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={deal.status}
                        onChange={(e) => onUpdateStatus(deal.id, e.target.value)}
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
    </div>
  );
}