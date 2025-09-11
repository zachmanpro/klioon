import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import type { UserRole, AuthUser } from '@/types/user';
import type { AuditLog } from '@/types/audit';
import { PermissionService } from './PermissionService';
import { AuditLogService } from './AuditLogService';

const client = generateClient<Schema>();

export interface UserListResult {
  users: AuthUser[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface UserActionResult {
  success: boolean;
  user?: AuthUser;
  auditLog?: AuditLog;
  error?: string;
}

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  roleDistribution: {
    reader: number;
    writer: number;
    moderator: number;
  };
  recentSignups: number; // Last 30 days
  lastUpdated: string;
}

export class AdminUserService {
  private permissionService: PermissionService;
  private auditLogService: AuditLogService;

  constructor() {
    this.permissionService = new PermissionService();
    this.auditLogService = new AuditLogService();
  }

  /**
   * Get all users with pagination
   */
  async getAllUsers(page: number = 1, pageSize: number = 20): Promise<UserListResult> {
    try {
      const { data: users } = await client.models.User.list();
      
      const totalCount = users.length;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedUsers = users.slice(startIndex, endIndex);

      return {
        users: paginatedUsers as AuthUser[],
        totalCount,
        page,
        pageSize,
        hasNextPage: endIndex < totalCount,
        hasPreviousPage: page > 1
      };

    } catch (error) {
      console.error('Error fetching all users:', error);
      return {
        users: [],
        totalCount: 0,
        page,
        pageSize,
        hasNextPage: false,
        hasPreviousPage: false
      };
    }
  }

  /**
   * Search users by email or name
   */
  async searchUsers(query: string, page: number = 1, pageSize: number = 20): Promise<UserListResult> {
    try {
      const { data: users } = await client.models.User.list();
      
      const filteredUsers = users.filter(user => 
        user.email.toLowerCase().includes(query.toLowerCase()) ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(query.toLowerCase())
      );

      const totalCount = filteredUsers.length;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

      return {
        users: paginatedUsers as AuthUser[],
        totalCount,
        page,
        pageSize,
        hasNextPage: endIndex < totalCount,
        hasPreviousPage: page > 1
      };

    } catch (error) {
      console.error('Error searching users:', error);
      return {
        users: [],
        totalCount: 0,
        page,
        pageSize,
        hasNextPage: false,
        hasPreviousPage: false
      };
    }
  }

  /**
   * Filter users by role
   */
  async filterUsersByRole(role: UserRole, page: number = 1, pageSize: number = 20): Promise<UserListResult> {
    try {
      const { data: users } = await client.models.User.list({
        filter: { role: { eq: role } }
      });

      const totalCount = users.length;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedUsers = users.slice(startIndex, endIndex);

      return {
        users: paginatedUsers as AuthUser[],
        totalCount,
        page,
        pageSize,
        hasNextPage: endIndex < totalCount,
        hasPreviousPage: page > 1
      };

    } catch (error) {
      console.error('Error filtering users by role:', error);
      return {
        users: [],
        totalCount: 0,
        page,
        pageSize,
        hasNextPage: false,
        hasPreviousPage: false
      };
    }
  }

  /**
   * Filter users by status (active/inactive)
   */
  async filterUsersByStatus(isActive: boolean, page: number = 1, pageSize: number = 20): Promise<UserListResult> {
    try {
      const { data: users } = await client.models.User.list({
        filter: { isActive: { eq: isActive } }
      });

      const totalCount = users.length;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedUsers = users.slice(startIndex, endIndex);

      return {
        users: paginatedUsers as AuthUser[],
        totalCount,
        page,
        pageSize,
        hasNextPage: endIndex < totalCount,
        hasPreviousPage: page > 1
      };

    } catch (error) {
      console.error('Error filtering users by status:', error);
      return {
        users: [],
        totalCount: 0,
        page,
        pageSize,
        hasNextPage: false,
        hasPreviousPage: false
      };
    }
  }

