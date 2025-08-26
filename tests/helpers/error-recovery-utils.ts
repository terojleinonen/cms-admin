/**
 * Error Recovery Utilities
 * Enhanced error handling and recovery mechanisms for integration tests
 */

import { PrismaClient } from '@prisma/client'
import { testDatabaseManager } from './test-database-manager'

// Error types for categorization
export enum ErrorType {
  DATABASE_CONNECTION = 'database_connection',
  DATABASE_CONSTRAINT = 'database_constraint',
  DATABASE_TIMEOUT = 'database_timeout',
  TRANSACTION_ROLLBACK = 'transaction_rollback',
  VALIDATION_ERROR = 'validation_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  AUTHORIZATION_ERROR = 'authorization_error',
  NETWORK_ERROR = 'network_error',
  TIMEOUT_ERROR = 'timeout_error',
  UNKNOWN_ERROR = 'unknown_error'
}

// Error recovery strategies
export enum RecoveryStrategy {
  RETRY = 'retry',
  ROLLBACK = 'rollback',
  RESET = 'reset',
  SKIP = 'skip',
  FAIL = 'fail'
}

// Error context information
export interface ErrorContext {
  testName: string
  operation: string
  attempt: number
  timestamp: Date
  errorType: ErrorType
  originalError: Error
  metadata?: Record<string, any>
}

// Recovery configuration
export interface RecoveryConfig {
  maxRetries: number
  retryDelay: number
  backoffMultiplier: number
  timeoutMs: number
  strategy: RecoveryStrategy
}

// Default recovery configuration
export const DEFAULT_RECOVERY_CONFIG: RecoveryConfig = {
  maxRetries: 3,
  retryDelay: 100,
  backoffMultiplier: 2,
  timeoutMs: 10000,
  strategy: RecoveryStrategy.RETRY
}

/**
 * Error Classifier
 * Classifies errors into categories for appropriate handling
 */
export class ErrorClassifier {
  /**
   * Classify error by type
   */
  static classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase()
    const name = error.name.toLowerCase()

    // Database connection errors
    if (message.includes('connection') || message.includes('connect') || 
        message.includes('econnrefused') || message.includes('timeout')) {
      return ErrorType.DATABASE_CONNECTION
    }

    // Database constraint errors
    if (message.includes('unique constraint') || message.includes('foreign key') ||
        message.includes('p2002') || message.includes('p2003')) {
      return ErrorType.DATABASE_CONSTRAINT
    }

    // Database timeout errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return ErrorType.DATABASE_TIMEOUT
    }

    // Transaction rollback errors
    if (message.includes('transaction') || message.includes('rollback')) {
      return ErrorType.TRANSACTION_ROLLBACK
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid') ||
        name.includes('validation')) {
      return ErrorType.VALIDATION_ERROR
    }

    // Authentication errors
    if (message.includes('authentication') || message.includes('unauthorized') ||
        message.includes('invalid credentials')) {
      return ErrorType.AUTHENTICATION_ERROR
    }

    // Authorization errors
    if (message.includes('authorization') || message.includes('forbidden') ||
        message.includes('access denied')) {
      return ErrorType.AUTHORIZATION_ERROR
    }

    // Network errors
    if (message.includes('network') || message.includes('fetch') ||
        message.includes('request failed')) {
      return ErrorType.NETWORK_ERROR
    }

    // Timeout errors
    if (message.includes('timeout') || name.includes('timeout')) {
      return ErrorType.TIMEOUT_ERROR
    }

    return ErrorType.UNKNOWN_ERROR
  }

  /**
   * Determine if error is recoverable
   */
  static isRecoverable(errorType: ErrorType): boolean {
    switch (errorType) {
      case ErrorType.DATABASE_CONNECTION:
      case ErrorType.DATABASE_TIMEOUT:
      case ErrorType.NETWORK_ERROR:
      case ErrorType.TIMEOUT_ERROR:
        return true
      
      case ErrorType.DATABASE_CONSTRAINT:
      case ErrorType.VALIDATION_ERROR:
      case ErrorType.AUTHENTICATION_ERROR:
      case ErrorType.AUTHORIZATION_ERROR:
        return false
      
      case ErrorType.TRANSACTION_ROLLBACK:
        return true // Can retry with new transaction
      
      case ErrorType.UNKNOWN_ERROR:
      default:
        return false
    }
  }

  /**
   * Get recommended recovery strategy
   */
  static getRecoveryStrategy(errorType: ErrorType): RecoveryStrategy {
    switch (errorType) {
      case ErrorType.DATABASE_CONNECTION:
      case ErrorType.DATABASE_TIMEOUT:
      case ErrorType.NETWORK_ERROR:
      case ErrorType.TIMEOUT_ERROR:
        return RecoveryStrategy.RETRY
      
      case ErrorType.DATABASE_CONSTRAINT:
        return RecoveryStrategy.RESET
      
      case ErrorType.TRANSACTION_ROLLBACK:
        return RecoveryStrategy.ROLLBACK
      
      case ErrorType.VALIDATION_ERROR:
      case ErrorType.AUTHENTICATION_ERROR:
      case ErrorType.AUTHORIZATION_ERROR:
        return RecoveryStrategy.FAIL
      
      case ErrorType.UNKNOWN_ERROR:
      default:
        return RecoveryStrategy.SKIP
    }
  }
}

