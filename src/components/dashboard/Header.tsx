import React from 'react';

type HeaderProps = {
  syncing: boolean;
  onSync: () => void;
  onRefresh: () => void;
  onSignOut: () => void;
};

export default function Header({ syncing, onSync, onRefresh, onSignOut }: HeaderProps) {
  return (
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
            onClick={onSync}
            disabled={syncing}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
          >
            <span className="mr-2">📧</span>
            {syncing ? 'Syncing...' : 'Sync Emails'}
          </button>
          <button
            onClick={onRefresh}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
          >
            <span className="mr-2">🔄</span>
            Refresh
          </button>
          <button
            onClick={onSignOut}
            className="text-gray-600 hover:text-gray-800"
          >
            <span className="text-lg">👤</span>
          </button>
        </div>
      </div>
    </div>
  );
}