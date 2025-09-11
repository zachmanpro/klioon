'use client';

import React from 'react';
import type { AuthUser, UserRole } from '@/types/user';
import { PermissionService } from '@/lib/auth/PermissionService';

interface UserManagementTableProps {
  users: AuthUser[];
  onRoleChange: (user: AuthUser) => void;
  onUserAction: (user: AuthUser, action: 'activate' | 'deactivate' | 'delete') => void;
}

export function UserManagementTable({
  users,
  onRoleChange,
  onUserAction
}: UserManagementTableProps) {
  const permissionService = new PermissionService();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleBadge = (role: UserRole) => {
    const roleInfo = permissionService.getRoleDisplayInfo(role);
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleInfo.color}`}>
        <span className="mr-1">{roleInfo.icon}</span>
        {roleInfo.name}
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean, emailVerified: boolean) => {
    if (!isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          ❌ Inactive
        </span>
      );
    }
    
    if (!emailVerified) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          ⚠️ Unverified
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        ✅ Active
      </span>
    );
  };

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
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
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Try adjusting your search or filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              User
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Joined
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Last Login
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-purple-600">
                        {user.firstName[0]}{user.lastName[0]}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getRoleBadge(user.role)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getStatusBadge(user.isActive, user.emailVerified)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {user.createdAt ? formatDate(user.createdAt) : 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-2">
                  {/* Role Change Button */}
                  <button
                    onClick={() => onRoleChange(user)}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                  >
                    Change Role
                  </button>

                  {/* Activate/Deactivate Button */}
                  {user.isActive ? (
                    <button
                      onClick={() => onUserAction(user, 'deactivate')}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-orange-700 bg-orange-100 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => onUserAction(user, 'activate')}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Activate
                    </button>
                  )}

                  {/* More Actions Dropdown */}
                  <div className="relative">
                    <button
                      className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                      onClick={() => {
                        // Toggle dropdown
                        const dropdown = document.getElementById(`dropdown-${user.id}`);
                        if (dropdown) {
                          dropdown.classList.toggle('hidden');
                        }
                      }}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                    
                    <div
                      id={`dropdown-${user.id}`}
                      className="hidden absolute right-0 z-10 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5"
                    >
                      <div className="py-1">
                        <button
                          onClick={() => {
                            // Close dropdown first
                            const dropdown = document.getElementById(`dropdown-${user.id}`);
                            if (dropdown) dropdown.classList.add('hidden');
                            // Then execute action
                            alert(`View profile for ${user.firstName} ${user.lastName}`);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          View Profile
                        </button>
                        <button
                          onClick={() => {
                            const dropdown = document.getElementById(`dropdown-${user.id}`);
                            if (dropdown) dropdown.classList.add('hidden');
                            alert(`View activity for ${user.firstName} ${user.lastName}`);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          View Activity
                        </button>
                        <button
                          onClick={() => {
                            const dropdown = document.getElementById(`dropdown-${user.id}`);
                            if (dropdown) dropdown.classList.add('hidden');
                            alert(`Send message to ${user.firstName} ${user.lastName}`);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Send Message
                        </button>
                        <hr className="my-1" />
                        <button
                          onClick={() => {
                            const dropdown = document.getElementById(`dropdown-${user.id}`);
                            if (dropdown) dropdown.classList.add('hidden');
                            onUserAction(user, 'delete');
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-100"
                        >
                          Delete User
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}