/**
 * Error Recovery Manager
 * Manages error recovery strategies and execution
 */
export class ErrorRecoveryManager {
  private static instance: ErrorRecoveryManager
  private errorHistory: Map<string, ErrorContext[]> = new Map()
  private recoveryAttempts: Map<string, number> = new Map()

  private constructor() {}

  static getInstance(): ErrorRecoveryManager {
    if (!ErrorRecoveryManager.instance) {
      ErrorRecoveryManager.instance = new ErrorRecoveryManager()
    }
    return ErrorRecoveryManager.instance
  }

  /**
   * Execute operation with error recovery
   */
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    context: Partial<ErrorContext>,
    config: Partial<RecoveryConfig> = {}
  ): Promise<T> {
    const fullConfig = { ...DEFAULT_RECOVERY_CONFIG, ...config }
    const operationKey = `${context.testName}-${context.operation}`
    
    let lastError: Error
    let attempt = 0

    while (attempt < fullConfig.maxRetries) {
      attempt++
      
      try {
        const result = await this.executeWithTimeout(operation, fullConfig.timeoutMs)
        
        // Success - clear any previous error history for this operation
        this.recoveryAttempts.delete(operationKey)
        
        return result
      } catch (error) {
        lastError = error as Error
        
        const errorType = ErrorClassifier.classifyError(lastError)
        const errorContext: ErrorContext = {
          testName: context.testName || 'unknown',
          operation: context.operation || 'unknown',
          attempt,
          timestamp: new Date(),
          errorType,
          originalError: lastError,
          metadata: context.metadata
        }

        // Record error in history
        this.recordError(operationKey, errorContext)

        // Check if we should continue retrying
        if (!ErrorClassifier.isRecoverable(errorType) || attempt >= fullConfig.maxRetries) {
          console.error(`❌ Operation failed after ${attempt} attempts:`, lastError.message)
          throw lastError
        }

        // Apply recovery strategy
        await this.applyRecoveryStrategy(errorType, errorContext, fullConfig)

        // Wait before retry with exponential backoff
        const delay = fullConfig.retryDelay * Math.pow(fullConfig.backoffMultiplier, attempt - 1)
        await this.delay(delay)

        console.warn(`⚠️ Retrying operation (attempt ${attempt + 1}/${fullConfig.maxRetries}) after error:`, lastError.message)
      }
    }

    throw lastError!
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ])
  }

  /**
   * Apply recovery strategy based on error type
   */
  private async applyRecoveryStrategy(
    errorType: ErrorType,
    context: ErrorContext,
    config: RecoveryConfig
  ): Promise<void> {
    const strategy = config.strategy || ErrorClassifier.getRecoveryStrategy(errorType)

    switch (strategy) {
      case RecoveryStrategy.RETRY:
        // Just retry - no special action needed
        break

      case RecoveryStrategy.ROLLBACK:
        await this.performRollback(context)
        break

      case RecoveryStrategy.RESET:
        await this.performReset(context)
        break

      case RecoveryStrategy.SKIP:
        console.warn(`⏭️ Skipping operation due to error: ${context.originalError.message}`)
        throw context.originalError

      case RecoveryStrategy.FAIL:
        console.error(`💥 Failing operation due to unrecoverable error: ${context.originalError.message}`)
        throw context.originalError
    }
  }

  /**
   * Perform transaction rollback
   */
  private async performRollback(context: ErrorContext): Promise<void> {
    try {
      console.log('🔄 Performing transaction rollback...')
      
      // If we have a test ID in metadata, try to rollback that specific transaction
      if (context.metadata?.testId) {
        await testDatabaseManager.rollbackTransaction(context.metadata.testId)
      }
      
      console.log('✅ Transaction rollback successful')
    } catch (rollbackError) {
      console.warn('⚠️ Transaction rollback failed:', rollbackError)
      // Continue anyway - the error might be expected
    }
  }

  /**
   * Perform database reset
   */
  private async performReset(context: ErrorContext): Promise<void> {
    try {
      console.log('🔄 Performing database reset...')
      
      await testDatabaseManager.cleanup()
      await testDatabaseManager.seed()
      
      console.log('✅ Database reset successful')
    } catch (resetError) {
      console.error('❌ Database reset failed:', resetError)
      throw resetError
    }
  }

  /**
   * Record error in history
   */
  private recordError(operationKey: string, context: ErrorContext): void {
    if (!this.errorHistory.has(operationKey)) {
      this.errorHistory.set(operationKey, [])
    }
    
    this.errorHistory.get(operationKey)!.push(context)
    this.recoveryAttempts.set(operationKey, context.attempt)
  }

  /**
   * Get error history for operation
   */
  getErrorHistory(operationKey: string): ErrorContext[] {
    return this.errorHistory.get(operationKey) || []
  }

  /**
   * Get all error history
   */
  getAllErrorHistory(): Map<string, ErrorContext[]> {
    return new Map(this.errorHistory)
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory.clear()
    this.recoveryAttempts.clear()
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Database Recovery Helper
 * Specialized recovery utilities for database operations
 */
export class DatabaseRecoveryHelper {
  /**
   * Execute database operation with recovery
   */
  static async executeWithRecovery<T>(
    operation: (prisma: PrismaClient) => Promise<T>,
    testName: string,
    operationName: string,
    config?: Partial<RecoveryConfig>
  ): Promise<T> {
    const recoveryManager = ErrorRecoveryManager.getInstance()
    
    return recoveryManager.executeWithRecovery(
      async () => {
        const prisma = testDatabaseManager.getClient()
        return await operation(prisma)
      },
      {
        testName,
        operation: operationName,
        metadata: { type: 'database' }
      },
      config
    )
  }

  /**
   * Execute transaction with recovery
   */
  static async executeTransactionWithRecovery<T>(
    operation: (prisma: PrismaClient) => Promise<T>,
    testName: string,
    operationName: string,
    config?: Partial<RecoveryConfig>
  ): Promise<T> {
    const recoveryManager = ErrorRecoveryManager.getInstance()
    const testId = `${testName}-${Date.now()}`
    
    return recoveryManager.executeWithRecovery(
      async () => {
        return await testDatabaseManager.withTransaction(testId, operation)
      },
      {
        testName,
        operation: operationName,
        metadata: { type: 'transaction', testId }
      },
      config
    )
  }

  /**
   * Handle unique constraint violations
   */
  static async handleUniqueConstraintViolation<T>(
    operation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    testName: string
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      const errorType = ErrorClassifier.classifyError(error as Error)
      
      if (errorType === ErrorType.DATABASE_CONSTRAINT) {
        console.warn(`⚠️ Unique constraint violation in ${testName}, using fallback operation`)
        return await fallbackOperation()
      }
      
      throw error
    }
  }

  /**
   * Ensure database connection
   */
  static async ensureDatabaseConnection(maxAttempts: number = 3): Promise<void> {
    const recoveryManager = ErrorRecoveryManager.getInstance()
    
    await recoveryManager.executeWithRecovery(
      async () => {
        const prisma = testDatabaseManager.getClient()
        await prisma.$queryRaw`SELECT 1`
      },
      {
        testName: 'database-connection',
        operation: 'ensure-connection'
      },
      {
        maxRetries: maxAttempts,
        strategy: RecoveryStrategy.RETRY
      }
    )
  }
}

