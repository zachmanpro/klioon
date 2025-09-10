# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-09-10-user-auth-system/spec.md

> Created: 2025-09-10
> Version: 1.0.0

## Schema Changes

### AWS Amplify DataStore GraphQL Schema

```graphql
type User @model @auth(rules: [
  { allow: owner, operations: [read, update] },
  { allow: groups, groups: ["moderator"], operations: [read, update, delete] }
]) {
  id: ID!
  email: AWSEmail! @index(name: "byEmail", queryField: "getUserByEmail")
  emailVerified: Boolean! @default(value: "false")
  emailVerificationToken: String
  emailVerificationExpires: AWSDateTime
  passwordHash: String!
  lastLoginAt: AWSDateTime
  loginAttempts: Int @default(value: "0")
  lockoutUntil: AWSDateTime
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
  profile: UserProfile @hasOne
  userRoles: [UserRole] @hasMany(indexName: "byUser", fields: ["id"])
}

type UserProfile @model @auth(rules: [
  { allow: owner, operations: [read, update] },
  { allow: public, operations: [read] },
  { allow: groups, groups: ["moderator"], operations: [read, update, delete] }
]) {
  id: ID!
  userId: ID! @index(name: "byUser")
  displayName: String!
  avatar: AWSURL
  bio: String
  preferences: AWSJSON
  isActive: Boolean! @default(value: "true")
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
  user: User @belongsTo(fields: ["userId"])
}

type Role @model @auth(rules: [
  { allow: public, operations: [read] },
  { allow: groups, groups: ["moderator"], operations: [create, read, update, delete] }
]) {
  id: ID!
  name: String! @index(name: "byName", queryField: "getRoleByName")
  description: String
  permissions: [String!]!
  isActive: Boolean! @default(value: "true")
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
  userRoles: [UserRole] @hasMany(indexName: "byRole", fields: ["id"])
}

type UserRole @model @auth(rules: [
  { allow: owner, operations: [read] },
  { allow: groups, groups: ["moderator"], operations: [create, read, update, delete] }
]) {
  id: ID!
  userId: ID! @index(name: "byUser")
  roleId: ID! @index(name: "byRole")
  assignedAt: AWSDateTime!
  assignedBy: ID!
  expiresAt: AWSDateTime
  isActive: Boolean! @default(value: "true")
  user: User @belongsTo(fields: ["userId"])
  role: Role @belongsTo(fields: ["roleId"])
}
```

### DynamoDB Table Structures

#### User Table
- **Primary Key**: `id` (String)
- **Global Secondary Index**: `byEmail` on `email` field
- **Attributes**:
  - `email` (String, unique, required)
  - `emailVerified` (Boolean, default: false)
  - `emailVerificationToken` (String, nullable)
  - `emailVerificationExpires` (DateTime, nullable)
  - `passwordHash` (String, required)
  - `lastLoginAt` (DateTime, nullable)
  - `loginAttempts` (Number, default: 0)
  - `lockoutUntil` (DateTime, nullable)
  - `createdAt` (DateTime, auto-generated)
  - `updatedAt` (DateTime, auto-generated)

#### UserProfile Table
- **Primary Key**: `id` (String)
- **Global Secondary Index**: `byUser` on `userId` field
- **Attributes**:
  - `userId` (String, foreign key to User.id)
  - `displayName` (String, required)
  - `avatar` (String, URL format)
  - `bio` (String, nullable)
  - `preferences` (JSON, nullable)
  - `isActive` (Boolean, default: true)
  - `createdAt` (DateTime, auto-generated)
  - `updatedAt` (DateTime, auto-generated)

#### Role Table
- **Primary Key**: `id` (String)
- **Global Secondary Index**: `byName` on `name` field
- **Attributes**:
  - `name` (String, unique, required)
  - `description` (String, nullable)
  - `permissions` (List of Strings, required)
  - `isActive` (Boolean, default: true)
  - `createdAt` (DateTime, auto-generated)
  - `updatedAt` (DateTime, auto-generated)

