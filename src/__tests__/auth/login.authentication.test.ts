import { authOptions } from '@/lib/auth/config';
import { UserService } from '@/lib/auth/amplify-client';
import bcrypt from 'bcryptjs';

// Mock the Amplify client for testing
jest.mock('@/lib/auth/amplify-client', () => ({
  UserService: {
    getUserByEmail: jest.fn(),
    getUserById: jest.fn(),
    updateLastLogin: jest.fn(),
  },
}));

// Mock bcryptjs for password verification
jest.mock('bcryptjs');

describe('Login Authentication Tests', () => {
  const mockUserService = UserService as jest.Mocked<typeof UserService>;
  const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Credentials Provider Authentication', () => {
    it('should authenticate user with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'writer' as const,
        emailVerified: true,
        isActive: true,
        passwordHash: 'hashed-password',
        createdAt: '2025-09-10T23:00:00Z',
        updatedAt: '2025-09-10T23:00:00Z',
      };

      mockUserService.getUserByEmail.mockResolvedValue(mockUser);
      mockUserService.getUserById.mockResolvedValue(mockUser);
      mockUserService.updateLastLogin.mockResolvedValue();
      mockBcrypt.compare.mockResolvedValue(true);
      
      const credentialsProvider = authOptions.providers?.find(
        provider => provider.id === 'credentials'
      );

      if (credentialsProvider && 'authorize' in credentialsProvider) {
        const result = await credentialsProvider.authorize({
          email: 'test@example.com',
          password: 'ValidPass123!',
        });

        expect(result).toEqual({
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'writer',
          emailVerified: true,
          profilePicture: undefined,
        });
        expect(mockUserService.getUserByEmail).toHaveBeenCalledWith('test@example.com');
        expect(mockUserService.updateLastLogin).toHaveBeenCalledWith('user-123');
      }
    });

    it('should reject authentication with missing email', async () => {
      const credentialsProvider = authOptions.providers?.find(
        provider => provider.id === 'credentials'
      );

      if (credentialsProvider && 'authorize' in credentialsProvider) {
        await expect(
          credentialsProvider.authorize({
            email: '',
            password: 'ValidPass123!',
          })
        ).rejects.toThrow('Email and password are required');
      }
    });

    it('should reject authentication with missing password', async () => {
      const credentialsProvider = authOptions.providers?.find(
        provider => provider.id === 'credentials'
      );

      if (credentialsProvider && 'authorize' in credentialsProvider) {
        await expect(
          credentialsProvider.authorize({
            email: 'test@example.com',
            password: '',
          })
        ).rejects.toThrow('Email and password are required');
      }
    });

    it('should reject authentication for non-existent user', async () => {
      mockUserService.getUserByEmail.mockResolvedValue(null);

      const credentialsProvider = authOptions.providers?.find(
        provider => provider.id === 'credentials'
      );

      if (credentialsProvider && 'authorize' in credentialsProvider) {
        await expect(
          credentialsProvider.authorize({
            email: 'nonexistent@example.com',
            password: 'ValidPass123!',
          })
        ).rejects.toThrow('Invalid email or password');
      }
    });

    it('should reject authentication for inactive user', async () => {
      const mockInactiveUser = {
        id: 'user-123',
        email: 'inactive@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'reader' as const,
        emailVerified: true,
        isActive: false,
        passwordHash: 'hashed-password',
        createdAt: '2025-09-10T23:00:00Z',
        updatedAt: '2025-09-10T23:00:00Z',
      };

      mockUserService.getUserByEmail.mockResolvedValue(mockInactiveUser);

      const credentialsProvider = authOptions.providers?.find(
        provider => provider.id === 'credentials'
      );

      if (credentialsProvider && 'authorize' in credentialsProvider) {
        await expect(
          credentialsProvider.authorize({
            email: 'inactive@example.com',
            password: 'ValidPass123!',
          })
        ).rejects.toThrow('Account has been deactivated');
      }
    });

    it('should handle database errors gracefully', async () => {
      mockUserService.getUserByEmail.mockRejectedValue(new Error('Database connection failed'));

      const credentialsProvider = authOptions.providers?.find(
        provider => provider.id === 'credentials'
      );

      if (credentialsProvider && 'authorize' in credentialsProvider) {
        await expect(
          credentialsProvider.authorize({
            email: 'test@example.com',
            password: 'ValidPass123!',
          })
        ).rejects.toThrow('Authentication failed');
      }
    });
  });

  describe('JWT Callbacks', () => {
    it('should populate JWT token on initial sign in', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'writer' as const,
        emailVerified: true,
        profilePicture: 'https://example.com/avatar.jpg',
      };

      const mockAccount = { provider: 'credentials' };
      const initialToken = { email: 'test@example.com' };

      const result = await authOptions.callbacks!.jwt!({
        token: initialToken,
        user: mockUser,
        account: mockAccount,
      });

      expect(result).toEqual({
        email: 'test@example.com',
        id: 'user-123',
        role: 'writer',
        firstName: 'John',
        lastName: 'Doe',
        emailVerified: true,
        profilePicture: 'https://example.com/avatar.jpg',
      });
    });

    it('should return existing token when no user/account provided', async () => {
      const existingToken = {
        email: 'test@example.com',
        id: 'user-123',
        role: 'writer' as const,
        firstName: 'John',
        lastName: 'Doe',
        emailVerified: true,
      };

      const result = await authOptions.callbacks!.jwt!({
        token: existingToken,
      });

      expect(result).toEqual(existingToken);
    });
  });

  describe('Session Callbacks', () => {
    it('should populate session from JWT token', async () => {
      const mockToken = {
        email: 'test@example.com',
        id: 'user-123',
        role: 'writer' as const,
        firstName: 'John',
        lastName: 'Doe',
        emailVerified: true,
        profilePicture: 'https://example.com/avatar.jpg',
      };

      const initialSession = {
        expires: '2025-10-10',
        user: {
          email: 'test@example.com',
        },
      };

      const result = await authOptions.callbacks!.session!({
        session: initialSession,
        token: mockToken,
      });

      expect(result.user).toEqual({
        email: 'test@example.com',
        id: 'user-123',
        role: 'writer',
        firstName: 'John',
        lastName: 'Doe',
        emailVerified: true,
        profilePicture: 'https://example.com/avatar.jpg',
      });
    });

    it('should handle session without token', async () => {
      const initialSession = {
        expires: '2025-10-10',
        user: {
          email: 'test@example.com',
        },
      };

      const result = await authOptions.callbacks!.session!({
        session: initialSession,
        token: null as any,
      });

      expect(result).toEqual(initialSession);
    });
  });

  describe('Sign In Callbacks', () => {
    it('should allow sign in for credentials provider with valid user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'writer' as const,
        emailVerified: true,
      };

      const mockAccount = { provider: 'credentials' };

      const result = await authOptions.callbacks!.signIn!({
        user: mockUser,
        account: mockAccount,
        profile: undefined,
      });

      expect(result).toBe(true);
    });

    it('should reject sign in for credentials provider without user', async () => {
      const mockAccount = { provider: 'credentials' };

      const result = await authOptions.callbacks!.signIn!({
        user: null as any,
        account: mockAccount,
        profile: undefined,
      });

      expect(result).toBe(false);
    });

    it('should allow sign in for email provider', async () => {
      const mockAccount = { provider: 'email' };

      const result = await authOptions.callbacks!.signIn!({
        user: {} as any,
        account: mockAccount,
        profile: undefined,
      });

      expect(result).toBe(true);
    });
  });

  describe('Redirect Callbacks', () => {
    const baseUrl = 'https://bigz.com';

    it('should handle relative callback URLs', async () => {
      const result = await authOptions.callbacks!.redirect!({
        url: '/dashboard',
        baseUrl,
      });

      expect(result).toBe('https://bigz.com/dashboard');
    });

    it('should handle same-origin callback URLs', async () => {
      const result = await authOptions.callbacks!.redirect!({
        url: 'https://bigz.com/profile',
        baseUrl,
      });

      expect(result).toBe('https://bigz.com/profile');
    });

    it('should reject external URLs and return base URL', async () => {
      const result = await authOptions.callbacks!.redirect!({
        url: 'https://malicious.com/steal-data',
        baseUrl,
      });

      expect(result).toBe(baseUrl);
    });
  });

  describe('Event Handlers', () => {
    it('should log sign in events and update last login', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockUserService.updateLastLogin.mockResolvedValue();

      await authOptions.events!.signIn!({
        user: { id: 'user-123', email: 'test@example.com' },
        account: { provider: 'credentials' },
      });

      expect(consoleSpy).toHaveBeenCalledWith('User test@example.com signed in with credentials');
      expect(mockUserService.updateLastLogin).toHaveBeenCalledWith('user-123');

      consoleSpy.mockRestore();
    });

    it('should log sign out events', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await authOptions.events!.signOut!({
        session: { user: { email: 'test@example.com' } } as any,
      });

      expect(consoleSpy).toHaveBeenCalledWith('User test@example.com signed out');

      consoleSpy.mockRestore();
    });

    it('should log create user events', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await authOptions.events!.createUser!({
        user: { email: 'newuser@example.com' },
      });

      expect(consoleSpy).toHaveBeenCalledWith('New user created: newuser@example.com');

      consoleSpy.mockRestore();
    });
  });

  describe('Email Provider Configuration', () => {
    it('should have email provider configured with correct settings', () => {
      const emailProvider = authOptions.providers?.find(
        provider => provider.id === 'email'
      );

      expect(emailProvider).toBeDefined();
      expect(emailProvider?.type).toBe('email');
    });
  });

  describe('Session Configuration', () => {
    it('should be configured for JWT strategy', () => {
      expect(authOptions.session?.strategy).toBe('jwt');
      expect(authOptions.session?.maxAge).toBe(30 * 24 * 60 * 60); // 30 days
      expect(authOptions.session?.updateAge).toBe(24 * 60 * 60); // 24 hours
    });
  });

  describe('JWT Configuration', () => {
    it('should have correct JWT max age', () => {
      expect(authOptions.jwt?.maxAge).toBe(30 * 24 * 60 * 60); // 30 days
    });
  });

  describe('Custom Pages Configuration', () => {
    it('should have custom authentication pages configured', () => {
      expect(authOptions.pages).toEqual({
        signIn: '/login',
        signUp: '/register',
        error: '/auth/error',
        verifyRequest: '/auth/verify-request',
      });
    });
  });
});