import { UserRole, UserPermission, ROLE_PERMISSIONS } from '@/types/user';

export class PermissionService {
  /**
   * Check if a user role has a specific permission
   */
  hasPermission(role: UserRole, permission: UserPermission): boolean {
    const rolePermissions = ROLE_PERMISSIONS[role];
    return rolePermissions.includes(permission);
  }

  /**
   * Check if a user role has any of the specified permissions
   */
  hasAnyPermission(role: UserRole, permissions: UserPermission[]): boolean {
    return permissions.some(permission => this.hasPermission(role, permission));
  }

  /**
   * Check if a user role has all of the specified permissions
   */
  hasAllPermissions(role: UserRole, permissions: UserPermission[]): boolean {
    return permissions.every(permission => this.hasPermission(role, permission));
  }

  /**
   * Get all permissions for a specific role
   */
  getPermissionsForRole(role: UserRole): UserPermission[] {
    return ROLE_PERMISSIONS[role];
  }

  /**
   * Get all available permissions in the system
   */
  getAllPermissions(): UserPermission[] {
    return Object.values(UserPermission);
  }

  /**
   * Get all available roles in the system
   */
  getAllRoles(): UserRole[] {
    return Object.keys(ROLE_PERMISSIONS) as UserRole[];
  }

  /**
   * Check if a role can perform an action on a resource
   */
  canPerformAction(
    role: UserRole, 
    resource: string, 
    action: string,
    targetUserId?: string,
    currentUserId?: string
  ): boolean {
    // Get role permissions
    const permissions = this.getPermissionsForRole(role);

    // Define resource-action permission mappings
    const resourceActionMap: Record<string, Record<string, UserPermission[]>> = {
      stories: {
        read: [UserPermission.READ_STORIES],
        create: [UserPermission.WRITE_STORIES],
        update: [UserPermission.EDIT_STORIES, UserPermission.WRITE_STORIES],
        delete: [UserPermission.DELETE_STORIES],
        moderate: [UserPermission.MODERATE_CONTENT],
      },
      users: {
        read: [UserPermission.MANAGE_USERS, UserPermission.ADMIN_ACCESS],
        update: [UserPermission.MANAGE_USERS],
        delete: [UserPermission.MANAGE_USERS, UserPermission.ADMIN_ACCESS],
        deactivate: [UserPermission.MANAGE_USERS],
        assign_role: [UserPermission.MANAGE_USERS, UserPermission.ADMIN_ACCESS],
      },
      profile: {
        read: [UserPermission.READ_STORIES], // Basic permission for own profile
        update_own: [UserPermission.READ_STORIES], // Can update own profile
        update: [UserPermission.MANAGE_USERS], // Can update other profiles
      },
      comments: {
        read: [UserPermission.READ_STORIES],
        create: [UserPermission.READ_STORIES],
        update: [UserPermission.EDIT_STORIES, UserPermission.MODERATE_CONTENT],
        delete: [UserPermission.MODERATE_CONTENT],
        moderate: [UserPermission.MODERATE_CONTENT],
      },
      admin: {
        access: [UserPermission.ADMIN_ACCESS],
        manage_roles: [UserPermission.ADMIN_ACCESS],
        view_audit_logs: [UserPermission.ADMIN_ACCESS],
      },
    };

    const resourceActions = resourceActionMap[resource];
    if (!resourceActions) {
      return false;
    }

    const requiredPermissions = resourceActions[action];
    if (!requiredPermissions) {
      return false;
    }

    // Check if user has any of the required permissions
    const hasPermission = requiredPermissions.some(permission => 
      permissions.includes(permission)
    );

    // Special case: allow users to read/update their own profile
    if (resource === 'profile' && (action === 'read' || action === 'update_own')) {
      if (targetUserId && currentUserId && targetUserId === currentUserId) {
        return true;
      }
    }

    // Special case: allow users to edit their own stories
    if (resource === 'stories' && action === 'update') {
      if (targetUserId && currentUserId && targetUserId === currentUserId) {
        return this.hasPermission(role, UserPermission.WRITE_STORIES);
      }
    }

    return hasPermission;
  }

