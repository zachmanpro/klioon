'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { UserRole } from '@/types/user';

interface FilterState {
  role: UserRole | 'all';
  status: 'active' | 'inactive' | 'all';
  emailVerified: 'verified' | 'unverified' | 'all';
  dateRange: 'all' | 'today' | 'week' | 'month' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
}

interface UserSearchAndFilterProps {
  onSearch: (query: string) => void;
  onFilter: (filters: FilterState) => void;
  currentSearch?: string;
  currentFilters?: Partial<FilterState>;
  showAdvancedFilters?: boolean;
}

export function UserSearchAndFilter({
  onSearch,
  onFilter,
  currentSearch = '',
  currentFilters = {},
  showAdvancedFilters = true
}: UserSearchAndFilterProps) {
  const [searchQuery, setSearchQuery] = useState(currentSearch);
  const [filters, setFilters] = useState<FilterState>({
    role: 'all',
    status: 'all',
    emailVerified: 'all',
    dateRange: 'all',
    ...currentFilters
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Debounced search
  const debouncedSearch = useCallback((query: string) => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    
    const timer = setTimeout(() => {
      onSearch(query);
    }, 300);
    
    setSearchDebounceTimer(timer);
  }, [onSearch, searchDebounceTimer]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearch(value);
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilter(newFilters);
  };

  // Clear all filters
  const clearFilters = () => {
    const defaultFilters: FilterState = {
      role: 'all',
      status: 'all',
      emailVerified: 'all',
      dateRange: 'all'
    };
    setFilters(defaultFilters);
    setSearchQuery('');
    onSearch('');
    onFilter(defaultFilters);
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return (
      filters.role !== 'all' ||
      filters.status !== 'all' ||
      filters.emailVerified !== 'all' ||
      filters.dateRange !== 'all' ||
      searchQuery.trim() !== ''
    );
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
      }
    };
  }, [searchDebounceTimer]);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search users by name or email..."
          className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              onSearch('');
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Basic Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Role Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Role
          </label>
          <select
            value={filters.role}
            onChange={(e) => handleFilterChange('role', e.target.value)}
            className="block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            <option value="reader">👁️ Reader</option>
            <option value="writer">✍️ Writer</option>
            <option value="moderator">🛡️ Moderator</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Users</option>
            <option value="active">✅ Active Users</option>
            <option value="inactive">❌ Inactive Users</option>
          </select>
        </div>

        {/* Email Verification Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Status
          </label>
          <select
            value={filters.emailVerified}
            onChange={(e) => handleFilterChange('emailVerified', e.target.value)}
            className="block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All</option>
            <option value="verified">✅ Verified</option>
            <option value="unverified">⚠️ Unverified</option>
          </select>
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      {showAdvancedFilters && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm text-purple-600 hover:text-purple-800"
          >
            <svg
              className={`w-4 h-4 mr-1 transform transition-transform ${
                showAdvanced ? 'rotate-90' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Advanced Filters
          </button>

          {/* Clear Filters Button */}
          {hasActiveFilters() && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Advanced Filters */}
      {showAdvanced && showAdvancedFilters && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <h4 className="text-sm font-medium text-gray-900">Advanced Filters</h4>
          
          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Registration Date
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select
                value={filters.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                className="block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
              
              {filters.dateRange === 'custom' && (
                <>
                  <input
                    type="date"
                    value={filters.customStartDate || ''}
                    onChange={(e) => handleFilterChange('customStartDate', e.target.value)}
                    className="block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Start Date"
                  />
                  <input
                    type="date"
                    value={filters.customEndDate || ''}
                    onChange={(e) => handleFilterChange('customEndDate', e.target.value)}
                    className="block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="End Date"
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters() && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-600">Active filters:</span>
          
          {searchQuery && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Search: "{searchQuery}"
              <button
                onClick={() => {
                  setSearchQuery('');
                  onSearch('');
                }}
                className="ml-1 text-purple-600 hover:text-purple-800"
              >
                ×
              </button>
            </span>
          )}
          
          {filters.role !== 'all' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Role: {filters.role}
              <button
                onClick={() => handleFilterChange('role', 'all')}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          )}
          
          {filters.status !== 'all' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Status: {filters.status}
              <button
                onClick={() => handleFilterChange('status', 'all')}
                className="ml-1 text-green-600 hover:text-green-800"
              >
                ×
              </button>
            </span>
          )}
          
          {filters.emailVerified !== 'all' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Email: {filters.emailVerified}
              <button
                onClick={() => handleFilterChange('emailVerified', 'all')}
                className="ml-1 text-yellow-600 hover:text-yellow-800"
              >
                ×
              </button>
            </span>
          )}
          
          {filters.dateRange !== 'all' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              Date: {filters.dateRange}
              <button
                onClick={() => handleFilterChange('dateRange', 'all')}
                className="ml-1 text-orange-600 hover:text-orange-800"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}