import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/*== USER AUTHENTICATION SCHEMA ==========================================
This schema defines the User model for the BIGZ collaborative storytelling 
platform with role-based access control. Users can have roles of reader, 
writer, or moderator with appropriate permissions for each role.
=========================================================================*/
const schema = a.schema({
  User: a
    .model({
      email: a.string().required(),
      firstName: a.string().required(),
      lastName: a.string().required(),
      passwordHash: a.string(), // Hashed password for authentication
      role: a.enum(['reader', 'writer', 'moderator']),
      emailVerified: a.boolean().default(false),
      profilePicture: a.string(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      lastLoginAt: a.datetime(),
      isActive: a.boolean().default(true),
    })
    .authorization((allow) => [
      // Users can read their own data
      allow.owner(),
      // Moderators can read and update all users
      allow.group('moderators').to(['read', 'update']),
      // Writers can read other users (for collaboration)
      allow.group('writers').to(['read']),
      // Readers can only read their own data
      allow.group('readers').to(['read']),
    ]),
  
  Role: a
    .model({
      name: a.string().required(),
      description: a.string(),
      permissions: a.string().array(), // JSON array of permissions
      isSystemRole: a.boolean().default(false),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      createdBy: a.string(), // User ID who created this role
    })
    .authorization((allow) => [
      // Only moderators can manage roles
      allow.group('moderators'),
      // All authenticated users can read roles
      allow.authenticated().to(['read']),
    ]),

  AuditLog: a
    .model({
      action: a.enum([
        'ROLE_ASSIGNED',
        'ROLE_REVOKED', 
        'PERMISSION_GRANTED',
        'PERMISSION_REVOKED',
        'USER_CREATED',
        'USER_UPDATED',
        'USER_DELETED',
        'USER_DEACTIVATED',
        'USER_REACTIVATED',
        'USER_SOFT_DELETED',
        'USER_HARD_DELETED',
        'LOGIN_SUCCESS',
        'LOGIN_FAILED',
        'LOGOUT',
        'PASSWORD_RESET',
        'EMAIL_VERIFIED',
        'PROFILE_UPDATED',
        'BULK_OPERATION',
        'ADMIN_ACCESS',
        'SECURITY_VIOLATION'
      ]).required(),
      performedBy: a.string().required(), // User ID who performed the action
      targetUserId: a.string(), // User ID who was affected by the action
      fromRole: a.enum(['reader', 'writer', 'moderator']), // Previous role (for role changes)
      toRole: a.enum(['reader', 'writer', 'moderator']), // New role (for role changes)
      timestamp: a.datetime().required(),
      ipAddress: a.string(),
      userAgent: a.string(),
      metadata: a.json(), // Additional context data
      success: a.boolean().default(true),
      errorMessage: a.string(),
    })
    .authorization((allow) => [
      // Only moderators can read audit logs
      allow.group('moderators').to(['read']),
      // System can create audit logs
      allow.authenticated().to(['create']),
    ]),

  UserRole: a
    .model({
      userId: a.string().required(),
      roleId: a.string().required(),
      assignedBy: a.string().required(), // User ID who assigned this role
      assignedAt: a.datetime().required(),
      expiresAt: a.datetime(), // Optional expiration date for temporary roles
      isActive: a.boolean().default(true),
      reason: a.string(), // Reason for role assignment
    })
    .authorization((allow) => [
      // Only moderators can manage user roles
      allow.group('moderators'),
      // Users can read their own role assignments
      allow.owner().to(['read']),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'identityPool',
  },
});

/*== USAGE EXAMPLES =======================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your models. (THIS SNIPPET WILL 
ONLY WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests

// Create a new user
await client.models.User.create({
  email: "user@example.com",
  firstName: "John",
  lastName: "Doe",
  role: "reader"
});

// Get current user profile
const { data: currentUser } = await client.models.User.get({ id: userId });

// Update user role (moderators only)
await client.models.User.update({
  id: userId,
  role: "writer"
});

// List all users (with role-based permissions)
const { data: users } = await client.models.User.list();

// Create audit log entry
await client.models.AuditLog.create({
  action: "ROLE_ASSIGNED",
  performedBy: moderatorId,
  targetUserId: userId,
  fromRole: "reader",
  toRole: "writer",
  timestamp: new Date().toISOString(),
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0..."
});

// Get audit logs for a user
const { data: auditLogs } = await client.models.AuditLog.list({
  filter: { targetUserId: { eq: userId } }
});

// Create custom role
await client.models.Role.create({
  name: "content_editor",
  description: "Can edit and moderate content",
  permissions: ["READ_STORIES", "EDIT_STORIES", "MODERATE_CONTENT"],
  isSystemRole: false,
  createdBy: moderatorId
});

// Assign role to user
await client.models.UserRole.create({
  userId: userId,
  roleId: roleId,
  assignedBy: moderatorId,
  assignedAt: new Date().toISOString(),
  reason: "Promotion for good performance"
});
*/
