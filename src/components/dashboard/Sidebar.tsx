import React from 'react';

export default function Sidebar() {
  return (
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
  );
}