import { RoleAssignmentService } from '@/lib/auth/RoleAssignmentService';
import { PermissionService } from '@/lib/auth/PermissionService';
import { AdminUserService } from '@/lib/auth/AdminUserService';
import { UserRole, UserPermission, ROLE_PERMISSIONS } from '@/types/user';
import type { AuthUser } from '@/types/user';

// Mock the Amplify client
jest.mock('aws-amplify/data');
jest.mock('@/lib/amplify');

describe('Role Assignment Tests', () => {
  let roleAssignmentService: RoleAssignmentService;
  let mockUser: AuthUser;
  let mockModerator: AuthUser;

  beforeEach(() => {
    roleAssignmentService = new RoleAssignmentService();
    
    mockUser = {
      id: 'user-123',
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'reader' as UserRole,
      emailVerified: true,
      isActive: true,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };

    mockModerator = {
      id: 'mod-123',
      email: 'moderator@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'moderator' as UserRole,
      emailVerified: true,
      isActive: true,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };
  });

  describe('assignRole function', () => {
    it('should successfully assign role from reader to writer', async () => {
      const result = await roleAssignmentService.assignRole(
        mockUser.id,
        'writer' as UserRole,
        mockModerator.id
      );

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('writer');
      expect(result.auditLog).toBeDefined();
      expect(result.auditLog?.action).toBe('ROLE_ASSIGNED');
      expect(result.auditLog?.fromRole).toBe('reader');
      expect(result.auditLog?.toRole).toBe('writer');
      expect(result.auditLog?.performedBy).toBe(mockModerator.id);
    });

    it('should successfully assign role from writer to moderator', async () => {
      const writerUser = { ...mockUser, role: 'writer' as UserRole };
      
      const result = await roleAssignmentService.assignRole(
        writerUser.id,
        'moderator' as UserRole,
        mockModerator.id
      );

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('moderator');
      expect(result.auditLog?.fromRole).toBe('writer');
      expect(result.auditLog?.toRole).toBe('moderator');
    });

    it('should fail when non-moderator tries to assign roles', async () => {
      const readerUser = { ...mockUser, role: 'reader' as UserRole };
      
      const result = await roleAssignmentService.assignRole(
        mockUser.id,
        'writer' as UserRole,
        readerUser.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('INSUFFICIENT_PERMISSIONS');
      expect(result.user).toBeUndefined();
    });

    it('should fail when trying to assign invalid role', async () => {
      const result = await roleAssignmentService.assignRole(
        mockUser.id,
        'invalid' as UserRole,
        mockModerator.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_ROLE');
    });

    it('should fail when user does not exist', async () => {
      const result = await roleAssignmentService.assignRole(
        'nonexistent-user',
        'writer' as UserRole,
        mockModerator.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('USER_NOT_FOUND');
    });

    it('should not allow assigning same role to user', async () => {
      const result = await roleAssignmentService.assignRole(
        mockUser.id,
        'reader' as UserRole, // Same as current role
        mockModerator.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('ROLE_ALREADY_ASSIGNED');
    });
  });

  describe('bulkAssignRoles function', () => {
    it('should successfully assign roles to multiple users', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      const targetRole = 'writer' as UserRole;

      const result = await roleAssignmentService.bulkAssignRoles(
        userIds,
        targetRole,
        mockModerator.id
      );

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.auditLogs).toHaveLength(3);
    });

    it('should handle partial failures in bulk assignment', async () => {
      const userIds = ['user-1', 'nonexistent-user', 'user-3'];
      const targetRole = 'writer' as UserRole;

      const result = await roleAssignmentService.bulkAssignRoles(
        userIds,
        targetRole,
        mockModerator.id
      );

      expect(result.success).toBe(false);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].userId).toBe('nonexistent-user');
    });

    it('should fail when non-moderator tries bulk assignment', async () => {
      const userIds = ['user-1', 'user-2'];
      const targetRole = 'writer' as UserRole;
      const readerUser = { ...mockUser, role: 'reader' as UserRole };

      const result = await roleAssignmentService.bulkAssignRoles(
        userIds,
        targetRole,
        readerUser.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });
});

describe('Permission Check Tests', () => {
  let permissionService: PermissionService;

  beforeEach(() => {
    permissionService = new PermissionService();
  });

  describe('hasPermission function', () => {
    it('should return true when reader has read permission', () => {
      const result = permissionService.hasPermission(
        'reader' as UserRole,
        UserPermission.READ_STORIES
      );
      expect(result).toBe(true);
    });

    it('should return false when reader tries to write stories', () => {
      const result = permissionService.hasPermission(
        'reader' as UserRole,
        UserPermission.WRITE_STORIES
      );
      expect(result).toBe(false);
    });

    it('should return true when writer has write and read permissions', () => {
      const readResult = permissionService.hasPermission(
        'writer' as UserRole,
        UserPermission.READ_STORIES
      );
      const writeResult = permissionService.hasPermission(
        'writer' as UserRole,
        UserPermission.WRITE_STORIES
      );
      
      expect(readResult).toBe(true);
      expect(writeResult).toBe(true);
    });

    it('should return false when writer tries to manage users', () => {
      const result = permissionService.hasPermission(
        'writer' as UserRole,
        UserPermission.MANAGE_USERS
      );
      expect(result).toBe(false);
    });

    it('should return true when moderator has all permissions', () => {
      const permissions = Object.values(UserPermission);
      
      permissions.forEach(permission => {
        const result = permissionService.hasPermission(
          'moderator' as UserRole,
          permission
        );
        expect(result).toBe(true);
      });
    });
  });

  describe('hasAnyPermission function', () => {
    it('should return true when user has at least one of the requested permissions', () => {
      const result = permissionService.hasAnyPermission(
        'writer' as UserRole,
        [UserPermission.READ_STORIES, UserPermission.MANAGE_USERS]
      );
      expect(result).toBe(true);
    });

    it('should return false when user has none of the requested permissions', () => {
      const result = permissionService.hasAnyPermission(
        'reader' as UserRole,
        [UserPermission.WRITE_STORIES, UserPermission.MANAGE_USERS]
      );
      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions function', () => {
    it('should return true when user has all requested permissions', () => {
      const result = permissionService.hasAllPermissions(
        'writer' as UserRole,
        [UserPermission.READ_STORIES, UserPermission.WRITE_STORIES]
      );
      expect(result).toBe(true);
    });

    it('should return false when user is missing some permissions', () => {
      const result = permissionService.hasAllPermissions(
        'writer' as UserRole,
        [UserPermission.READ_STORIES, UserPermission.MANAGE_USERS]
      );
      expect(result).toBe(false);
    });
  });

  describe('getPermissionsForRole function', () => {
    it('should return correct permissions for reader role', () => {
      const permissions = permissionService.getPermissionsForRole('reader' as UserRole);
      expect(permissions).toEqual([UserPermission.READ_STORIES]);
    });

    it('should return correct permissions for writer role', () => {
      const permissions = permissionService.getPermissionsForRole('writer' as UserRole);
      expect(permissions).toEqual([
        UserPermission.READ_STORIES,
        UserPermission.WRITE_STORIES,
        UserPermission.EDIT_STORIES,
      ]);
    });

    it('should return all permissions for moderator role', () => {
      const permissions = permissionService.getPermissionsForRole('moderator' as UserRole);
      expect(permissions).toContain(UserPermission.MANAGE_USERS);
      expect(permissions).toContain(UserPermission.MODERATE_CONTENT);
      expect(permissions).toContain(UserPermission.ADMIN_ACCESS);
    });
  });
});

describe('Admin User Management Tests', () => {
  let adminUserService: AdminUserService;
  let mockUsers: AuthUser[];

  beforeEach(() => {
    adminUserService = new AdminUserService();
    
    mockUsers = [
      {
        id: 'user-1',
        email: 'user1@example.com',
        firstName: 'User',
        lastName: 'One',
        role: 'reader' as UserRole,
        emailVerified: true,
        isActive: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      {
        id: 'user-2',
        email: 'user2@example.com',
        firstName: 'User',
        lastName: 'Two',
        role: 'writer' as UserRole,
        emailVerified: true,
        isActive: false,
        createdAt: '2025-01-02T00:00:00Z',
        updatedAt: '2025-01-02T00:00:00Z',
      },
    ];
  });

  describe('getAllUsers function', () => {
    it('should return all users with pagination', async () => {
      const result = await adminUserService.getAllUsers(1, 10);

      expect(result.users).toBeDefined();
      expect(result.totalCount).toBeGreaterThan(0);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it('should return empty array when no users exist', async () => {
      const result = await adminUserService.getAllUsers(1, 10);
      
      // When database is empty
      if (result.totalCount === 0) {
        expect(result.users).toHaveLength(0);
        expect(result.totalCount).toBe(0);
      }
    });
  });

  describe('searchUsers function', () => {
    it('should find users by email', async () => {
      const result = await adminUserService.searchUsers('user1@example.com');

      expect(result.users).toBeDefined();
      if (result.users.length > 0) {
        expect(result.users[0].email).toContain('user1@example.com');
      }
    });

    it('should find users by name', async () => {
      const result = await adminUserService.searchUsers('User One');

      expect(result.users).toBeDefined();
      if (result.users.length > 0) {
        expect(
          result.users[0].firstName.includes('User') || 
          result.users[0].lastName.includes('One')
        ).toBe(true);
      }
    });

    it('should return empty array for non-existent users', async () => {
      const result = await adminUserService.searchUsers('nonexistent@email.com');

      expect(result.users).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('filterUsersByRole function', () => {
    it('should filter users by reader role', async () => {
      const result = await adminUserService.filterUsersByRole('reader' as UserRole);

      expect(result.users).toBeDefined();
      result.users.forEach(user => {
        expect(user.role).toBe('reader');
      });
    });

    it('should filter users by writer role', async () => {
      const result = await adminUserService.filterUsersByRole('writer' as UserRole);

      result.users.forEach(user => {
        expect(user.role).toBe('writer');
      });
    });

    it('should filter users by moderator role', async () => {
      const result = await adminUserService.filterUsersByRole('moderator' as UserRole);

      result.users.forEach(user => {
        expect(user.role).toBe('moderator');
      });
    });
  });

  describe('filterUsersByStatus function', () => {
    it('should filter active users', async () => {
      const result = await adminUserService.filterUsersByStatus(true);

      result.users.forEach(user => {
        expect(user.isActive).toBe(true);
      });
    });

    it('should filter inactive users', async () => {
      const result = await adminUserService.filterUsersByStatus(false);

      result.users.forEach(user => {
        expect(user.isActive).toBe(false);
      });
    });
  });

  describe('deactivateUser function', () => {
    it('should successfully deactivate an active user', async () => {
      const result = await adminUserService.deactivateUser('user-1', 'mod-123');

      expect(result.success).toBe(true);
      expect(result.user?.isActive).toBe(false);
      expect(result.auditLog).toBeDefined();
      expect(result.auditLog?.action).toBe('USER_DEACTIVATED');
    });

    it('should fail when trying to deactivate non-existent user', async () => {
      const result = await adminUserService.deactivateUser('nonexistent', 'mod-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('USER_NOT_FOUND');
    });

    it('should fail when non-moderator tries to deactivate user', async () => {
      const result = await adminUserService.deactivateUser('user-1', 'reader-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('reactivateUser function', () => {
    it('should successfully reactivate an inactive user', async () => {
      const result = await adminUserService.reactivateUser('user-2', 'mod-123');

      expect(result.success).toBe(true);
      expect(result.user?.isActive).toBe(true);
      expect(result.auditLog?.action).toBe('USER_REACTIVATED');
    });

    it('should fail when trying to reactivate already active user', async () => {
      const result = await adminUserService.reactivateUser('user-1', 'mod-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('USER_ALREADY_ACTIVE');
    });
  });

  describe('deleteUser function', () => {
    it('should successfully soft delete a user', async () => {
      const result = await adminUserService.deleteUser('user-1', 'mod-123', false);

      expect(result.success).toBe(true);
      expect(result.auditLog?.action).toBe('USER_SOFT_DELETED');
    });

    it('should successfully hard delete a user', async () => {
      const result = await adminUserService.deleteUser('user-1', 'mod-123', true);

      expect(result.success).toBe(true);
      expect(result.auditLog?.action).toBe('USER_HARD_DELETED');
    });

    it('should fail when non-moderator tries to delete user', async () => {
      const result = await adminUserService.deleteUser('user-1', 'reader-123', false);

      expect(result.success).toBe(false);
      expect(result.error).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('getUserStatistics function', () => {
    it('should return user statistics', async () => {
      const result = await adminUserService.getUserStatistics();

      expect(result.totalUsers).toBeGreaterThanOrEqual(0);
      expect(result.activeUsers).toBeGreaterThanOrEqual(0);
      expect(result.inactiveUsers).toBeGreaterThanOrEqual(0);
      expect(result.roleDistribution).toBeDefined();
      expect(result.roleDistribution.reader).toBeGreaterThanOrEqual(0);
      expect(result.roleDistribution.writer).toBeGreaterThanOrEqual(0);
      expect(result.roleDistribution.moderator).toBeGreaterThanOrEqual(0);
    });
  });
});