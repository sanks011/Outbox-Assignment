import React from 'react';
import { Search, Filter, RotateCw, Database } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  isSearching?: boolean;
  searchSource?: string;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onRefresh,
  isSearching = false,
  searchSource,
}) => {
  return (
    <header className="h-16 border-b border-gray-100 bg-white px-6 flex items-center justify-between gap-4">
      {/* Search Input Bar (Pill shaped as in Screenshot 2) */}
      <div className="flex-1 max-w-xl relative flex items-center">
        <div className="w-full relative flex items-center bg-[#F4F6F5] hover:bg-[#EFF2F0] focus-within:bg-white focus-within:ring-1 focus-within:ring-emerald-500 rounded-full px-4 py-2 transition-all">
          <Search className="w-4 h-4 text-gray-400 shrink-0 mr-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search emails (Elasticsearch enabled)..."
            className="w-full bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="text-xs text-gray-400 hover:text-gray-600 mr-2"
            >
              Clear
            </button>
          )}

          {/* Action Icons right inside the search pill */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-gray-200 text-gray-400">
            <button
              type="button"
              title="Filter"
              className="p-1 hover:text-gray-700 transition-colors"
            >
              <Filter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onRefresh}
              title="Refresh"
              className="p-1 hover:text-gray-700 transition-colors"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isSearching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {searchSource && searchQuery && (
          <div className="absolute right-0 -bottom-5 flex items-center gap-1 text-[10px] text-gray-400">
            <Database className="w-3 h-3 text-emerald-500" />
            <span>Search via {searchSource === 'elasticsearch' ? 'Elasticsearch' : 'Database'}</span>
          </div>
        )}
      </div>

      {/* Header Right Utilities */}
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/50 rounded-full text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>BullMQ Scheduler Active</span>
        </div>
      </div>
    </header>
  );
};
