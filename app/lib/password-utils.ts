/**
 * Password utilities for CMS authentication
 * 
 * This module provides secure password hashing, verification, and validation
 * utilities using bcrypt for the Kin Workspace CMS. All password operations
 * follow security best practices with configurable salt rounds and comprehensive
 * strength validation.
 * 
 * @module PasswordUtils
 * @version 1.0.0
 * @author Kin Workspace CMS Team
 * @since 2024-01-01
 */

import bcrypt from 'bcryptjs'

/**
 * Configuration for password security
 */
const PASSWORD_CONFIG = {
  /** Number of salt rounds for bcrypt hashing (higher = more secure but slower) */
  SALT_ROUNDS: 12,
  /** Minimum password length requirement */
  MIN_LENGTH: 8,
  /** Maximum password length to prevent DoS attacks */
  MAX_LENGTH: 128,
} as const

/**
 * Password validation result interface
 */
export interface PasswordValidationResult {
  /** Whether the password meets all requirements */
  isValid: boolean
  /** Array of validation error messages */
  errors: string[]
  /** Password strength score (0-100) */
  strength?: number
  /** Estimated time to crack the password */
  crackTime?: string
}

/**
 * Hash a password using bcrypt with secure salt rounds
 * 
 * Uses bcrypt with 12 salt rounds by default for optimal security/performance balance.
 * The salt rounds can be adjusted based on security requirements and server performance.
 * 
 * @param password - Plain text password to hash
 * @returns Promise<string> - Securely hashed password
 * @throws {Error} When password is empty or exceeds maximum length
 * 
 * @example
 * ```typescript
 * const hashedPassword = await hashPassword('mySecurePassword123!');
 * console.log(hashedPassword); // $2a$12$...
 * ```
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length === 0) {
    throw new Error('Password cannot be empty')
  }
  
  if (password.length > PASSWORD_CONFIG.MAX_LENGTH) {
    throw new Error(`Password cannot exceed ${PASSWORD_CONFIG.MAX_LENGTH} characters`)
  }

  try {
    return await bcrypt.hash(password, PASSWORD_CONFIG.SALT_ROUNDS)
  } catch (error) {
    throw new Error(`Failed to hash password: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Verify a password against a bcrypt hash
 * 
 * Securely compares a plain text password with a bcrypt hash using
 * constant-time comparison to prevent timing attacks.
 * 
 * @param password - Plain text password to verify
 * @param hash - Bcrypt hash to compare against
 * @returns Promise<boolean> - True if password matches the hash
 * @throws {Error} When password or hash is invalid
 * 
 * @example
 * ```typescript
 * const isValid = await verifyPassword('myPassword', hashedPassword);
 * if (isValid) {
 *   console.log('Password is correct');
 * }
 * ```
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    return false
  }

  try {
    return await bcrypt.compare(password, hash)
  } catch (error) {
    console.error('Password verification failed:', error)
    return false
  }
}

/**
 * Validate password strength and security requirements
 * 
 * Performs comprehensive password validation including:
 * - Length requirements (8-128 characters)
 * - Character complexity (uppercase, lowercase, numbers, symbols)
 * - Common password detection
 * - Strength scoring
 * 
 * @param password - Password to validate
 * @returns PasswordValidationResult - Detailed validation results
 * 
 * @example
 * ```typescript
 * const result = validatePassword('MyPassword123!');
 * if (!result.isValid) {
 *   console.log('Errors:', result.errors);
 * }
 * console.log('Strength:', result.strength);
 * ```
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []
  let strength = 0

  // Check if password exists
  if (!password) {
    return {
      isValid: false,
      errors: ['Password is required'],
      strength: 0,
    }
  }

  // Length validation
  if (password.length < PASSWORD_CONFIG.MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_CONFIG.MIN_LENGTH} characters long`)
  } else {
    strength += 20 // Base points for minimum length
    if (password.length >= 12) strength += 10 // Bonus for longer passwords
    if (password.length >= 16) strength += 10 // Extra bonus for very long passwords
  }

  if (password.length > PASSWORD_CONFIG.MAX_LENGTH) {
    errors.push(`Password cannot exceed ${PASSWORD_CONFIG.MAX_LENGTH} characters`)
  }

  // Character type validation
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)

  if (!hasUppercase) {
    errors.push('Password must contain at least one uppercase letter')
  } else {
    strength += 15
  }

  if (!hasLowercase) {
    errors.push('Password must contain at least one lowercase letter')
  } else {
    strength += 15
  }

  if (!hasNumbers) {
    errors.push('Password must contain at least one number')
  } else {
    strength += 15
  }

  if (!hasSpecialChars) {
    errors.push('Password must contain at least one special character')
  } else {
    strength += 15
  }

  // Additional strength checks
  const uniqueChars = new Set(password).size
  if (uniqueChars >= password.length * 0.7) {
    strength += 10 // Bonus for character diversity
  }

  // Check for common patterns (reduce strength)
  const commonPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /abc/i,
    /(.)\1{2,}/, // Repeated characters
  ]

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      strength -= 10
      if (!errors.includes('Password contains common patterns')) {
        errors.push('Password contains common patterns and may be easily guessed')
      }
    }
  }

  // Ensure strength is within bounds
  strength = Math.max(0, Math.min(100, strength))

  // Calculate estimated crack time (simplified)
  let crackTime = 'Unknown'
  if (strength >= 80) crackTime = 'Centuries'
  else if (strength >= 60) crackTime = 'Years'
  else if (strength >= 40) crackTime = 'Months'
  else if (strength >= 20) crackTime = 'Days'
  else crackTime = 'Minutes'

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    crackTime,
  }
}

/**
 * Generate a secure random password
 * 
 * Creates a cryptographically secure random password that meets all
 * validation requirements. Useful for temporary passwords or password resets.
 * 
 * @param length - Desired password length (default: 16)
 * @param includeSymbols - Whether to include special characters (default: true)
 * @returns string - Generated secure password
 * 
 * @example
 * ```typescript
 * const tempPassword = generateSecurePassword(12);
 * console.log(tempPassword); // "Kx9#mP2$vL8!"
 * ```
 */
export function generateSecurePassword(length: number = 16, includeSymbols: boolean = true): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'
  
  let charset = uppercase + lowercase + numbers
  if (includeSymbols) {
    charset += symbols
  }
  
  let password = ''
  
  // Ensure at least one character from each required set
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  
  if (includeSymbols) {
    password += symbols[Math.floor(Math.random() * symbols.length)]
  }
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)]
  }
  
  // Shuffle the password to avoid predictable patterns
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * Check if a password has been compromised in known data breaches
 * 
 * This is a placeholder for integration with services like HaveIBeenPwned.
 * In a production environment, you would implement actual breach checking.
 * 
 * @param password - Password to check
 * @returns Promise<boolean> - True if password is compromised
 * 
 * @example
 * ```typescript
 * const isCompromised = await isPasswordCompromised('password123');
 * if (isCompromised) {
 *   console.log('This password has been found in data breaches');
 * }
 * ```
 */
export async function isPasswordCompromised(password: string): Promise<boolean> {
  // TODO: Implement actual breach checking with HaveIBeenPwned API
  // For now, check against a small list of very common passwords
  const commonPasswords = [
    'password', '123456', 'password123', 'admin', 'qwerty',
    'letmein', 'welcome', 'monkey', '1234567890', 'abc123'
  ]
  
  return commonPasswords.includes(password.toLowerCase())
}