import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import type { AuthUser, CreateUserInput, UpdateUserInput, UserRole } from '@/types/user';

// Generate the Amplify DataStore client
export const amplifyClient = generateClient<Schema>();

// User management utilities
export class UserService {
  /**
   * Create a new user in the DataStore
   */
  static async createUser(userData: CreateUserInput): Promise<AuthUser | null> {
    try {
      const result = await amplifyClient.models.User.create({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        emailVerified: userData.emailVerified || false,
        profilePicture: userData.profilePicture,
        isActive: userData.isActive !== undefined ? userData.isActive : true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return result.data as AuthUser;
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: string): Promise<AuthUser | null> {
    try {
      const result = await amplifyClient.models.User.get({ id });
      return result.data as AuthUser;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<AuthUser | null> {
    try {
      const result = await amplifyClient.models.User.list({
        filter: { email: { eq: email } },
      });
      
      const user = result.data?.[0];
      return user ? (user as AuthUser) : null;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  static async updateUser(id: string, updates: UpdateUserInput): Promise<AuthUser | null> {
    try {
      const result = await amplifyClient.models.User.update({
        id,
        ...updates,
        updatedAt: new Date().toISOString(),
      });

      return result.data as AuthUser;
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  }

  /**
   * Update user's last login time
   */
  static async updateLastLogin(id: string): Promise<void> {
    try {
      await amplifyClient.models.User.update({
        id,
        lastLoginAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  /**
   * Verify user email
   */
  static async verifyEmail(id: string): Promise<boolean> {
    try {
      await amplifyClient.models.User.update({
        id,
        emailVerified: true,
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      console.error('Error verifying email:', error);
      return false;
    }
  }

  /**
   * Update user role (moderators only)
   */
  static async updateUserRole(userId: string, newRole: UserRole): Promise<boolean> {
    try {
      await amplifyClient.models.User.update({
        id: userId,
        role: newRole,
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      console.error('Error updating user role:', error);
      return false;
    }
  }

  /**
   * Deactivate user account
   */
  static async deactivateUser(id: string): Promise<boolean> {
    try {
      await amplifyClient.models.User.update({
        id,
        isActive: false,
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      console.error('Error deactivating user:', error);
      return false;
    }
  }

  /**
   * List all users (with pagination)
   */
  static async listUsers(limit = 20, nextToken?: string): Promise<{
    users: AuthUser[];
    nextToken?: string;
  }> {
    try {
      const result = await amplifyClient.models.User.list({
        limit,
        nextToken,
      });

      return {
        users: result.data as AuthUser[],
        nextToken: result.nextToken,
      };
    } catch (error) {
      console.error('Error listing users:', error);
      return { users: [] };
    }
  }

  /**
   * Search users by name or email
   */
  static async searchUsers(query: string): Promise<AuthUser[]> {
    try {
      const [emailResult, firstNameResult, lastNameResult] = await Promise.all([
        amplifyClient.models.User.list({
          filter: { email: { contains: query } },
        }),
        amplifyClient.models.User.list({
          filter: { firstName: { contains: query } },
        }),
        amplifyClient.models.User.list({
          filter: { lastName: { contains: query } },
        }),
      ]);

      // Combine and deduplicate results
      const allUsers = [
        ...emailResult.data,
        ...firstNameResult.data,
        ...lastNameResult.data,
      ];

      const uniqueUsers = allUsers.filter(
        (user, index, array) => array.findIndex(u => u.id === user.id) === index
      );

      return uniqueUsers as AuthUser[];
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  /**
   * Get users by role
   */
  static async getUsersByRole(role: UserRole): Promise<AuthUser[]> {
    try {
      const result = await amplifyClient.models.User.list({
        filter: { role: { eq: role } },
      });

      return result.data as AuthUser[];
    } catch (error) {
      console.error('Error fetching users by role:', error);
      return [];
    }
  }
}

// Role management utilities
export class RoleService {
  /**
   * Get all available roles
   */
  static async getRoles() {
    try {
      const result = await amplifyClient.models.Role.list();
      return result.data;
    } catch (error) {
      console.error('Error fetching roles:', error);
      return [];
    }
  }

  /**
   * Create a new role
   */
  static async createRole(name: string, description: string, permissions: string[]) {
    try {
      const result = await amplifyClient.models.Role.create({
        name,
        description,
        permissions,
        isSystemRole: false,
      });
      
      return result.data;
    } catch (error) {
      console.error('Error creating role:', error);
      return null;
    }
  }
}