  /**
   * Deactivate a user
   */
  async deactivateUser(
    userId: string,
    performedBy: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserActionResult> {
    try {
      // Check if performer has permission
      const { data: performer } = await client.models.User.get({ id: performedBy });
      if (!performer || !this.permissionService.hasPermission(performer.role, 'MANAGE_USERS' as any)) {
        return {
          success: false,
          error: 'INSUFFICIENT_PERMISSIONS'
        };
      }

      // Get the target user
      const { data: targetUser } = await client.models.User.get({ id: userId });
      if (!targetUser) {
        return {
          success: false,
          error: 'USER_NOT_FOUND'
        };
      }

      if (!targetUser.isActive) {
        return {
          success: false,
          error: 'USER_ALREADY_INACTIVE'
        };
      }

      // Update user status
      const { data: updatedUser, errors } = await client.models.User.update({
        id: userId,
        isActive: false,
        updatedAt: new Date().toISOString()
      });

      if (errors || !updatedUser) {
        return {
          success: false,
          error: 'DEACTIVATION_FAILED'
        };
      }

      // Create audit log
      const auditResult = await this.auditLogService.logUserManagement({
        action: 'USER_DEACTIVATED',
        performedBy,
        targetUserId: userId,
        ipAddress,
        userAgent,
        metadata: {
          reason: reason || 'User deactivated via admin panel',
          performerEmail: performer.email,
          targetUserEmail: targetUser.email,
          previousStatus: 'active'
        }
      });

      return {
        success: true,
        user: updatedUser as AuthUser,
        auditLog: auditResult.auditLog
      };

    } catch (error) {
      console.error('Error deactivating user:', error);
      return {
        success: false,
        error: 'DEACTIVATION_FAILED'
      };
    }
  }

  /**
   * Reactivate a user
   */
  async reactivateUser(
    userId: string,
    performedBy: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserActionResult> {
    try {
      // Check if performer has permission
      const { data: performer } = await client.models.User.get({ id: performedBy });
      if (!performer || !this.permissionService.hasPermission(performer.role, 'MANAGE_USERS' as any)) {
        return {
          success: false,
          error: 'INSUFFICIENT_PERMISSIONS'
        };
      }

      // Get the target user
      const { data: targetUser } = await client.models.User.get({ id: userId });
      if (!targetUser) {
        return {
          success: false,
          error: 'USER_NOT_FOUND'
        };
      }

      if (targetUser.isActive) {
        return {
          success: false,
          error: 'USER_ALREADY_ACTIVE'
        };
      }

      // Update user status
      const { data: updatedUser, errors } = await client.models.User.update({
        id: userId,
        isActive: true,
        updatedAt: new Date().toISOString()
      });

      if (errors || !updatedUser) {
        return {
          success: false,
          error: 'REACTIVATION_FAILED'
        };
      }

      // Create audit log
      const auditResult = await this.auditLogService.logUserManagement({
        action: 'USER_REACTIVATED',
        performedBy,
        targetUserId: userId,
        ipAddress,
        userAgent,
        metadata: {
          reason: reason || 'User reactivated via admin panel',
          performerEmail: performer.email,
          targetUserEmail: targetUser.email,
          previousStatus: 'inactive'
        }
      });

      return {
        success: true,
        user: updatedUser as AuthUser,
        auditLog: auditResult.auditLog
      };

    } catch (error) {
      console.error('Error reactivating user:', error);
      return {
        success: false,
        error: 'REACTIVATION_FAILED'
      };
    }
  }

  /**
   * Delete a user (soft or hard delete)
   */
  async deleteUser(
    userId: string,
    performedBy: string,
    hardDelete: boolean = false,
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserActionResult> {
    try {
      // Check if performer has permission
      const { data: performer } = await client.models.User.get({ id: performedBy });
      if (!performer || !this.permissionService.hasPermission(performer.role, 'MANAGE_USERS' as any)) {
        return {
          success: false,
          error: 'INSUFFICIENT_PERMISSIONS'
        };
      }

      // Get the target user
      const { data: targetUser } = await client.models.User.get({ id: userId });
      if (!targetUser) {
        return {
          success: false,
          error: 'USER_NOT_FOUND'
        };
      }

      let auditAction: 'USER_SOFT_DELETED' | 'USER_HARD_DELETED';
      let updatedUser: any;

      if (hardDelete) {
        // Hard delete - actually remove from database
        const { errors } = await client.models.User.delete({ id: userId });
        if (errors) {
          return {
            success: false,
            error: 'HARD_DELETE_FAILED'
          };
        }
        auditAction = 'USER_HARD_DELETED';
        updatedUser = null;
      } else {
        // Soft delete - mark as inactive and anonymize data
        const { data: softDeletedUser, errors } = await client.models.User.update({
          id: userId,
          isActive: false,
          email: `deleted_${userId}@deleted.local`,
          firstName: 'Deleted',
          lastName: 'User',
          updatedAt: new Date().toISOString()
        });

        if (errors || !softDeletedUser) {
          return {
            success: false,
            error: 'SOFT_DELETE_FAILED'
          };
        }

        auditAction = 'USER_SOFT_DELETED';
        updatedUser = softDeletedUser;
      }

      // Create audit log
      const auditResult = await this.auditLogService.logUserManagement({
        action: auditAction,
        performedBy,
        targetUserId: userId,
        ipAddress,
        userAgent,
        metadata: {
          reason: reason || `User ${hardDelete ? 'permanently deleted' : 'soft deleted'} via admin panel`,
          performerEmail: performer.email,
          targetUserEmail: targetUser.email,
          deletionType: hardDelete ? 'hard' : 'soft',
          originalData: hardDelete ? {
            email: targetUser.email,
            firstName: targetUser.firstName,
            lastName: targetUser.lastName,
            role: targetUser.role
          } : undefined
        }
      });

      return {
        success: true,
        user: updatedUser as AuthUser,
        auditLog: auditResult.auditLog
      };

    } catch (error) {
      console.error('Error deleting user:', error);
      return {
        success: false,
        error: 'DELETE_FAILED'
      };
    }
  }

  /**
   * Get user statistics for dashboard
   */
  async getUserStatistics(): Promise<UserStatistics> {
    try {
      const { data: allUsers } = await client.models.User.list();

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

      const stats: UserStatistics = {
        totalUsers: allUsers.length,
        activeUsers: allUsers.filter(u => u.isActive).length,
        inactiveUsers: allUsers.filter(u => !u.isActive).length,
        roleDistribution: {
          reader: allUsers.filter(u => u.role === 'reader').length,
          writer: allUsers.filter(u => u.role === 'writer').length,
          moderator: allUsers.filter(u => u.role === 'moderator').length,
        },
        recentSignups: allUsers.filter(u => 
          new Date(u.createdAt || '').getTime() > thirtyDaysAgo.getTime()
        ).length,
        lastUpdated: new Date().toISOString()
      };

      return stats;

    } catch (error) {
      console.error('Error getting user statistics:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        roleDistribution: { reader: 0, writer: 0, moderator: 0 },
        recentSignups: 0,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Get user by ID with full details
   */
  async getUserById(userId: string): Promise<{
    success: boolean;
    user?: AuthUser;
    error?: string;
  }> {
    try {
      const { data: user } = await client.models.User.get({ id: userId });
      
      if (!user) {
        return {
          success: false,
          error: 'USER_NOT_FOUND'
        };
      }

      return {
        success: true,
        user: user as AuthUser
      };

    } catch (error) {
      console.error('Error getting user by ID:', error);
      return {
        success: false,
        error: 'FETCH_USER_FAILED'
      };
    }
  }

  /**
   * Update user profile (admin version with extended permissions)
   */
  async updateUserProfile(
    userId: string,
    updates: Partial<Pick<AuthUser, 'firstName' | 'lastName' | 'email' | 'emailVerified'>>,
    performedBy: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserActionResult> {
    try {
      // Check if performer has permission
      const { data: performer } = await client.models.User.get({ id: performedBy });
      if (!performer || !this.permissionService.hasPermission(performer.role, 'MANAGE_USERS' as any)) {
        return {
          success: false,
          error: 'INSUFFICIENT_PERMISSIONS'
        };
      }

      // Get the target user
      const { data: targetUser } = await client.models.User.get({ id: userId });
      if (!targetUser) {
        return {
          success: false,
          error: 'USER_NOT_FOUND'
        };
      }

      // Update user
      const { data: updatedUser, errors } = await client.models.User.update({
        id: userId,
        ...updates,
        updatedAt: new Date().toISOString()
      });

      if (errors || !updatedUser) {
        return {
          success: false,
          error: 'UPDATE_FAILED'
        };
      }

      // Create audit log
      const auditResult = await this.auditLogService.logUserManagement({
        action: 'USER_UPDATED',
        performedBy,
        targetUserId: userId,
        ipAddress,
        userAgent,
        metadata: {
          reason: reason || 'Profile updated via admin panel',
          performerEmail: performer.email,
          targetUserEmail: targetUser.email,
          changes: updates,
          previousData: {
            firstName: targetUser.firstName,
            lastName: targetUser.lastName,
            email: targetUser.email,
            emailVerified: targetUser.emailVerified
          }
        }
      });

      return {
        success: true,
        user: updatedUser as AuthUser,
        auditLog: auditResult.auditLog
      };

    } catch (error) {
      console.error('Error updating user profile:', error);
      return {
        success: false,
        error: 'UPDATE_FAILED'
      };
    }
  }
}