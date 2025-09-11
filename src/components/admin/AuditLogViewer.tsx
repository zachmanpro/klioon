'use client';

import React, { useState } from 'react';
import type { AuditLog, AuditAction } from '@/types/audit';

interface AuditLogViewerProps {
  auditLogs: AuditLog[];
  showPagination?: boolean;
  maxEntries?: number;
  showFilters?: boolean;
}

export function AuditLogViewer({
  auditLogs,
  showPagination = true,
  maxEntries,
  showFilters = false
}: AuditLogViewerProps) {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [filterAction, setFilterAction] = useState<AuditAction | 'all'>('all');

  // Filter logs by action if filter is set
  const filteredLogs = filterAction === 'all' 
    ? auditLogs 
    : auditLogs.filter(log => log.action === filterAction);

  // Limit entries if maxEntries is set
  const displayLogs = maxEntries 
    ? filteredLogs.slice(0, maxEntries)
    : filteredLogs;

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionIcon = (action: AuditAction): string => {
    const iconMap: Record<AuditAction, string> = {
      'ROLE_ASSIGNED': '🔄',
      'ROLE_REVOKED': '❌',
      'PERMISSION_GRANTED': '✅',
      'PERMISSION_REVOKED': '🚫',
      'USER_CREATED': '👤',
      'USER_UPDATED': '✏️',
      'USER_DELETED': '🗑️',
      'USER_DEACTIVATED': '⏸️',
      'USER_REACTIVATED': '▶️',
      'USER_SOFT_DELETED': '🗑️',
      'USER_HARD_DELETED': '💀',
      'LOGIN_SUCCESS': '🔓',
      'LOGIN_FAILED': '🔒',
      'LOGOUT': '👋',
      'PASSWORD_RESET': '🔑',
      'EMAIL_VERIFIED': '📧',
      'PROFILE_UPDATED': '👤',
      'BULK_OPERATION': '📦',
      'ADMIN_ACCESS': '🛡️',
      'SECURITY_VIOLATION': '⚠️'
    };
    return iconMap[action] || '📝';
  };

  const getActionColor = (action: AuditAction): string => {
    const colorMap: Record<AuditAction, string> = {
      'ROLE_ASSIGNED': 'bg-blue-100 text-blue-800',
      'ROLE_REVOKED': 'bg-red-100 text-red-800',
      'PERMISSION_GRANTED': 'bg-green-100 text-green-800',
      'PERMISSION_REVOKED': 'bg-red-100 text-red-800',
      'USER_CREATED': 'bg-green-100 text-green-800',
      'USER_UPDATED': 'bg-yellow-100 text-yellow-800',
      'USER_DELETED': 'bg-red-100 text-red-800',
      'USER_DEACTIVATED': 'bg-orange-100 text-orange-800',
      'USER_REACTIVATED': 'bg-green-100 text-green-800',
      'USER_SOFT_DELETED': 'bg-red-100 text-red-800',
      'USER_HARD_DELETED': 'bg-red-100 text-red-800',
      'LOGIN_SUCCESS': 'bg-green-100 text-green-800',
      'LOGIN_FAILED': 'bg-red-100 text-red-800',
      'LOGOUT': 'bg-gray-100 text-gray-800',
      'PASSWORD_RESET': 'bg-yellow-100 text-yellow-800',
      'EMAIL_VERIFIED': 'bg-blue-100 text-blue-800',
      'PROFILE_UPDATED': 'bg-yellow-100 text-yellow-800',
      'BULK_OPERATION': 'bg-purple-100 text-purple-800',
      'ADMIN_ACCESS': 'bg-purple-100 text-purple-800',
      'SECURITY_VIOLATION': 'bg-red-100 text-red-800'
    };
    return colorMap[action] || 'bg-gray-100 text-gray-800';
  };

  const getActionDescription = (log: AuditLog): string => {
    switch (log.action) {
      case 'ROLE_ASSIGNED':
        return `Role changed from ${log.fromRole} to ${log.toRole}`;
      case 'ROLE_REVOKED':
        return `Role ${log.fromRole} revoked`;
      case 'USER_CREATED':
        return 'User account created';
      case 'USER_UPDATED':
        return 'User profile updated';
      case 'USER_DELETED':
      case 'USER_SOFT_DELETED':
        return 'User account deleted';
      case 'USER_HARD_DELETED':
        return 'User account permanently deleted';
      case 'USER_DEACTIVATED':
        return 'User account deactivated';
      case 'USER_REACTIVATED':
        return 'User account reactivated';
      case 'LOGIN_SUCCESS':
        return 'Successful login';
      case 'LOGIN_FAILED':
        return 'Failed login attempt';
      case 'LOGOUT':
        return 'User logged out';
      case 'PASSWORD_RESET':
        return 'Password reset';
      case 'EMAIL_VERIFIED':
        return 'Email verified';
      case 'PROFILE_UPDATED':
        return 'Profile updated';
      case 'PERMISSION_GRANTED':
        return 'Permission granted';
      case 'PERMISSION_REVOKED':
        return 'Permission revoked';
      case 'BULK_OPERATION':
        return 'Bulk operation performed';
      case 'ADMIN_ACCESS':
        return 'Admin panel accessed';
      case 'SECURITY_VIOLATION':
        return 'Security violation detected';
      default:
        return log.action;
    }
  };

  if (displayLogs.length === 0) {
    return (
      <div className="text-center py-8">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No audit logs</h3>
        <p className="mt-1 text-sm text-gray-500">
          No audit logs match your current criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">
            Filter by Action:
          </label>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value as AuditAction | 'all')}
            className="block border border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Actions</option>
            <option value="ROLE_ASSIGNED">Role Assignments</option>
            <option value="USER_CREATED">User Creation</option>
            <option value="USER_UPDATED">User Updates</option>
            <option value="USER_DELETED">User Deletions</option>
            <option value="LOGIN_SUCCESS">Successful Logins</option>
            <option value="LOGIN_FAILED">Failed Logins</option>
            <option value="ADMIN_ACCESS">Admin Access</option>
            <option value="SECURITY_VIOLATION">Security Violations</option>
          </select>
        </div>
      )}

      {/* Audit Log List */}
      <div className="space-y-2">
        {displayLogs.map((log) => (
          <div
            key={log.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedLog(log)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <span className="text-xl">{getActionIcon(log.action)}</span>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                    {log.success === false && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        ❌ Failed
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-900 font-medium">
                    {getActionDescription(log)}
                  </p>
                  <div className="text-xs text-gray-500 mt-1 space-x-4">
                    <span>Performed by: {log.performedBy}</span>
                    {log.targetUserId && (
                      <span>Target: {log.targetUserId}</span>
                    )}
                    {log.ipAddress && (
                      <span>IP: {log.ipAddress}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {formatTimestamp(log.timestamp)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setSelectedLog(null)}
            />
            
            <div className="relative bg-white rounded-lg shadow-xl transform transition-all sm:max-w-lg sm:w-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Audit Log Details
                  </h3>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Action</label>
                  <div className="mt-1 flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(selectedLog.action)}`}>
                      {getActionIcon(selectedLog.action)} {selectedLog.action}
                    </span>
                    {selectedLog.success === false && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Failed
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p className="mt-1 text-sm text-gray-900">{getActionDescription(selectedLog)}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Performed By</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.performedBy}</p>
                  </div>
                  {selectedLog.targetUserId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Target User</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedLog.targetUserId}</p>
                    </div>
                  )}
                </div>

                {(selectedLog.fromRole || selectedLog.toRole) && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedLog.fromRole && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">From Role</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedLog.fromRole}</p>
                      </div>
                    )}
                    {selectedLog.toRole && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">To Role</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedLog.toRole}</p>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                  <p className="mt-1 text-sm text-gray-900">{formatTimestamp(selectedLog.timestamp)}</p>
                </div>

                {(selectedLog.ipAddress || selectedLog.userAgent) && (
                  <div className="grid grid-cols-1 gap-4">
                    {selectedLog.ipAddress && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">IP Address</label>
                        <p className="mt-1 text-sm text-gray-900 font-mono">{selectedLog.ipAddress}</p>
                      </div>
                    )}
                    {selectedLog.userAgent && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">User Agent</label>
                        <p className="mt-1 text-sm text-gray-900 font-mono break-all">{selectedLog.userAgent}</p>
                      </div>
                    )}
                  </div>
                )}

                {selectedLog.errorMessage && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Error Message</label>
                    <p className="mt-1 text-sm text-red-600">{selectedLog.errorMessage}</p>
                  </div>
                )}

                {selectedLog.metadata && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Additional Data</label>
                    <pre className="mt-1 text-xs text-gray-900 bg-gray-50 rounded-lg p-3 overflow-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}