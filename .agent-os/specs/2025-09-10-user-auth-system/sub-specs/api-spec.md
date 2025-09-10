# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-09-10-user-auth-system/spec.md

> Created: 2025-09-10
> Version: 1.0.0

## Overview

The User Authentication System API provides endpoints for user registration, authentication, profile management, and role-based access control within the collaborative storytelling platform. All endpoints integrate with NextAuth.js for session management and AWS Amplify DataStore for data persistence.

## Authentication & Authorization

All protected endpoints require a valid NextAuth.js session token passed via:
- Cookie: `next-auth.session-token` (default)
- Header: `Authorization: Bearer <token>` (for API clients)

### Permission Levels
- **Public**: No authentication required
- **Authenticated**: Valid session required
- **Moderator**: User must have moderator role
- **Owner**: User must own the resource or be a moderator

## Authentication Routes

### POST /api/auth/register

**Description**: Register a new user account with email validation

**Authentication**: Public

**Request Body**:
```json
{
  "email": "string (required, valid email)",
  "password": "string (required, min 8 chars)",
  "username": "string (required, 3-30 chars, alphanumeric + underscore)",
  "firstName": "string (optional)",
  "lastName": "string (optional)"
}
```

**Response - Success (201)**:
```json
{
  "success": true,
  "message": "Registration successful. Please check your email for verification.",
  "user": {
    "id": "string",
    "email": "string",
    "username": "string",
    "emailVerified": false,
    "createdAt": "ISO8601 string"
  }
}
```

**Response - Error (400)**:
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Invalid input data",
  "details": {
    "email": ["Email already exists"],
    "password": ["Password must be at least 8 characters"]
  }
}
```

**Error Codes**:
- `400`: Validation errors, email already exists
- `429`: Rate limit exceeded (5 attempts per hour per IP)
- `500`: Server error

---

### POST /api/auth/login

**Description**: Authenticate user with email and password

**Authentication**: Public

**Request Body**:
```json
{
  "email": "string (required)",
  "password": "string (required)",
  "rememberMe": "boolean (optional, default: false)"
}
```

**Response - Success (200)**:
```json
{
  "success": true,
  "user": {
    "id": "string",
    "email": "string",
    "username": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "string",
    "emailVerified": "boolean",
    "lastLoginAt": "ISO8601 string"
  },
  "session": {
    "expires": "ISO8601 string"
  }
}
```

**Response - Error (401)**:
```json
{
  "success": false,
  "error": "INVALID_CREDENTIALS",
  "message": "Invalid email or password"
}
```

**Error Codes**:
- `400`: Missing required fields
- `401`: Invalid credentials, account locked, email not verified
- `429`: Rate limit exceeded (10 attempts per hour per IP)
- `500`: Server error

---

### POST /api/auth/logout

**Description**: Terminate current user session

**Authentication**: Authenticated

**Request Body**: None

**Response - Success (200)**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Error Codes**:
- `401`: No active session
- `500`: Server error

---

### GET /api/auth/session

**Description**: Get current user session information

**Authentication**: Authenticated

**Query Parameters**: None

**Response - Success (200)**:
```json
{
  "success": true,
  "user": {
    "id": "string",
    "email": "string",
    "username": "string",
    "firstName": "string",
    "lastName": "string",
    "role": "string",
    "emailVerified": "boolean",
    "createdAt": "ISO8601 string",
    "lastLoginAt": "ISO8601 string"
  },
  "session": {
    "expires": "ISO8601 string"
  }
}
```

**Response - Error (401)**:
```json
{
  "success": false,
  "error": "NO_SESSION",
  "message": "No active session found"
}
```

## User Management Routes

### GET /api/users/profile

**Description**: Get current user's complete profile

**Authentication**: Authenticated

**Query Parameters**: None

**Response - Success (200)**:
```json
{
  "success": true,
  "user": {
    "id": "string",
    "email": "string",
    "username": "string",
    "firstName": "string",
    "lastName": "string",
    "bio": "string",
    "avatar": "string (URL)",
    "role": "string",
    "permissions": ["string"],
    "emailVerified": "boolean",
    "createdAt": "ISO8601 string",
    "updatedAt": "ISO8601 string",
    "stats": {
      "storiesCreated": "number",
      "collaborationsJoined": "number",
      "chaptersWritten": "number"
    }
  }
}
```

**Error Codes**:
- `401`: Not authenticated
- `500`: Server error

---

### PUT /api/users/profile

**Description**: Update current user's profile information

**Authentication**: Authenticated

**Request Body**:
```json
{
  "firstName": "string (optional)",
  "lastName": "string (optional)",
  "bio": "string (optional, max 500 chars)",
  "avatar": "string (optional, valid URL)",
  "username": "string (optional, 3-30 chars, unique)"
}
```

**Response - Success (200)**:
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "id": "string",
    "email": "string",
    "username": "string",
    "firstName": "string",
    "lastName": "string",
    "bio": "string",
    "avatar": "string",
    "updatedAt": "ISO8601 string"
  }
}
```