  /**
   * Check if a role is higher than another role in the hierarchy
   */
  isRoleHigherThan(role1: UserRole, role2: UserRole): boolean {
    const roleHierarchy: Record<UserRole, number> = {
      reader: 1,
      writer: 2,
      moderator: 3,
    };

    return roleHierarchy[role1] > roleHierarchy[role2];
  }

  /**
   * Check if a role can assign another role
   */
  canAssignRole(currentRole: UserRole, targetRole: UserRole): boolean {
    // Only moderators can assign roles
    if (!this.hasPermission(currentRole, UserPermission.MANAGE_USERS)) {
      return false;
    }

    // Moderators can assign any role except their own role to other moderators
    // (to prevent privilege escalation)
    if (currentRole === 'moderator' && targetRole === 'moderator') {
      return false;
    }

    return true;
  }

  /**
   * Get effective permissions for a user considering their role and any custom permissions
   */
  getEffectivePermissions(
    role: UserRole, 
    customPermissions: UserPermission[] = []
  ): UserPermission[] {
    const rolePermissions = this.getPermissionsForRole(role);
    const allPermissions = [...rolePermissions, ...customPermissions];
    
    // Remove duplicates
    return Array.from(new Set(allPermissions));
  }

  /**
   * Validate if a permission exists in the system
   */
  isValidPermission(permission: string): permission is UserPermission {
    return Object.values(UserPermission).includes(permission as UserPermission);
  }

  /**
   * Validate if a role exists in the system
   */
  isValidRole(role: string): role is UserRole {
    return Object.keys(ROLE_PERMISSIONS).includes(role);
  }

  /**
   * Get permission differences between two roles
   */
  getPermissionDifferences(fromRole: UserRole, toRole: UserRole): {
    added: UserPermission[];
    removed: UserPermission[];
    unchanged: UserPermission[];
  } {
    const fromPermissions = this.getPermissionsForRole(fromRole);
    const toPermissions = this.getPermissionsForRole(toRole);

    const added = toPermissions.filter(p => !fromPermissions.includes(p));
    const removed = fromPermissions.filter(p => !toPermissions.includes(p));
    const unchanged = fromPermissions.filter(p => toPermissions.includes(p));

    return { added, removed, unchanged };
  }

  /**
   * Check if a role change is valid (business logic validation)
   */
  isValidRoleChange(fromRole: UserRole, toRole: UserRole): {
    valid: boolean;
    reason?: string;
  } {
    if (fromRole === toRole) {
      return {
        valid: false,
        reason: 'Cannot assign the same role that user already has'
      };
    }

    // Business rule: Direct promotion from reader to moderator might need approval
    if (fromRole === 'reader' && toRole === 'moderator') {
      return {
        valid: true,
        reason: 'Direct promotion from reader to moderator - ensure proper authorization'
      };
    }

    return { valid: true };
  }

  /**
   * Get role display information
   */
  getRoleDisplayInfo(role: UserRole): {
    name: string;
    description: string;
    color: string;
    icon: string;
  } {
    const roleInfo: Record<UserRole, {
      name: string;
      description: string;
      color: string;
      icon: string;
    }> = {
      reader: {
        name: 'Reader',
        description: 'Can read stories and comments',
        color: 'bg-blue-100 text-blue-800',
        icon: '👁️'
      },
      writer: {
        name: 'Writer',
        description: 'Can read, write, and edit stories',
        color: 'bg-green-100 text-green-800',
        icon: '✍️'
      },
      moderator: {
        name: 'Moderator',
        description: 'Full access to manage users and content',
        color: 'bg-purple-100 text-purple-800',
        icon: '🛡️'
      }
    };

    return roleInfo[role];
  }
}