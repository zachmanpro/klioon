import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import type { UserRole, AuthUser } from '@/types/user';
import type { AuditLog } from '@/types/audit';
import { PermissionService } from './PermissionService';
import { AuditLogService } from './AuditLogService';

const client = generateClient<Schema>();

export interface RoleAssignmentResult {
  success: boolean;
  user?: AuthUser;
  auditLog?: AuditLog;
  error?: string;
}

export interface BulkRoleAssignmentResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  auditLogs: AuditLog[];
  failures: Array<{
    userId: string;
    error: string;
  }>;
  error?: string;
}

export class RoleAssignmentService {
  private permissionService: PermissionService;
  private auditLogService: AuditLogService;

  constructor() {
    this.permissionService = new PermissionService();
    this.auditLogService = new AuditLogService();
  }

  /**
   * Assign a role to a user
   */
  async assignRole(
    userId: string,
    newRole: UserRole,
    performedBy: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<RoleAssignmentResult> {
    try {
      // Validate that the role is valid
      if (!this.permissionService.isValidRole(newRole)) {
        return {
          success: false,
          error: 'INVALID_ROLE'
        };
      }

      // Get the user performing the action
      const { data: performer } = await client.models.User.get({ id: performedBy });
      if (!performer) {
        return {
          success: false,
          error: 'PERFORMER_NOT_FOUND'
        };
      }

      // Check if performer has permission to assign roles
      if (!this.permissionService.canAssignRole(performer.role, newRole)) {
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

      // Check if user already has this role
      if (targetUser.role === newRole) {
        return {
          success: false,
          error: 'ROLE_ALREADY_ASSIGNED'
        };
      }

      const fromRole = targetUser.role;

      // Validate the role change
      const roleChangeValidation = this.permissionService.isValidRoleChange(fromRole, newRole);
      if (!roleChangeValidation.valid) {
        return {
          success: false,
          error: roleChangeValidation.reason || 'INVALID_ROLE_CHANGE'
        };
      }

      // Update the user's role
      const { data: updatedUser, errors } = await client.models.User.update({
        id: userId,
        role: newRole,
        updatedAt: new Date().toISOString()
      });

      if (errors || !updatedUser) {
        return {
          success: false,
          error: 'UPDATE_FAILED'
        };
      }

      // Create audit log
      const auditResult = await this.auditLogService.logRoleChange({
        performedBy,
        targetUserId: userId,
        fromRole,
        toRole: newRole,
        ipAddress,
        userAgent,
        metadata: {
          reason: reason || 'Role assignment via admin panel',
          performerEmail: performer.email,
          targetUserEmail: targetUser.email
        }
      });

      // Create UserRole assignment record
      await client.models.UserRole.create({
        userId,
        roleId: newRole, // Using role name as roleId for simplicity
        assignedBy: performedBy,
        assignedAt: new Date().toISOString(),
        reason: reason || 'Role assignment via admin panel',
        isActive: true
      });

      return {
        success: true,
        user: updatedUser as AuthUser,
        auditLog: auditResult.auditLog
      };

    } catch (error) {
      console.error('Error assigning role:', error);
      return {
        success: false,
        error: 'ASSIGNMENT_FAILED'
      };
    }
  }

  /**
   * Bulk assign roles to multiple users
   */
  async bulkAssignRoles(
    userIds: string[],
    newRole: UserRole,
    performedBy: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<BulkRoleAssignmentResult> {
    try {
      // Check if performer has permission to assign roles
      const { data: performer } = await client.models.User.get({ id: performedBy });
      if (!performer || !this.permissionService.canAssignRole(performer.role, newRole)) {
        return {
          success: false,
          successCount: 0,
          failureCount: userIds.length,
          auditLogs: [],
          failures: userIds.map(userId => ({
            userId,
            error: 'INSUFFICIENT_PERMISSIONS'
          })),
          error: 'INSUFFICIENT_PERMISSIONS'
        };
      }

      const results = {
        success: true,
        successCount: 0,
        failureCount: 0,
        auditLogs: [] as AuditLog[],
        failures: [] as Array<{ userId: string; error: string }>
      };

      // Process each user
      for (const userId of userIds) {
        const result = await this.assignRole(
          userId,
          newRole,
          performedBy,
          reason,
          ipAddress,
          userAgent
        );

        if (result.success) {
          results.successCount++;
          if (result.auditLog) {
            results.auditLogs.push(result.auditLog);
          }
        } else {
          results.failureCount++;
          results.failures.push({
            userId,
            error: result.error || 'UNKNOWN_ERROR'
          });
        }
      }

      // If any failures occurred, mark overall operation as failed
      if (results.failureCount > 0) {
        results.success = false;
      }

      // Create bulk operation audit log
      await this.auditLogService.logUserManagement({
        action: 'BULK_OPERATION',
        performedBy,
        targetUserId: userIds.join(','), // Store as comma-separated list
        ipAddress,
        userAgent,
        metadata: {
          operation: 'bulk_role_assignment',
          targetRole: newRole,
          totalUsers: userIds.length,
          successCount: results.successCount,
          failureCount: results.failureCount,
          reason
        }
      });

      return results;

    } catch (error) {
      console.error('Error in bulk role assignment:', error);
      return {
        success: false,
        successCount: 0,
        failureCount: userIds.length,
        auditLogs: [],
        failures: userIds.map(userId => ({
          userId,
          error: 'BULK_ASSIGNMENT_FAILED'
        })),
        error: 'BULK_ASSIGNMENT_FAILED'
      };
    }
  }

  /**
   * Revoke a role from a user (reset to default reader role)
   */
  async revokeRole(
    userId: string,
    performedBy: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<RoleAssignmentResult> {
    // For role revocation, we reset to reader role
    return this.assignRole(userId, 'reader', performedBy, reason, ipAddress, userAgent);
  }

  /**
   * Get role assignment history for a user
   */
  async getRoleHistory(userId: string): Promise<{
    success: boolean;
    history: Array<{
      fromRole: UserRole;
      toRole: UserRole;
      assignedBy: string;
      assignedAt: string;
      reason?: string;
      isActive: boolean;
    }>;
    error?: string;
  }> {
    try {
      const { data: roleAssignments } = await client.models.UserRole.list({
        filter: { userId: { eq: userId } }
      });

      const history = roleAssignments.map(assignment => ({
        fromRole: 'reader' as UserRole, // Default assumption
        toRole: assignment.roleId as UserRole,
        assignedBy: assignment.assignedBy,
        assignedAt: assignment.assignedAt,
        reason: assignment.reason,
        isActive: assignment.isActive
      }));

      // Sort by date, most recent first
      history.sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());

      return {
        success: true,
        history
      };

    } catch (error) {
      console.error('Error getting role history:', error);
      return {
        success: false,
        history: [],
        error: 'FETCH_HISTORY_FAILED'
      };
    }
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: UserRole): Promise<{
    success: boolean;
    users: AuthUser[];
    error?: string;
  }> {
    try {
      const { data: users } = await client.models.User.list({
        filter: { role: { eq: role } }
      });

      return {
        success: true,
        users: users as AuthUser[]
      };

    } catch (error) {
      console.error('Error getting users by role:', error);
      return {
        success: false,
        users: [],
        error: 'FETCH_USERS_FAILED'
      };
    }
  }

  /**
   * Check if a role assignment is temporary and handle expiration
   */
  async checkTemporaryRoleExpiration(userId: string): Promise<{
    success: boolean;
    expired: boolean;
    newRole?: UserRole;
    error?: string;
  }> {
    try {
      const { data: activeAssignments } = await client.models.UserRole.list({
        filter: {
          userId: { eq: userId },
          isActive: { eq: true },
          expiresAt: { lt: new Date().toISOString() }
        }
      });

      if (activeAssignments.length === 0) {
        return {
          success: true,
          expired: false
        };
      }

      // Expire the temporary role assignment
      for (const assignment of activeAssignments) {
        await client.models.UserRole.update({
          id: assignment.id,
          isActive: false
        });
      }

      // Reset user to default reader role
      const { data: user } = await client.models.User.get({ id: userId });
      if (user) {
        await client.models.User.update({
          id: userId,
          role: 'reader'
        });

        // Log the expiration
        await this.auditLogService.logRoleChange({
          performedBy: 'SYSTEM',
          targetUserId: userId,
          fromRole: user.role,
          toRole: 'reader',
          metadata: {
            reason: 'Temporary role expired',
            expiredAssignments: activeAssignments.map(a => a.id)
          }
        });
      }

      return {
        success: true,
        expired: true,
        newRole: 'reader'
      };

    } catch (error) {
      console.error('Error checking role expiration:', error);
      return {
        success: false,
        expired: false,
        error: 'EXPIRATION_CHECK_FAILED'
      };
    }
  }

  /**
   * Assign a temporary role with expiration
   */
  async assignTemporaryRole(
    userId: string,
    newRole: UserRole,
    expiresAt: string,
    performedBy: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<RoleAssignmentResult> {
    try {
      // First assign the role normally
      const assignmentResult = await this.assignRole(
        userId, 
        newRole, 
        performedBy, 
        reason, 
        ipAddress, 
        userAgent
      );

      if (!assignmentResult.success) {
        return assignmentResult;
      }

      // Update the UserRole record with expiration
      const { data: roleAssignments } = await client.models.UserRole.list({
        filter: {
          userId: { eq: userId },
          isActive: { eq: true }
        }
      });

      if (roleAssignments.length > 0) {
        const latestAssignment = roleAssignments[roleAssignments.length - 1];
        await client.models.UserRole.update({
          id: latestAssignment.id,
          expiresAt
        });
      }

      return assignmentResult;

    } catch (error) {
      console.error('Error assigning temporary role:', error);
      return {
        success: false,
        error: 'TEMPORARY_ASSIGNMENT_FAILED'
      };
    }
  }
}