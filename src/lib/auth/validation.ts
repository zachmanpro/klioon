import { z } from 'zod';

// User role enum for type safety
export const UserRole = z.enum(['reader', 'writer', 'moderator']);
export type UserRole = z.infer<typeof UserRole>;

// Password validation schema with strong security requirements
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must not exceed 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]+$/,
    'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
  );

// Email validation schema
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .max(254, 'Email must not exceed 254 characters')
  .email('Invalid email format');

// Name validation schema (for firstName and lastName)
const nameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters long')
  .max(50, 'Name must not exceed 50 characters')
  .regex(
    /^[a-zA-Z\s'-]+$/,
    'Name can only contain letters, spaces, hyphens, and apostrophes'
  )
  .refine(
    (name) => !/^\d+$/.test(name),
    'Name cannot contain only numbers'
  );

// Main registration input validation schema
export const registrationInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  role: UserRole,
});

export type RegistrationInput = z.infer<typeof registrationInputSchema>;

// Validation function
export function validateRegistrationInput(input: unknown) {
  return registrationInputSchema.safeParse(input);
}

// Individual field validation functions for real-time validation
export function validateEmail(email: string) {
  return emailSchema.safeParse(email);
}

export function validatePassword(password: string) {
  return passwordSchema.safeParse(password);
}

export function validateName(name: string) {
  return nameSchema.safeParse(name);
}

export function validateRole(role: string) {
  return UserRole.safeParse(role);
}

// Password strength checker for UI feedback
export function getPasswordStrength(password: string): {
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 8) {
    score += 20;
  } else {
    feedback.push('Password should be at least 8 characters long');
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 20;
  } else {
    feedback.push('Add at least one uppercase letter');
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 20;
  } else {
    feedback.push('Add at least one lowercase letter');
  }

  // Number check
  if (/\d/.test(password)) {
    score += 20;
  } else {
    feedback.push('Add at least one number');
  }

  // Special character check
  if (/[@$!%*?&#]/.test(password)) {
    score += 20;
  } else {
    feedback.push('Add at least one special character (@$!%*?&#)');
  }

  // Bonus points for length
  if (password.length >= 12) {
    score = Math.min(score + 10, 100);
  }

  return { score, feedback };
}

// Email format validation for real-time feedback
export function validateEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Check if email domain is commonly used (for additional validation)
export function isCommonEmailDomain(email: string): boolean {
  const commonDomains = [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'icloud.com',
    'protonmail.com',
    'aol.com',
  ];
  
  const domain = email.split('@')[1]?.toLowerCase();
  return commonDomains.includes(domain);
}

// Validation error formatter for UI display
export function formatValidationErrors(
  errors: z.ZodError
): Record<string, string> {
  const formattedErrors: Record<string, string> = {};
  
  errors.issues.forEach((issue) => {
    const field = issue.path[0] as string;
    if (!formattedErrors[field]) {
      formattedErrors[field] = issue.message;
    }
  });
  
  return formattedErrors;
}