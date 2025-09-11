'use client';

import React, { useState, useEffect } from 'react';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { UserManagementTable } from './UserManagementTable';
import { UserSearchAndFilter } from './UserSearchAndFilter';
import { RoleAssignmentModal } from './RoleAssignmentModal';
import { UserStatisticsCard } from './UserStatisticsCard';
import { AuditLogViewer } from './AuditLogViewer';
import { AdminUserService } from '@/lib/auth/AdminUserService';
import { RoleAssignmentService } from '@/lib/auth/RoleAssignmentService';
import { AuditLogService } from '@/lib/auth/AuditLogService';
import { useAuth } from '@/lib/auth/AuthProvider';
import type { AuthUser, UserRole } from '@/types/user';
import type { UserStatistics } from '@/lib/auth/AdminUserService';
import type { AuditLog } from '@/types/audit';

interface FilterState {
  role: UserRole | 'all';
  status: 'active' | 'inactive' | 'all';
}

export function AdminDashboard() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AuthUser[]>([]);
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
  const [recentAuditLogs, setRecentAuditLogs] = useState<AuditLog[]>([]);
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({ role: 'all', status: 'all' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const adminUserService = new AdminUserService();
  const roleAssignmentService = new RoleAssignmentService();
  const auditLogService = new AuditLogService();

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Apply search and filters
  useEffect(() => {
    applyFiltersAndSearch();
  }, [users, searchQuery, filters]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load users
      const usersResult = await adminUserService.getAllUsers(1, 100);
      setUsers(usersResult.users);

      // Load statistics
      const stats = await adminUserService.getUserStatistics();
      setStatistics(stats);

      // Load recent audit logs
      const auditResult = await auditLogService.getAuditLogs(1, 10);
      if (auditResult.success) {
        setRecentAuditLogs(auditResult.logs);
      }

    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard data loading error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFiltersAndSearch = () => {
    let filtered = [...users];

    // Apply search
    if (searchQuery.trim()) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply role filter
    if (filters.role !== 'all') {
      filtered = filtered.filter(user => user.role === filters.role);
    }

    // Apply status filter
    if (filters.status !== 'all') {
      const isActive = filters.status === 'active';
      filtered = filtered.filter(user => user.isActive === isActive);
    }

    setFilteredUsers(filtered);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFilter = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleRoleChange = (user: AuthUser) => {
    setSelectedUser(user);
    setIsRoleModalOpen(true);
  };

  const handleRoleAssign = async (data: {
    userId: string;
    newRole: UserRole;
    reason?: string;
  }) => {
    if (!user) return;

    try {
      const result = await roleAssignmentService.assignRole(
        data.userId,
        data.newRole,
        user.id,
        data.reason,
        // Note: In a real app, you'd get these from request headers
        '192.168.1.1',
        navigator.userAgent
      );

      if (result.success) {
        // Reload users to reflect changes
        await loadDashboardData();
        setIsRoleModalOpen(false);
        setSelectedUser(null);
        
        // Show success message (you might want to use a toast library)
        alert(`Role successfully changed to ${data.newRole}`);
      } else {
        alert(`Failed to change role: ${result.error}`);
      }
    } catch (err) {
      console.error('Role assignment error:', err);
      alert('Failed to change role');
    }
  };

  const handleUserAction = async (targetUser: AuthUser, action: 'activate' | 'deactivate' | 'delete') => {
    if (!user) return;

    try {
      let result;
      
      switch (action) {
        case 'activate':
          result = await adminUserService.reactivateUser(
            targetUser.id,
            user.id,
            'Reactivated via admin dashboard',
            '192.168.1.1',
            navigator.userAgent
          );
          break;
        case 'deactivate':
          result = await adminUserService.deactivateUser(
            targetUser.id,
            user.id,
            'Deactivated via admin dashboard',
            '192.168.1.1',
            navigator.userAgent
          );
          break;
        case 'delete':
          if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            result = await adminUserService.deleteUser(
              targetUser.id,
              user.id,
              false, // Soft delete
              'Deleted via admin dashboard',
              '192.168.1.1',
              navigator.userAgent
            );
          } else {
            return;
          }
          break;
      }

      if (result?.success) {
        await loadDashboardData();
        alert(`User successfully ${action}d`);
      } else {
        alert(`Failed to ${action} user: ${result?.error}`);
      }
    } catch (err) {
      console.error(`User ${action} error:`, err);
      alert(`Failed to ${action} user`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        <span className="ml-4 text-lg text-purple-600">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Dashboard</h3>
          <p className="text-red-700">{error}</p>
          <button
            onClick={loadDashboardData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <PermissionGate requiredRole="moderator">
      <div className="space-y-8 p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management Dashboard</h1>
          <p className="text-gray-600">
            Manage users, roles, and monitor system activity
          </p>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <UserStatisticsCard
              title="Total Users"
              value={statistics.totalUsers}
              icon="👥"
              color="bg-blue-500"
            />
            <UserStatisticsCard
              title="Active Users"
              value={statistics.activeUsers}
              icon="✅"
              color="bg-green-500"
            />
            <UserStatisticsCard
              title="Recent Signups"
              value={statistics.recentSignups}
              icon="📈"
              color="bg-purple-500"
              subtitle="Last 30 days"
            />
            <UserStatisticsCard
              title="Moderators"
              value={statistics.roleDistribution.moderator}
              icon="🛡️"
              color="bg-orange-500"
            />
          </div>
        )}

        {/* Role Distribution */}
        {statistics && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Role Distribution</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {statistics.roleDistribution.reader}
                </div>
                <div className="text-sm text-gray-600">Readers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {statistics.roleDistribution.writer}
                </div>
                <div className="text-sm text-gray-600">Writers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {statistics.roleDistribution.moderator}
                </div>
                <div className="text-sm text-gray-600">Moderators</div>
              </div>
            </div>
          </div>
        )}

        {/* User Management Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">User Management</h2>
            <UserSearchAndFilter
              onSearch={handleSearch}
              onFilter={handleFilter}
              currentSearch={searchQuery}
              currentFilters={filters}
            />
          </div>
          
          <div className="p-6">
            <UserManagementTable
              users={filteredUsers}
              onRoleChange={handleRoleChange}
              onUserAction={handleUserAction}
            />
          </div>
        </div>

        {/* Recent Audit Logs */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Audit Logs</h2>
          <AuditLogViewer
            auditLogs={recentAuditLogs}
            showPagination={false}
            maxEntries={10}
          />
          <div className="mt-4 text-center">
            <button className="text-purple-600 hover:text-purple-800 font-medium">
              View All Audit Logs →
            </button>
          </div>
        </div>

        {/* Role Assignment Modal */}
        {selectedUser && (
          <RoleAssignmentModal
            user={selectedUser}
            isOpen={isRoleModalOpen}
            onClose={() => {
              setIsRoleModalOpen(false);
              setSelectedUser(null);
            }}
            onRoleAssign={handleRoleAssign}
          />
        )}
      </div>
    </PermissionGate>
  );
}