#### UserRole Table
- **Primary Key**: `id` (String)
- **Global Secondary Index**: `byUser` on `userId` field
- **Global Secondary Index**: `byRole` on `roleId` field
- **Attributes**:
  - `userId` (String, foreign key to User.id)
  - `roleId` (String, foreign key to Role.id)
  - `assignedAt` (DateTime, required)
  - `assignedBy` (String, user ID who assigned the role)
  - `expiresAt` (DateTime, nullable)
  - `isActive` (Boolean, default: true)

### Data Access Patterns

#### Authentication Flows
1. **Login by Email**: Query `byEmail` GSI on User table
2. **User Profile Lookup**: Query `byUser` GSI on UserProfile table
3. **Role Verification**: Query `byUser` GSI on UserRole table, then fetch Role details

#### Performance Considerations
- Email lookup optimized with dedicated GSI for login flows
- User profile data separated for efficient public read access
- Role assignments indexed for quick permission checks
- Compound queries minimized through proper data modeling

### Field Rationales

#### User Model Fields
- **email**: Primary identifier for authentication, indexed for fast lookup
- **emailVerified**: Security requirement for email-based authentication
- **emailVerificationToken/Expires**: Support email verification workflow
- **passwordHash**: Secure password storage (never store plain text)
- **lastLoginAt**: Audit trail and user activity tracking
- **loginAttempts/lockoutUntil**: Brute force protection mechanism

#### UserProfile Model Fields
- **displayName**: Public-facing user identifier for collaboration
- **avatar**: Visual representation for user interface
- **bio**: User self-description for community building
- **preferences**: Flexible JSON storage for UI/UX customization
- **isActive**: Soft delete capability for user management

#### Role Model Fields
- **name**: Human-readable role identifier (reader, writer, moderator)
- **permissions**: Granular permission list for authorization logic
- **isActive**: Enable/disable roles without deletion

#### UserRole Model Fields
- **assignedAt/assignedBy**: Audit trail for role assignments
- **expiresAt**: Support temporary role assignments
- **isActive**: Enable role suspension without deletion

### Security Constraints
- Owner-level access for user's own data
- Public read access for user profiles (collaboration requirement)
- Moderator group has elevated permissions for user management
- No direct password field exposure in any public operations

## Migrations

### Initial Data Seeding

```javascript
// Default roles to be created on system initialization
const defaultRoles = [
  {
    name: "reader",
    description: "Can read stories and leave comments",
    permissions: ["read:stories", "create:comments", "read:comments"]
  },
  {
    name: "writer", 
    description: "Can create and edit stories, moderate own content",
    permissions: [
      "read:stories", "create:stories", "update:own-stories", 
      "create:comments", "read:comments", "moderate:own-comments"
    ]
  },
  {
    name: "moderator",
    description: "Full content moderation and user management",
    permissions: [
      "read:stories", "create:stories", "update:stories", "delete:stories",
      "read:comments", "create:comments", "update:comments", "delete:comments",
      "read:users", "update:users", "manage:roles"
    ]
  }
];
```

### Data Integrity Rules
1. **Email Uniqueness**: Enforced at application and database level
2. **Profile Relationship**: Each User must have exactly one UserProfile
3. **Role Assignment**: Users can have multiple roles simultaneously
4. **Cascade Deletion**: User deletion should cascade to UserProfile and UserRole records
5. **Password Security**: Minimum 8 characters, hashed with bcrypt (cost factor 12)

### Index Performance Notes
- `byEmail` GSI enables O(1) user lookup during login
- `byUser` GSI on UserProfile enables efficient profile fetching
- `byUser` and `byRole` GSIs on UserRole support both user→roles and role→users queries
- `byName` GSI on Role enables role lookup by name for assignment operations