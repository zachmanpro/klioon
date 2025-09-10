import { validateRegistrationInput, type RegistrationInput } from '@/lib/auth/validation';

describe('User Registration Validation', () => {
  describe('Email Format Validation', () => {
    it('should accept valid email formats', () => {
      const validEmails = [
        'user@example.com',
        'test.email@domain.co.uk',
        'user+tag@example.org',
        'firstname.lastname@example.com',
        'email@subdomain.example.com',
      ];

      validEmails.forEach(email => {
        const input: RegistrationInput = {
          email,
          password: 'ValidPass123!',
          firstName: 'John',
          lastName: 'Doe',
          role: 'reader',
        };
        
        const result = validateRegistrationInput(input);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'plainaddress',
        '@missingdomain.com',
        'missing@.com',
        'missing.domain@.com',
        'two@@domain.com',
        'trailing.dots@domain.com.',
        'spaces in@domain.com',
        'unicode@domäin.com',
      ];

      invalidEmails.forEach(email => {
        const input: RegistrationInput = {
          email,
          password: 'ValidPass123!',
          firstName: 'John',
          lastName: 'Doe',
          role: 'reader',
        };
        
        const result = validateRegistrationInput(input);
        expect(result.success).toBe(false);
        expect(result.error?.issues?.some(issue => 
          issue.path.includes('email') && issue.message.includes('Invalid email')
        )).toBe(true);
      });
    });

    it('should reject empty email', () => {
      const input: RegistrationInput = {
        email: '',
        password: 'ValidPass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'reader',
      };
      
      const result = validateRegistrationInput(input);
      expect(result.success).toBe(false);
      expect(result.error?.issues?.some(issue => 
        issue.path.includes('email')
      )).toBe(true);
    });
  });

  describe('Password Strength Validation', () => {
    it('should accept strong passwords', () => {
      const strongPasswords = [
        'ValidPass123!',
        'MyStr0ng!Password',
        'C0mpl3x#Pass',
        'S3cur3$Password!',
        'Anoth3r!Strong#Pass',
      ];

      strongPasswords.forEach(password => {
        const input: RegistrationInput = {
          email: 'user@example.com',
          password,
          firstName: 'John',
          lastName: 'Doe',
          role: 'reader',
        };
        
        const result = validateRegistrationInput(input);
        expect(result.success).toBe(true);
      });
    });

    it('should reject weak passwords', () => {
      const weakPasswords = [
        'short',           // Too short
        'password',        // No uppercase, no numbers, no special chars
        'PASSWORD',        // No lowercase, no numbers, no special chars
        '12345678',        // No letters, no special chars
        'Password',        // No numbers, no special chars
        'Password123',     // No special chars
        'Password!',       // No numbers
        '!@#$%^&*',       // No letters or numbers
      ];

      weakPasswords.forEach(password => {
        const input: RegistrationInput = {
          email: 'user@example.com',
          password,
          firstName: 'John',
          lastName: 'Doe',
          role: 'reader',
        };
        
        const result = validateRegistrationInput(input);
        expect(result.success).toBe(false);
        expect(result.error?.issues?.some(issue => 
          issue.path.includes('password')
        )).toBe(true);
      });
    });

    it('should require minimum password length of 8 characters', () => {
      const input: RegistrationInput = {
        email: 'user@example.com',
        password: 'Ab1!',  // Only 4 characters
        firstName: 'John',
        lastName: 'Doe',
        role: 'reader',
      };
      
      const result = validateRegistrationInput(input);
      expect(result.success).toBe(false);
      expect(result.error?.issues?.some(issue => 
        issue.path.includes('password') && issue.message.includes('8')
      )).toBe(true);
    });

    it('should require password to contain uppercase letter', () => {
      const input: RegistrationInput = {
        email: 'user@example.com',
        password: 'lowercase123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'reader',
      };
      
      const result = validateRegistrationInput(input);
      expect(result.success).toBe(false);
    });

    it('should require password to contain lowercase letter', () => {
      const input: RegistrationInput = {
        email: 'user@example.com',
        password: 'UPPERCASE123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'reader',
      };
      
      const result = validateRegistrationInput(input);
      expect(result.success).toBe(false);
    });

    it('should require password to contain number', () => {
      const input: RegistrationInput = {
        email: 'user@example.com',
        password: 'NoNumbers!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'reader',
      };
      
      const result = validateRegistrationInput(input);
      expect(result.success).toBe(false);
    });

    it('should require password to contain special character', () => {
      const input: RegistrationInput = {
        email: 'user@example.com',
        password: 'NoSpecialChars123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'reader',
      };
      
      const result = validateRegistrationInput(input);
      expect(result.success).toBe(false);
    });
  });

  describe('Required Fields Validation', () => {
    it('should accept valid input with all required fields', () => {
      const input: RegistrationInput = {
        email: 'user@example.com',
        password: 'ValidPass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'reader',
      };
      
      const result = validateRegistrationInput(input);
      expect(result.success).toBe(true);
    });

    it('should reject missing firstName', () => {
      const input = {
        email: 'user@example.com',
        password: 'ValidPass123!',
        firstName: '',
        lastName: 'Doe',
        role: 'reader',
      } as RegistrationInput;
      
      const result = validateRegistrationInput(input);
      expect(result.success).toBe(false);
      expect(result.error?.issues?.some(issue => 
        issue.path.includes('firstName')
      )).toBe(true);
    });

    it('should reject missing lastName', () => {
      const input = {
        email: 'user@example.com',
        password: 'ValidPass123!',
        firstName: 'John',
        lastName: '',
        role: 'reader',
      } as RegistrationInput;
      
      const result = validateRegistrationInput(input);
      expect(result.success).toBe(false);
      expect(result.error?.issues?.some(issue => 
        issue.path.includes('lastName')
      )).toBe(true);
    });

    it('should reject invalid role', () => {
      const input = {
        email: 'user@example.com',
        password: 'ValidPass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'invalid_role',
      } as RegistrationInput;
      
      const result = validateRegistrationInput(input);
      expect(result.success).toBe(false);
      expect(result.error?.issues?.some(issue => 
        issue.path.includes('role')
      )).toBe(true);
    });

    it('should accept valid roles: reader, writer, moderator', () => {
      const validRoles = ['reader', 'writer', 'moderator'] as const;
      
      validRoles.forEach(role => {
        const input: RegistrationInput = {
          email: 'user@example.com',
          password: 'ValidPass123!',
          firstName: 'John',
          lastName: 'Doe',
          role,
        };
        
        const result = validateRegistrationInput(input);
        expect(result.success).toBe(true);
      });
    });

    it('should trim whitespace from string fields', () => {
      const input: RegistrationInput = {
        email: '  user@example.com  ',
        password: 'ValidPass123!',
        firstName: '  John  ',
        lastName: '  Doe  ',
        role: 'reader',
      };
      
      const result = validateRegistrationInput(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('user@example.com');
        expect(result.data.firstName).toBe('John');
        expect(result.data.lastName).toBe('Doe');
      }
    });

    it('should reject firstName with only numbers', () => {
      const input: RegistrationInput = {
        email: 'user@example.com',
        password: 'ValidPass123!',
        firstName: '12345',
        lastName: 'Doe',
        role: 'reader',
      };
      
      const result = validateRegistrationInput(input);
      expect(result.success).toBe(false);
    });

    it('should reject lastName with only numbers', () => {
      const input: RegistrationInput = {
        email: 'user@example.com',
        password: 'ValidPass123!',
        firstName: 'John',
        lastName: '12345',
        role: 'reader',
      };
      
      const result = validateRegistrationInput(input);
      expect(result.success).toBe(false);
    });

    it('should enforce minimum length for firstName', () => {
      const input: RegistrationInput = {
        email: 'user@example.com',
        password: 'ValidPass123!',
        firstName: 'J',
        lastName: 'Doe',
        role: 'reader',
      };
      
      const result = validateRegistrationInput(input);
      expect(result.success).toBe(false);
      expect(result.error?.issues?.some(issue => 
        issue.path.includes('firstName') && issue.message.includes('2')
      )).toBe(true);
    });

    it('should enforce minimum length for lastName', () => {
      const input: RegistrationInput = {
        email: 'user@example.com',
        password: 'ValidPass123!',
        firstName: 'John',
        lastName: 'D',
        role: 'reader',
      };
      
      const result = validateRegistrationInput(input);
      expect(result.success).toBe(false);
      expect(result.error?.issues?.some(issue => 
        issue.path.includes('lastName') && issue.message.includes('2')
      )).toBe(true);
    });
  });

  describe('Edge Cases and Security Validation', () => {
    it('should reject extremely long emails', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const input: RegistrationInput = {
        email: longEmail,
        password: 'ValidPass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'reader',
      };
      
      const result = validateRegistrationInput(input);
      expect(result.success).toBe(false);
    });

    it('should reject passwords that are too long', () => {
      const longPassword = 'A1!' + 'a'.repeat(200);
      const input: RegistrationInput = {
        email: 'user@example.com',
        password: longPassword,
        firstName: 'John',
        lastName: 'Doe',
        role: 'reader',
      };
      
      const result = validateRegistrationInput(input);
      expect(result.success).toBe(false);
    });

    it('should reject names with special characters', () => {
      const input: RegistrationInput = {
        email: 'user@example.com',
        password: 'ValidPass123!',
        firstName: 'John@#$',
        lastName: 'Doe!@#',
        role: 'reader',
      };
      
      const result = validateRegistrationInput(input);
      expect(result.success).toBe(false);
    });

    it('should reject SQL injection attempts in email', () => {
      const input: RegistrationInput = {
        email: "user'; DROP TABLE users; --@example.com",
        password: 'ValidPass123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'reader',
      };
      
      const result = validateRegistrationInput(input);
      expect(result.success).toBe(false);
    });
  });
});