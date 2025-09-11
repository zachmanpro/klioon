'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { AuthUser, UserRole } from '@/types/user';
import { PermissionService } from '@/lib/auth/PermissionService';

interface RoleAssignmentModalProps {
  user: AuthUser;
  isOpen: boolean;
  onClose: () => void;
  onRoleAssign: (data: {
    userId: string;
    newRole: UserRole;
    reason?: string;
  }) => Promise<void>;
}

export function RoleAssignmentModal({
  user,
  isOpen,
  onClose,
  onRoleAssign
}: RoleAssignmentModalProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('reader');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  const permissionService = new PermissionService();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen && user) {
      // Set default role to next logical promotion
      const currentRole = user.role;
      if (currentRole === 'reader') {
        setSelectedRole('writer');
      } else if (currentRole === 'writer') {
        setSelectedRole('moderator');
      } else {
        setSelectedRole('reader'); // For demotion from moderator
      }
      setReason('');
    }
  }, [isOpen, user]);

  if (!mounted || !isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedRole === user.role) {
      alert('Please select a different role');
      return;
    }

    setIsSubmitting(true);
    try {
      await onRoleAssign({
        userId: user.id,
        newRole: selectedRole,
        reason: reason.trim() || undefined
      });
    } catch (error) {
      console.error('Role assignment failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableRoles: UserRole[] = ['reader', 'writer', 'moderator'];
  const currentRoleInfo = permissionService.getRoleDisplayInfo(user.role);
  const selectedRoleInfo = permissionService.getRoleDisplayInfo(selectedRole);
  const permissionDifferences = permissionService.getPermissionDifferences(user.role, selectedRole);

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl transform transition-all sm:max-w-lg sm:w-full">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Change User Role
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* User Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-medium text-purple-600">
                      {user.firstName[0]}{user.lastName[0]}
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-medium text-gray-900">
                    {user.firstName} {user.lastName}
                  </h4>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${currentRoleInfo.color}`}>
                      {currentRoleInfo.icon} {currentRoleInfo.name}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Role:
              </label>
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{currentRoleInfo.icon}</span>
                  <span className="font-medium text-blue-900">{currentRoleInfo.name}</span>
                </div>
                <p className="text-sm text-blue-700 mt-1">{currentRoleInfo.description}</p>
              </div>
            </div>

            {/* New Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Role:
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              >
                {availableRoles.map(role => {
                  const roleInfo = permissionService.getRoleDisplayInfo(role);
                  const isCurrentRole = role === user.role;
                  
                  return (
                    <option 
                      key={role} 
                      value={role}
                      disabled={isCurrentRole}
                    >
                      {roleInfo.icon} {roleInfo.name} 
                      {isCurrentRole ? ' (Current)' : ''}
                    </option>
                  );
                })}
              </select>
              
              {/* Selected Role Info */}
              <div className="mt-3 bg-green-50 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{selectedRoleInfo.icon}</span>
                  <span className="font-medium text-green-900">{selectedRoleInfo.name}</span>
                </div>
                <p className="text-sm text-green-700 mt-1">{selectedRoleInfo.description}</p>
              </div>
            </div>

            {/* Permission Changes */}
            {selectedRole !== user.role && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permission Changes:
                </label>
                <div className="space-y-2">
                  {permissionDifferences.added.length > 0 && (
                    <div className="bg-green-50 rounded-lg p-3">
                      <h5 className="text-sm font-medium text-green-800 mb-1">
                        ✅ Permissions Added:
                      </h5>
                      <ul className="text-xs text-green-700 space-y-1">
                        {permissionDifferences.added.map(permission => (
                          <li key={permission}>• {permission}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {permissionDifferences.removed.length > 0 && (
                    <div className="bg-red-50 rounded-lg p-3">
                      <h5 className="text-sm font-medium text-red-800 mb-1">
                        ❌ Permissions Removed:
                      </h5>
                      <ul className="text-xs text-red-700 space-y-1">
                        {permissionDifferences.removed.map(permission => (
                          <li key={permission}>• {permission}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {permissionDifferences.unchanged.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h5 className="text-sm font-medium text-gray-800 mb-1">
                        ➡️ Permissions Retained:
                      </h5>
                      <ul className="text-xs text-gray-700 space-y-1">
                        {permissionDifferences.unchanged.map(permission => (
                          <li key={permission}>• {permission}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Change (Optional):
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for role change (optional)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {reason.length}/500 characters
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || selectedRole === user.role}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Assigning...
                  </div>
                ) : (
                  'Assign Role'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}