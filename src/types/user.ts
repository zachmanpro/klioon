import type { Schema } from '@/amplify/data/resource';

// User types from Amplify DataStore schema
export type User = Schema['User']['type'];
export type UserRole = Schema['User']['type']['role'];
export type CreateUserInput = Schema['User']['createType'];
export type UpdateUserInput = Schema['User']['updateType'];

// Role types from Amplify DataStore schema
export type Role = Schema['Role']['type'];
export type CreateRoleInput = Schema['Role']['createType'];
export type UpdateRoleInput = Schema['Role']['updateType'];

// Custom user types for authentication flow
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  emailVerified: boolean;
  profilePicture?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

// Registration form types
export interface RegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

// Login form types
export interface LoginData {
  email: string;
  password: string;
}

// User profile update types
export interface UserProfileUpdate {
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
}

// User permissions enum
export enum UserPermission {
  READ_STORIES = 'read_stories',
  WRITE_STORIES = 'write_stories',
  EDIT_STORIES = 'edit_stories',
  DELETE_STORIES = 'delete_stories',
  MANAGE_USERS = 'manage_users',
  MODERATE_CONTENT = 'moderate_content',
  ADMIN_ACCESS = 'admin_access',
}

// Role permission mappings
export const ROLE_PERMISSIONS: Record<UserRole, UserPermission[]> = {
  reader: [UserPermission.READ_STORIES],
  writer: [
    UserPermission.READ_STORIES,
    UserPermission.WRITE_STORIES,
    UserPermission.EDIT_STORIES,
  ],
  moderator: [
    UserPermission.READ_STORIES,
    UserPermission.WRITE_STORIES,
    UserPermission.EDIT_STORIES,
    UserPermission.DELETE_STORIES,
    UserPermission.MANAGE_USERS,
    UserPermission.MODERATE_CONTENT,
    UserPermission.ADMIN_ACCESS,
  ],
};

// User status types
export interface UserStatus {
  isOnline: boolean;
  lastSeen: string;
  currentActivity?: 'reading' | 'writing' | 'moderating';
}

// User statistics types
export interface UserStats {
  storiesRead: number;
  storiesWritten: number;
  contributionsCount: number;
  joinedDate: string;
  lastActiveDate: string;
}