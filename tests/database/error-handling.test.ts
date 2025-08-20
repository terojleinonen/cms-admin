/**
 * Database error handling tests
 * Tests error handling utilities and user-friendly error messages
 */

import { 
  handleDatabaseError, 
  isPrismaError, 
  isUniqueConstraintError,
  isForeignKeyError,
  isNotFoundError,
  getUniqueConstraintField 
} from '../../app/lib/db-errors'
import { Prisma } from '@prisma/client'

describe('Database Error Handling', () => {
  describe('handleDatabaseError', () => {
    it('should handle unique constraint violations (P2002)', () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: {
            target: ['email']
          }
        }
      )

      const result = handleDatabaseError(prismaError)

      expect(result.code).toBe('DUPLICATE_ENTRY')
      expect(result.message).toContain('email')
      expect(result.field).toBe('email')
    })

    it('should handle foreign key constraint violations (P2003)', () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: 'P2003',
          clientVersion: '5.0.0',
          meta: {
            field_name: 'createdBy'
          }
        }
      )

      const result = handleDatabaseError(prismaError)

      expect(result.code).toBe('INVALID_REFERENCE')
      expect(result.message).toContain('referenced record does not exist')
    })

    it('should handle record not found errors (P2025)', () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '5.0.0',
          meta: {}
        }
      )

      const result = handleDatabaseError(prismaError)

      expect(result.code).toBe('NOT_FOUND')
      expect(result.message).toContain('not found')
    })

    it('should handle validation errors', () => {
      const validationError = new Prisma.PrismaClientValidationError(
        'Invalid input data',
        '5.0.0'
      )

      const result = handleDatabaseError(validationError)

      expect(result.code).toBe('VALIDATION_ERROR')
      expect(result.message).toContain('Invalid data')
    })

    it('should handle generic errors', () => {
      const genericError = new Error('Something went wrong')

      const result = handleDatabaseError(genericError)

      expect(result.code).toBe('UNKNOWN_ERROR')
      expect(result.message).toBe('Something went wrong')
    })
  })

  describe('Error Type Checking', () => {
    it('should correctly identify Prisma errors', () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Test error',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: {}
        }
      )

      expect(isPrismaError(prismaError, 'P2002')).toBe(true)
      expect(isPrismaError(prismaError, 'P2003')).toBe(false)
      expect(isPrismaError(new Error('generic'), 'P2002')).toBe(false)
    })

    it('should correctly identify unique constraint errors', () => {
      const uniqueError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['email'] }
        }
      )

      const otherError = new Prisma.PrismaClientKnownRequestError(
        'Other error',
        {
          code: 'P2003',
          clientVersion: '5.0.0',
          meta: {}
        }
      )

      expect(isUniqueConstraintError(uniqueError)).toBe(true)
      expect(isUniqueConstraintError(otherError)).toBe(false)
      expect(isUniqueConstraintError(new Error('generic'))).toBe(false)
    })

    it('should extract field name from unique constraint error', () => {
      const uniqueError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['email'] }
        }
      )

      const field = getUniqueConstraintField(uniqueError)
      expect(field).toBe('email')
    })
  })
})