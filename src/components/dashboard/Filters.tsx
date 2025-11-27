import React from 'react';
import { DATE_RANGES, LOAN_TYPES } from './constants';

type FiltersProps = {
  dateRange: string;
  setDateRange: (v: string) => void;
  loanType: string;
  setLoanType: (v: string) => void;
  minAmount: string;
  setMinAmount: (v: string) => void;
  maxAmount: string;
  setMaxAmount: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  itemsInfo: { startIndex: number; itemsPerPage: number; total: number };
  onPrevPage: () => void;
  onNextPage: () => void;
  canPrev: boolean;
  canNext: boolean;
  onReset: () => void;
};

export default function Filters({
  dateRange,
  setDateRange,
  loanType,
  setLoanType,
  minAmount,
  setMinAmount,
  maxAmount,
  setMaxAmount,
  statusFilter,
  setStatusFilter,
  searchTerm,
  setSearchTerm,
  itemsInfo,
  onPrevPage,
  onNextPage,
  canPrev,
  canNext,
  onReset,
}: FiltersProps) {
  const { startIndex, itemsPerPage, total } = itemsInfo;

  return (
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
              {['New','Contacted','Qualified','Documentation','Underwriting','Approved','Funded','Declined'].map(s => (
                <option key={s} value={s}>{s}</option>
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
            Showing {total === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + itemsPerPage, total)} of {total} results ({itemsPerPage} per page)
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={onReset} className="text-sm text-blue-600 hover:text-blue-800">Reset Filters</button>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <button onClick={onPrevPage} disabled={!canPrev} className="disabled:opacity-50">Prev page</button>
              <span>|</span>
              <button onClick={onNextPage} disabled={!canNext} className="disabled:opacity-50">Next page</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}