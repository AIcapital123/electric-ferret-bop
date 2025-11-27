import React from 'react';

export default function PageTitle({ lastSync }: { lastSync?: string | null }) {
  return (
    <div className="bg-white px-6 py-4 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">GK Live Deal Tracker</h1>
        {lastSync && <div className="text-sm text-gray-500">Last sync: {lastSync}</div>}
      </div>
    </div>
  );
}