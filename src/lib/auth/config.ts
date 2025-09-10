import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import EmailProvider from 'next-auth/providers/email';
import { validateRegistrationInput } from './validation';
import { UserService } from './amplify-client';
import type { UserRole } from '@/types/user';
import bcrypt from 'bcryptjs';

// Extend the built-in session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: UserRole;
      emailVerified: boolean;
      profilePicture?: string;
    };
  }

  interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    emailVerified: boolean;
    profilePicture?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    emailVerified: boolean;
    profilePicture?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Credentials provider for email/password authentication
    CredentialsProvider({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { 
          label: 'Email', 
          type: 'email',
          placeholder: 'user@example.com' 
        },
        password: { 
          label: 'Password', 
          type: 'password' 
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        try {
          // Find user by email
          const user = await UserService.getUserByEmail(credentials.email);
          
          if (!user) {
            throw new Error('Invalid email or password');
          }

          // Check if user is active
          if (!user.isActive) {
            throw new Error('Account has been deactivated');
          }

          // Verify password (you'll need to hash passwords during registration)
          // For now, this is a placeholder - implement proper password verification
          const isValidPassword = await verifyPassword(credentials.password, user.id);
          
          if (!isValidPassword) {
            throw new Error('Invalid email or password');
          }

          // Update last login
          await UserService.updateLastLogin(user.id);

          return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            emailVerified: user.emailVerified,
            profilePicture: user.profilePicture,
          };
        } catch (error) {
          console.error('Authentication error:', error);
          throw new Error('Authentication failed');
        }
      },
    }),

    // Email provider for magic link authentication
    EmailProvider({
      server: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM || 'noreply@bigz.com',
      maxAge: 24 * 60 * 60, // 24 hours
    }),
  ],

  pages: {
    signIn: '/login',
    signUp: '/register',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        token.id = user.id;
        token.role = user.role;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.emailVerified = user.emailVerified;
        token.profilePicture = user.profilePicture;
      }

      // Return previous token if the access token has not expired
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.firstName = token.firstName;
        session.user.lastName = token.lastName;
        session.user.emailVerified = token.emailVerified;
        session.user.profilePicture = token.profilePicture;
      }

      return session;
    },

    async signIn({ user, account, profile, email, credentials }) {
      // Allow sign in for verified users or during email verification
      if (account?.provider === 'email') {
        return true; // Allow email verification
      }

      // For credentials provider, check if user exists and is active
      if (account?.provider === 'credentials') {
        return user ? true : false;
      }

      return true;
    },

    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url;
      
      return baseUrl;
    },
  },

  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log(`User ${user.email} signed in with ${account?.provider}`);
      
      // Update last login time
      if (user.id) {
        await UserService.updateLastLogin(user.id);
      }
    },

    async signOut({ session, token }) {
      console.log(`User ${session?.user?.email || token?.email} signed out`);
    },

    async createUser({ user }) {
      console.log(`New user created: ${user.email}`);
    },
  },

  debug: process.env.NODE_ENV === 'development',
  
  secret: process.env.NEXTAUTH_SECRET,
};

// Helper function to verify password
async function verifyPassword(inputPassword: string, userId: string): Promise<boolean> {
  // TODO: Implement proper password verification
  // This should check the hashed password stored in your database
  // For now, return true for development
  
  // Example implementation:
  // const user = await getUserWithPasswordHash(userId);
  // return bcrypt.compare(inputPassword, user.passwordHash);
  
  return true; // Placeholder
}

// Helper function to hash password
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// Helper function to check user permissions
export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    reader: 1,
    writer: 2,
    moderator: 3,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

// Helper function to get user from session
export async function getCurrentUser(session: { user?: { id?: string } } | null) {
  if (!session?.user?.id) {
    return null;
  }

  return await UserService.getUserById(session.user.id);
}