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
    })
    .authorization((allow) => [
      // Only moderators can manage roles
      allow.group('moderators'),
      // All authenticated users can read roles
      allow.authenticated().to(['read']),
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
Data client to make CRUDL requests to your User model. (THIS SNIPPET WILL 
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
*/
