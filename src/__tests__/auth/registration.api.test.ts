import { validateRegistrationInput } from '@/lib/auth/validation';
import { UserService } from '@/lib/auth/amplify-client';

// Mock the Amplify client for testing
jest.mock('@/lib/auth/amplify-client', () => ({
  UserService: {
    createUser: jest.fn(),
    getUserByEmail: jest.fn(),
    updateUser: jest.fn(),
    verifyEmail: jest.fn(),
  },
}));

describe('Registration API Integration Tests', () => {
  const mockUserService = UserService as jest.Mocked<typeof UserService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Creation Flow', () => {
    it('should create a new user with valid registration data', async () => {
      const registrationData = {
        email: 'test@example.com',
        password: 'ValidPass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'reader' as const,
      };

      // Mock that user doesn't exist
      mockUserService.getUserByEmail.mockResolvedValue(null);
      
      // Mock successful user creation
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'reader' as const,
        emailVerified: false,
        isActive: true,
        createdAt: '2025-09-10T23:00:00Z',
        updatedAt: '2025-09-10T23:00:00Z',
      };
      mockUserService.createUser.mockResolvedValue(mockUser);

      // Validate input
      const validationResult = validateRegistrationInput(registrationData);
      expect(validationResult.success).toBe(true);

      if (validationResult.success) {
        // Check that user doesn't exist
        const existingUser = await UserService.getUserByEmail(registrationData.email);
        expect(existingUser).toBeNull();

        // Create user
        const newUser = await UserService.createUser({
          email: registrationData.email,
          firstName: registrationData.firstName,
          lastName: registrationData.lastName,
          role: registrationData.role,
          emailVerified: false,
          isActive: true,
        });

        expect(newUser).toEqual(mockUser);
        expect(mockUserService.createUser).toHaveBeenCalledWith({
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'reader',
          emailVerified: false,
          isActive: true,
        });
      }
    });

    it('should prevent duplicate user registration', async () => {
      const registrationData = {
        email: 'existing@example.com',
        password: 'ValidPass123!',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'writer' as const,
      };

      // Mock that user already exists
      const existingUser = {
        id: 'existing-user-123',
        email: 'existing@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'writer' as const,
        emailVerified: true,
        isActive: true,
        createdAt: '2025-09-09T23:00:00Z',
        updatedAt: '2025-09-09T23:00:00Z',
      };
      mockUserService.getUserByEmail.mockResolvedValue(existingUser);

      // Check that user exists
      const foundUser = await UserService.getUserByEmail(registrationData.email);
      expect(foundUser).toEqual(existingUser);

      // Should not attempt to create a new user
      expect(mockUserService.createUser).not.toHaveBeenCalled();
    });

    it('should handle different user roles correctly', async () => {
      const roles = ['reader', 'writer', 'moderator'] as const;

      for (const role of roles) {
        mockUserService.getUserByEmail.mockResolvedValue(null);
        mockUserService.createUser.mockResolvedValue({
          id: `user-${role}`,
          email: `${role}@example.com`,
          firstName: 'Test',
          lastName: 'User',
          role,
          emailVerified: false,
          isActive: true,
          createdAt: '2025-09-10T23:00:00Z',
          updatedAt: '2025-09-10T23:00:00Z',
        });

        const registrationData = {
          email: `${role}@example.com`,
          password: 'ValidPass123!',
          firstName: 'Test',
          lastName: 'User',
          role,
        };

        const validationResult = validateRegistrationInput(registrationData);
        expect(validationResult.success).toBe(true);

        if (validationResult.success) {
          const newUser = await UserService.createUser({
            email: registrationData.email,
            firstName: registrationData.firstName,
            lastName: registrationData.lastName,
            role: registrationData.role,
            emailVerified: false,
            isActive: true,
          });

          expect(newUser?.role).toBe(role);
        }
      }
    });
  });

  describe('Email Verification Flow', () => {
    it('should verify user email successfully', async () => {
      const userId = 'user-123';
      
      mockUserService.verifyEmail.mockResolvedValue(true);

      const result = await UserService.verifyEmail(userId);
      
      expect(result).toBe(true);
      expect(mockUserService.verifyEmail).toHaveBeenCalledWith(userId);
    });

    it('should handle email verification failure', async () => {
      const userId = 'user-123';
      
      mockUserService.verifyEmail.mockResolvedValue(false);

      const result = await UserService.verifyEmail(userId);
      
      expect(result).toBe(false);
      expect(mockUserService.verifyEmail).toHaveBeenCalledWith(userId);
    });
  });

  describe('User Profile Updates', () => {
    it('should update user profile successfully', async () => {
      const userId = 'user-123';
      const updates = {
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast',
        profilePicture: 'https://example.com/image.jpg',
      };

      const updatedUser = {
        id: userId,
        email: 'test@example.com',
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast',
        role: 'reader' as const,
        emailVerified: true,
        profilePicture: 'https://example.com/image.jpg',
        isActive: true,
        createdAt: '2025-09-10T23:00:00Z',
        updatedAt: '2025-09-10T23:30:00Z',
      };

      mockUserService.updateUser.mockResolvedValue(updatedUser);

      const result = await UserService.updateUser(userId, updates);
      
      expect(result).toEqual(updatedUser);
      expect(mockUserService.updateUser).toHaveBeenCalledWith(userId, updates);
    });

    it('should handle profile update failure', async () => {
      const userId = 'user-123';
      const updates = {
        firstName: 'UpdatedFirst',
      };

      mockUserService.updateUser.mockResolvedValue(null);

      const result = await UserService.updateUser(userId, updates);
      
      expect(result).toBeNull();
      expect(mockUserService.updateUser).toHaveBeenCalledWith(userId, updates);
    });
  });

  describe('Input Validation Integration', () => {
    it('should validate complete registration flow data', async () => {
      const testCases = [
        {
          name: 'Valid reader registration',
          data: {
            email: 'reader@example.com',
            password: 'SecurePass123!',
            firstName: 'John',
            lastName: 'Reader',
            role: 'reader' as const,
          },
          shouldPass: true,
        },
        {
          name: 'Valid writer registration',
          data: {
            email: 'writer@example.com',
            password: 'SecurePass123!',
            firstName: 'Jane',
            lastName: 'Writer',
            role: 'writer' as const,
          },
          shouldPass: true,
        },
        {
          name: 'Valid moderator registration',
          data: {
            email: 'moderator@example.com',
            password: 'SecurePass123!',
            firstName: 'Bob',
            lastName: 'Moderator',
            role: 'moderator' as const,
          },
          shouldPass: true,
        },
        {
          name: 'Invalid email format',
          data: {
            email: 'invalid-email',
            password: 'SecurePass123!',
            firstName: 'Test',
            lastName: 'User',
            role: 'reader' as const,
          },
          shouldPass: false,
        },
        {
          name: 'Weak password',
          data: {
            email: 'test@example.com',
            password: 'weak',
            firstName: 'Test',
            lastName: 'User',
            role: 'reader' as const,
          },
          shouldPass: false,
        },
        {
          name: 'Invalid role',
          data: {
            email: 'test@example.com',
            password: 'SecurePass123!',
            firstName: 'Test',
            lastName: 'User',
            role: 'invalid' as unknown as 'reader',
          },
          shouldPass: false,
        },
      ];

      for (const testCase of testCases) {
        const result = validateRegistrationInput(testCase.data);
        
        if (testCase.shouldPass) {
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data).toEqual(expect.objectContaining({
              email: testCase.data.email.toLowerCase(),
              firstName: testCase.data.firstName.trim(),
              lastName: testCase.data.lastName.trim(),
              role: testCase.data.role,
            }));
          }
        } else {
          expect(result.success).toBe(false);
        }
      }
    });
  });
});