/**
 * Circuit Breaker
 * Prevents cascading failures by temporarily disabling operations
 */
export class CircuitBreaker {
  private failureCount = 0
  private lastFailureTime?: Date
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  constructor(
    private failureThreshold: number = 5,
    private resetTimeoutMs: number = 60000
  ) {}

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN'
      } else {
        throw new Error('Circuit breaker is OPEN - operation not allowed')
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.failureCount = 0
    this.state = 'CLOSED'
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = new Date()

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN'
    }
  }

  /**
   * Check if we should attempt to reset the circuit breaker
   */
  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) {
      return false
    }

    const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime()
    return timeSinceLastFailure >= this.resetTimeoutMs
  }

  /**
   * Get current state
   */
  getState(): string {
    return this.state
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.failureCount = 0
    this.lastFailureTime = undefined
    this.state = 'CLOSED'
  }
}

// Export singleton instances
export const errorRecoveryManager = ErrorRecoveryManager.getInstance()

// Export convenience functions
export const executeWithRecovery = (
  operation: () => Promise<any>,
  context: Partial<ErrorContext>,
  config?: Partial<RecoveryConfig>
) => errorRecoveryManager.executeWithRecovery(operation, context, config)

export const executeDatabaseOperation = DatabaseRecoveryHelper.executeWithRecovery
export const executeTransaction = DatabaseRecoveryHelper.executeTransactionWithRecovery
export const handleUniqueConstraint = DatabaseRecoveryHelper.handleUniqueConstraintViolation
export const ensureConnection = DatabaseRecoveryHelper.ensureDatabaseConnection