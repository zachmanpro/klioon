import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { UserManagementTable } from '@/components/admin/UserManagementTable';
import { RoleAssignmentModal } from '@/components/admin/RoleAssignmentModal';
import { UserSearchAndFilter } from '@/components/admin/UserSearchAndFilter';
import { PermissionGate } from '@/components/auth/PermissionGate';
import type { AuthUser, UserRole } from '@/types/user';
import type { AuditLog } from '@/types/audit';

// Mock the authentication context
const mockAuthContext = {
  user: {
    id: 'mod-123',
    email: 'moderator@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'moderator' as UserRole,
    emailVerified: true,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  isLoading: false,
  signIn: jest.fn(),
  signOut: jest.fn(),
  hasPermission: jest.fn(() => true),
};

jest.mock('@/lib/auth/AuthProvider', () => ({
  useAuth: () => mockAuthContext,
}));

// Mock the services
jest.mock('@/lib/auth/AdminUserService');
jest.mock('@/lib/auth/RoleAssignmentService');
jest.mock('@/lib/auth/AuditLogService');

const mockUsers: AuthUser[] = [
  {
    id: 'user-1',
    email: 'reader@example.com',
    firstName: 'John',
    lastName: 'Reader',
    role: 'reader' as UserRole,
    emailVerified: true,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'user-2',
    email: 'writer@example.com',
    firstName: 'Sarah',
    lastName: 'Writer',
    role: 'writer' as UserRole,
    emailVerified: true,
    isActive: true,
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
  },
  {
    id: 'user-3',
    email: 'inactive@example.com',
    firstName: 'Bob',
    lastName: 'Inactive',
    role: 'reader' as UserRole,
    emailVerified: false,
    isActive: false,
    createdAt: '2025-01-03T00:00:00Z',
    updatedAt: '2025-01-03T00:00:00Z',
  },
];

describe('AdminDashboard Component Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AdminDashboard rendering', () => {
    it('should render admin dashboard for moderator', () => {
      render(<AdminDashboard />);

      expect(screen.getByText('User Management Dashboard')).toBeInTheDocument();
      expect(screen.getByText('User Statistics')).toBeInTheDocument();
      expect(screen.getByText('Recent Audit Logs')).toBeInTheDocument();
    });

    it('should show permission denied for non-moderator', () => {
      const readerAuthContext = {
        ...mockAuthContext,
        user: { ...mockAuthContext.user, role: 'reader' as UserRole },
        hasPermission: jest.fn(() => false),
      };

      jest.mocked(require('@/lib/auth/AuthProvider').useAuth).mockReturnValue(readerAuthContext);

      render(
        <PermissionGate requiredRole="moderator">
          <AdminDashboard />
        </PermissionGate>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText('You do not have permission to access this page.')).toBeInTheDocument();
    });

    it('should display user statistics correctly', async () => {
      render(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Total Users')).toBeInTheDocument();
        expect(screen.getByText('Active Users')).toBeInTheDocument();
        expect(screen.getByText('Readers')).toBeInTheDocument();
        expect(screen.getByText('Writers')).toBeInTheDocument();
        expect(screen.getByText('Moderators')).toBeInTheDocument();
      });
    });
  });

  describe('UserManagementTable component', () => {
    it('should render user list with correct data', () => {
      render(<UserManagementTable users={mockUsers} onRoleChange={jest.fn()} onUserAction={jest.fn()} />);

      expect(screen.getByText('reader@example.com')).toBeInTheDocument();
      expect(screen.getByText('writer@example.com')).toBeInTheDocument();
      expect(screen.getByText('inactive@example.com')).toBeInTheDocument();
      
      expect(screen.getByText('John Reader')).toBeInTheDocument();
      expect(screen.getByText('Sarah Writer')).toBeInTheDocument();
      expect(screen.getByText('Bob Inactive')).toBeInTheDocument();
    });

    it('should display user roles with appropriate badges', () => {
      render(<UserManagementTable users={mockUsers} onRoleChange={jest.fn()} onUserAction={jest.fn()} />);

      const readerBadges = screen.getAllByText('Reader');
      const writerBadges = screen.getAllByText('Writer');
      
      expect(readerBadges).toHaveLength(2); // Two readers in mock data
      expect(writerBadges).toHaveLength(1); // One writer in mock data
    });

    it('should show active/inactive status correctly', () => {
      render(<UserManagementTable users={mockUsers} onRoleChange={jest.fn()} onUserAction={jest.fn()} />);

      const activeStatuses = screen.getAllByText('Active');
      const inactiveStatuses = screen.getAllByText('Inactive');
      
      expect(activeStatuses).toHaveLength(2);
      expect(inactiveStatuses).toHaveLength(1);
    });

    it('should call onRoleChange when role change button is clicked', async () => {
      const mockOnRoleChange = jest.fn();
      render(<UserManagementTable users={mockUsers} onRoleChange={mockOnRoleChange} onUserAction={jest.fn()} />);

      const roleChangeButtons = screen.getAllByText('Change Role');
      await userEvent.click(roleChangeButtons[0]);

      expect(mockOnRoleChange).toHaveBeenCalledWith(mockUsers[0]);
    });

    it('should call onUserAction for deactivate/activate actions', async () => {
      const mockOnUserAction = jest.fn();
      render(<UserManagementTable users={mockUsers} onRoleChange={jest.fn()} onUserAction={mockOnUserAction} />);

      const deactivateButtons = screen.getAllByText('Deactivate');
      await userEvent.click(deactivateButtons[0]);

      expect(mockOnUserAction).toHaveBeenCalledWith(mockUsers[0], 'deactivate');
    });
  });

  describe('RoleAssignmentModal component', () => {
    const mockUser = mockUsers[0];

    it('should render role assignment modal', () => {
      render(
        <RoleAssignmentModal 
          user={mockUser} 
          isOpen={true} 
          onClose={jest.fn()} 
          onRoleAssign={jest.fn()} 
        />
      );

      expect(screen.getByText('Change User Role')).toBeInTheDocument();
      expect(screen.getByText(`${mockUser.firstName} ${mockUser.lastName}`)).toBeInTheDocument();
      expect(screen.getByText(mockUser.email)).toBeInTheDocument();
    });

    it('should display current role and available roles', () => {
      render(
        <RoleAssignmentModal 
          user={mockUser} 
          isOpen={true} 
          onClose={jest.fn()} 
          onRoleAssign={jest.fn()} 
        />
      );

      expect(screen.getByText('Current Role:')).toBeInTheDocument();
      expect(screen.getByText('Reader')).toBeInTheDocument();
      
      expect(screen.getByText('New Role:')).toBeInTheDocument();
      expect(screen.getByDisplayValue('writer')).toBeInTheDocument();
      expect(screen.getByDisplayValue('moderator')).toBeInTheDocument();
    });

    it('should call onRoleAssign when form is submitted', async () => {
      const mockOnRoleAssign = jest.fn();
      render(
        <RoleAssignmentModal 
          user={mockUser} 
          isOpen={true} 
          onClose={jest.fn()} 
          onRoleAssign={mockOnRoleAssign} 
        />
      );

      const roleSelect = screen.getByRole('combobox');
      await userEvent.selectOptions(roleSelect, 'writer');

      const reasonInput = screen.getByPlaceholderText('Reason for role change (optional)');
      await userEvent.type(reasonInput, 'User promotion');

      const assignButton = screen.getByText('Assign Role');
      await userEvent.click(assignButton);

      expect(mockOnRoleAssign).toHaveBeenCalledWith({
        userId: mockUser.id,
        newRole: 'writer',
        reason: 'User promotion'
      });
    });

    it('should call onClose when cancel button is clicked', async () => {
      const mockOnClose = jest.fn();
      render(
        <RoleAssignmentModal 
          user={mockUser} 
          isOpen={true} 
          onClose={mockOnClose} 
          onRoleAssign={jest.fn()} 
        />
      );

      const cancelButton = screen.getByText('Cancel');
      await userEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should prevent assigning same role as current role', async () => {
      render(
        <RoleAssignmentModal 
          user={mockUser} 
          isOpen={true} 
          onClose={jest.fn()} 
          onRoleAssign={jest.fn()} 
        />
      );

      const roleSelect = screen.getByRole('combobox');
      const readerOption = screen.getByDisplayValue('reader');
      
      expect(readerOption).toBeDisabled();
    });
  });

  describe('UserSearchAndFilter component', () => {
    it('should render search and filter controls', () => {
      render(<UserSearchAndFilter onSearch={jest.fn()} onFilter={jest.fn()} />);

      expect(screen.getByPlaceholderText('Search users by name or email...')).toBeInTheDocument();
      expect(screen.getByText('Filter by Role')).toBeInTheDocument();
      expect(screen.getByText('Filter by Status')).toBeInTheDocument();
    });

    it('should call onSearch when search input changes', async () => {
      const mockOnSearch = jest.fn();
      render(<UserSearchAndFilter onSearch={mockOnSearch} onFilter={jest.fn()} />);

      const searchInput = screen.getByPlaceholderText('Search users by name or email...');
      await userEvent.type(searchInput, 'john');

      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith('john');
      });
    });

    it('should call onFilter when role filter changes', async () => {
      const mockOnFilter = jest.fn();
      render(<UserSearchAndFilter onSearch={jest.fn()} onFilter={mockOnFilter} />);

      const roleFilter = screen.getByDisplayValue('all');
      await userEvent.selectOptions(roleFilter, 'writer');

      expect(mockOnFilter).toHaveBeenCalledWith({
        role: 'writer',
        status: 'all'
      });
    });

    it('should call onFilter when status filter changes', async () => {
      const mockOnFilter = jest.fn();
      render(<UserSearchAndFilter onSearch={jest.fn()} onFilter={mockOnFilter} />);

      const statusFilter = screen.getByDisplayValue('all');
      await userEvent.selectOptions(statusFilter, 'active');

      expect(mockOnFilter).toHaveBeenCalledWith({
        role: 'all',
        status: 'active'
      });
    });

    it('should clear filters when clear button is clicked', async () => {
      const mockOnSearch = jest.fn();
      const mockOnFilter = jest.fn();
      render(<UserSearchAndFilter onSearch={mockOnSearch} onFilter={mockOnFilter} />);

      // First add some filters
      const searchInput = screen.getByPlaceholderText('Search users by name or email...');
      await userEvent.type(searchInput, 'test');

      const roleFilter = screen.getByDisplayValue('all');
      await userEvent.selectOptions(roleFilter, 'writer');

      // Then clear them
      const clearButton = screen.getByText('Clear Filters');
      await userEvent.click(clearButton);

      expect(mockOnSearch).toHaveBeenCalledWith('');
      expect(mockOnFilter).toHaveBeenCalledWith({
        role: 'all',
        status: 'all'
      });
    });
  });

  describe('PermissionGate component', () => {
    it('should render children when user has required role', () => {
      render(
        <PermissionGate requiredRole="moderator">
          <div>Protected Content</div>
        </PermissionGate>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should show access denied when user lacks required role', () => {
      const readerAuthContext = {
        ...mockAuthContext,
        user: { ...mockAuthContext.user, role: 'reader' as UserRole },
        hasPermission: jest.fn(() => false),
      };

      jest.mocked(require('@/lib/auth/AuthProvider').useAuth).mockReturnValue(readerAuthContext);

      render(
        <PermissionGate requiredRole="moderator">
          <div>Protected Content</div>
        </PermissionGate>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should show loading state when auth is loading', () => {
      const loadingAuthContext = {
        ...mockAuthContext,
        isLoading: true,
      };

      jest.mocked(require('@/lib/auth/AuthProvider').useAuth).mockReturnValue(loadingAuthContext);

      render(
        <PermissionGate requiredRole="moderator">
          <div>Protected Content</div>
        </PermissionGate>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render custom fallback when provided', () => {
      const readerAuthContext = {
        ...mockAuthContext,
        user: { ...mockAuthContext.user, role: 'reader' as UserRole },
        hasPermission: jest.fn(() => false),
      };

      jest.mocked(require('@/lib/auth/AuthProvider').useAuth).mockReturnValue(readerAuthContext);

      render(
        <PermissionGate 
          requiredRole="moderator" 
          fallback={<div>Custom Access Denied</div>}
        >
          <div>Protected Content</div>
        </PermissionGate>
      );

      expect(screen.getByText('Custom Access Denied')).toBeInTheDocument();
    });
  });

  describe('Integration tests', () => {
    it('should handle complete user role change workflow', async () => {
      const { rerender } = render(<AdminDashboard />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('User Management Dashboard')).toBeInTheDocument();
      });

      // Click on change role for a user
      const roleChangeButtons = screen.getAllByText('Change Role');
      await userEvent.click(roleChangeButtons[0]);

      // Modal should open
      expect(screen.getByText('Change User Role')).toBeInTheDocument();

      // Select new role and provide reason
      const roleSelect = screen.getByRole('combobox');
      await userEvent.selectOptions(roleSelect, 'writer');

      const reasonInput = screen.getByPlaceholderText('Reason for role change (optional)');
      await userEvent.type(reasonInput, 'Promoted for good work');

      // Submit the form
      const assignButton = screen.getByText('Assign Role');
      await userEvent.click(assignButton);

      // Modal should close and user list should update
      await waitFor(() => {
        expect(screen.queryByText('Change User Role')).not.toBeInTheDocument();
      });
    });

    it('should handle user search and filtering workflow', async () => {
      render(<AdminDashboard />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('User Management Dashboard')).toBeInTheDocument();
      });

      // Use search functionality
      const searchInput = screen.getByPlaceholderText('Search users by name or email...');
      await userEvent.type(searchInput, 'reader');

      // Apply role filter
      const roleFilter = screen.getByDisplayValue('all');
      await userEvent.selectOptions(roleFilter, 'reader');

      // Results should be filtered
      await waitFor(() => {
        // Implementation would filter the displayed users
        expect(searchInput).toHaveValue('reader');
      });
    });
  });
});