**Response - Error (400)**:
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Invalid input data",
  "details": {
    "username": ["Username already taken"],
    "bio": ["Bio exceeds 500 characters"]
  }
}
```

**Error Codes**:
- `400`: Validation errors, username taken
- `401`: Not authenticated
- `500`: Server error

---

### GET /api/users/[id]

**Description**: Get public profile of any user (for collaboration features)

**Authentication**: Authenticated

**Path Parameters**:
- `id`: User ID (string, required)

**Query Parameters**: None

**Response - Success (200)**:
```json
{
  "success": true,
  "user": {
    "id": "string",
    "username": "string",
    "firstName": "string",
    "lastName": "string",
    "bio": "string",
    "avatar": "string",
    "role": "string",
    "createdAt": "ISO8601 string",
    "stats": {
      "storiesCreated": "number",
      "collaborationsJoined": "number",
      "chaptersWritten": "number"
    }
  }
}
```

**Response - Error (404)**:
```json
{
  "success": false,
  "error": "USER_NOT_FOUND",
  "message": "User not found"
}
```

**Error Codes**:
- `401`: Not authenticated
- `404`: User not found or account deactivated
- `500`: Server error

---

### PUT /api/users/[id]/role

**Description**: Update user role (moderators only)

**Authentication**: Moderator

**Path Parameters**:
- `id`: User ID (string, required)

**Request Body**:
```json
{
  "role": "string (required, one of: 'user', 'moderator')",
  "reason": "string (optional, reason for role change)"
}
```

**Response - Success (200)**:
```json
{
  "success": true,
  "message": "User role updated successfully",
  "user": {
    "id": "string",
    "username": "string",
    "role": "string",
    "updatedAt": "ISO8601 string"
  }
}
```

**Response - Error (403)**:
```json
{
  "success": false,
  "error": "INSUFFICIENT_PERMISSIONS",
  "message": "You don't have permission to modify user roles"
}
```

**Error Codes**:
- `400`: Invalid role value
- `401`: Not authenticated
- `403`: Insufficient permissions
- `404`: User not found
- `500`: Server error

## Role Management Routes

### GET /api/roles

**Description**: List available roles and their permissions

**Authentication**: Authenticated

**Query Parameters**: None

**Response - Success (200)**:
```json
{
  "success": true,
  "roles": [
    {
      "name": "user",
      "displayName": "User",
      "description": "Standard user with basic permissions",
      "permissions": [
        "create_story",
        "join_collaboration",
        "write_chapter",
        "comment",
        "edit_own_content"
      ]
    },
    {
      "name": "moderator",
      "displayName": "Moderator",
      "description": "Moderator with administrative permissions",
      "permissions": [
        "create_story",
        "join_collaboration",
        "write_chapter",
        "comment",
        "edit_own_content",
        "moderate_content",
        "manage_users",
        "assign_roles"
      ]
    }
  ]
}
```

**Error Codes**:
- `401`: Not authenticated
- `500`: Server error

---

### POST /api/roles/assign

**Description**: Assign role to user (moderators only)

**Authentication**: Moderator

**Request Body**:
```json
{
  "userId": "string (required)",
  "role": "string (required)",
  "reason": "string (optional)"
}
```

**Response - Success (200)**:
```json
{
  "success": true,
  "message": "Role assigned successfully",
  "assignment": {
    "userId": "string",
    "role": "string",
    "assignedBy": "string",
    "assignedAt": "ISO8601 string",
    "reason": "string"
  }
}
```

**Error Codes**:
- `400`: Invalid role or user ID
- `401`: Not authenticated
- `403`: Insufficient permissions
- `404`: User not found
- `500`: Server error

---

### DELETE /api/roles/revoke

**Description**: Remove role from user (moderators only)

**Authentication**: Moderator

**Request Body**:
```json
{
  "userId": "string (required)",
  "reason": "string (optional)"
}
```

**Response - Success (200)**:
```json
{
  "success": true,
  "message": "Role revoked successfully",
  "revocation": {
    "userId": "string",
    "previousRole": "string",
    "revokedBy": "string",
    "revokedAt": "ISO8601 string",
    "reason": "string"
  }
}
```

**Error Codes**:
- `400`: Invalid user ID
- `401`: Not authenticated
- `403`: Insufficient permissions, cannot revoke own role
- `404`: User not found
- `500`: Server error

## Integration Considerations

### NextAuth.js Integration

All authentication endpoints integrate with NextAuth.js:
- Session management handled by NextAuth.js middleware
- Custom callbacks for user data enrichment
- JWT tokens include user role and permissions
- Session persistence across browser tabs and devices

### AWS Amplify DataStore Operations

User data operations utilize AWS Amplify DataStore:
- Real-time synchronization across devices
- Offline-first data access
- Automatic conflict resolution
- GraphQL subscriptions for real-time updates

### Role-Based Authorization Middleware

Each protected endpoint includes authorization checks:
```javascript
// Example middleware implementation
const requireRole = (requiredRole) => {
  return async (req, res, next) => {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !hasRole(session.user.role, requiredRole)) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    next();
  };
};
```

### Rate Limiting and Security

Security measures implemented across all endpoints:
- Rate limiting by IP address and user ID
- Input validation and sanitization
- CSRF protection via NextAuth.js
- SQL injection prevention through parameterized queries
- Password hashing with bcrypt (minimum 12 rounds)
- Email verification for new accounts
- Account lockout after failed login attempts

### Error Handling Standards

All endpoints follow consistent error response format:
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {} // Optional additional error details
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request / Validation Error
- `401`: Unauthorized / Authentication Required
- `403`: Forbidden / Insufficient Permissions
- `404`: Not Found
- `429`: Too Many Requests / Rate Limited
- `500`: Internal Server Error

## Controllers

### AuthController
- Handles authentication routes (`/api/auth/*`)
- Integrates with NextAuth.js providers
- Manages session creation and validation
- Implements rate limiting for security

### UsersController
- Manages user profile operations (`/api/users/*`)
- Handles public and private profile data
- Implements role-based access control
- Integrates with AWS Amplify DataStore

### RolesController
- Manages role assignment and permissions (`/api/roles/*`)
- Implements moderator-only operations
- Maintains audit log for role changes
- Validates role hierarchies and permissions