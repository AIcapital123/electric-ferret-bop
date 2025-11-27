import React from 'react';

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
};

export default function Pagination({ currentPage, totalPages, onPrev, onNext }: PaginationProps) {
  return (
    <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <button
            onClick={onPrev}
            disabled={currentPage === 1}
            className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            &lt; Previous
          </button>
          <span className="px-3 py-1 bg-blue-600 text-white text-sm rounded">
            {currentPage}
          </span>
          <button
            onClick={onNext}
            disabled={currentPage === totalPages}
            className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Next &gt;
          </button>
        </div>
      </div>
    </div>
  );
}