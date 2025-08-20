/**
 * Database error handling utilities
 * Provides user-friendly error messages for common database errors
 */

import { Prisma } from '@prisma/client'

export interface DatabaseError {
  code: string
  message: string
  field?: string
  details?: any
}

/**
 * Convert Prisma errors to user-friendly error messages
 * @param error - The error to convert
 * @returns DatabaseError object with user-friendly message
 */
export function handleDatabaseError(error: unknown): DatabaseError {
  // Handle Prisma-specific errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        const field = error.meta?.target as string[]
        return {
          code: 'DUPLICATE_ENTRY',
          message: `A record with this ${field?.[0] || 'value'} already exists.`,
          field: field?.[0],
          details: error.meta,
        }

      case 'P2003':
        // Foreign key constraint violation
        return {
          code: 'INVALID_REFERENCE',
          message: 'The referenced record does not exist.',
          details: error.meta,
        }

      case 'P2025':
        // Record not found
        return {
          code: 'NOT_FOUND',
          message: 'The requested record was not found.',
          details: error.meta,
        }

      case 'P2014':
        // Required relation violation
        return {
          code: 'MISSING_RELATION',
          message: 'A required relationship is missing.',
          details: error.meta,
        }

      case 'P2000':
        // Value too long
        return {
          code: 'VALUE_TOO_LONG',
          message: 'The provided value is too long for the field.',
          details: error.meta,
        }

      case 'P2006':
        // Invalid value
        return {
          code: 'INVALID_VALUE',
          message: 'The provided value is not valid for this field.',
          details: error.meta,
        }

      default:
        return {
          code: 'DATABASE_ERROR',
          message: 'A database error occurred. Please try again.',
          details: { code: error.code, meta: error.meta },
        }
    }
  }

  // Handle Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Invalid data provided. Please check your input.',
      details: error.message,
    }
  }

  // Handle connection errors
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      code: 'CONNECTION_ERROR',
      message: 'Unable to connect to the database. Please try again later.',
      details: error.message,
    }
  }

  // Handle timeout errors
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return {
      code: 'DATABASE_TIMEOUT',
      message: 'Database operation timed out. Please try again.',
      details: error.message,
    }
  }

  // Handle generic errors
  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred.',
      details: error.stack,
    }
  }

  // Fallback for unknown error types
  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred.',
    details: error,
  }
}

/**
 * Check if an error is a specific Prisma error code
 * @param error - The error to check
 * @param code - The Prisma error code to check for
 * @returns boolean indicating if the error matches the code
 */
export function isPrismaError(error: unknown, code: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === code
  )
}

/**
 * Check if an error is a unique constraint violation
 * @param error - The error to check
 * @returns boolean indicating if it's a unique constraint violation
 */
export function isUniqueConstraintError(error: unknown): boolean {
  return isPrismaError(error, 'P2002')
}

/**
 * Check if an error is a foreign key constraint violation
 * @param error - The error to check
 * @returns boolean indicating if it's a foreign key constraint violation
 */
export function isForeignKeyError(error: unknown): boolean {
  return isPrismaError(error, 'P2003')
}

/**
 * Check if an error is a record not found error
 * @param error - The error to check
 * @returns boolean indicating if it's a record not found error
 */
export function isNotFoundError(error: unknown): boolean {
  return isPrismaError(error, 'P2025')
}

/**
 * Extract field name from unique constraint error
 * @param error - The Prisma error
 * @returns string field name or undefined
 */
export function getUniqueConstraintField(error: unknown): string | undefined {
  if (isUniqueConstraintError(error)) {
    const prismaError = error as Prisma.PrismaClientKnownRequestError
    const target = prismaError.meta?.target as string[]
    return target?.[0]
  }
  return undefined
}