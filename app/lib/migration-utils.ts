/**
 * Migration utilities for replacing deprecated libraries with native functions
 * This module provides safe replacements for deprecated packages with fallback mechanisms
 */

import { isDeepStrictEqual } from 'node:util';

/**
 * Error types for migration utilities
 */
export class MigrationError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'MigrationError';
  }
}

/**
 * Safe replacement for lodash.isequal using Node.js native util.isDeepStrictEqual
 * Provides comprehensive deep equality checking with fallback mechanisms
 * 
 * @param a - First value to compare
 * @param b - Second value to compare
 * @returns true if values are deeply equal, false otherwise
 */
export function isDeepEqual(a: unknown, b: unknown): boolean {
  try {
    // Use Node.js native deep strict equal comparison
    return isDeepStrictEqual(a, b);
  } catch (error) {
    // Fallback to basic comparison for edge cases
    console.warn('Native isDeepStrictEqual failed, using fallback:', error);
    return fallbackDeepEqual(a, b);
  }
}

/**
 * Fallback deep equality implementation for edge cases where native function fails
 * This is a simplified version that handles most common cases
 */
function fallbackDeepEqual(a: unknown, b: unknown): boolean {
  // Handle primitive types and null/undefined
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!fallbackDeepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  // Handle objects
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!fallbackDeepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

/**
 * Native DOMException wrapper with comprehensive error handling
 * Replaces node-domexception with platform-native DOMException
 * 
 * @param message - Error message
 * @param name - Error name (optional)
 * @returns Native DOMException instance
 */
export function createDOMException(message: string, name?: string): DOMException {
  try {
    // Use platform-native DOMException
    return new DOMException(message, name);
  } catch (error) {
    // Fallback for environments where DOMException is not available
    console.warn('Native DOMException not available, using fallback:', error);
    return createFallbackDOMException(message, name);
  }
}

/**
 * Fallback DOMException implementation for environments without native support
 * Creates an Error-like object that mimics DOMException behavior
 */
function createFallbackDOMException(message: string, name?: string): DOMException {
  const error = new Error(message) as Error & { name: string; code: number };
  error.name = name || 'DOMException';
  error.code = getDOMExceptionCode(name);
  
  // Add DOMException-specific properties
  Object.defineProperty(error, 'message', {
    value: message,
    writable: false,
    enumerable: true,
    configurable: true
  });

  return error as DOMException;
}

/**
 * Get standard DOMException error codes
 */
function getDOMExceptionCode(name?: string): number {
  const codes: Record<string, number> = {
    'IndexSizeError': 1,
    'HierarchyRequestError': 3,
    'WrongDocumentError': 4,
    'InvalidCharacterError': 5,
    'NoModificationAllowedError': 7,
    'NotFoundError': 8,
    'NotSupportedError': 9,
    'InvalidStateError': 11,
    'SyntaxError': 12,
    'InvalidModificationError': 13,
    'NamespaceError': 14,
    'InvalidAccessError': 15,
    'TypeMismatchError': 17,
    'SecurityError': 18,
    'NetworkError': 19,
    'AbortError': 20,
    'URLMismatchError': 21,
    'QuotaExceededError': 22,
    'TimeoutError': 23,
    'InvalidNodeTypeError': 24,
    'DataCloneError': 25
  };

  return codes[name || 'DOMException'] || 0;
}

/**
 * Utility to safely migrate from deprecated functions with validation
 * Provides a wrapper that validates both old and new function behavior
 * 
 * @param oldFunction - The deprecated function
 * @param newFunction - The replacement function
 * @param validator - Optional validation function to ensure compatibility
 * @returns Wrapped function that uses new implementation with validation
 */
export function safeReplace<T extends (...args: unknown[]) => unknown>(
  oldFunction: T,
  newFunction: T,
  validator?: (oldResult: ReturnType<T>, newResult: ReturnType<T>, ...args: Parameters<T>) => boolean
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    try {
      const newResult = newFunction(...args);
      
      // If validator is provided, compare results
      if (validator && typeof oldFunction === 'function') {
        try {
          const oldResult = oldFunction(...args);
          if (!validator(oldResult, newResult, ...args)) {
            console.warn('Migration validation failed, results differ:', {
              old: oldResult,
              new: newResult,
              args
            });
          }
        } catch (error) {
          // Old function failed, but new one succeeded - this is expected during migration
          console.info('Old function failed (expected during migration):', error);
        }
      }
      
      return newResult;
    } catch (error) {
      throw new MigrationError(
        `Migration function failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }) as T;
}

/**
 * Performance comparison utility for migration validation
 * Compares performance characteristics of old vs new functions
 * 
 * @param oldFunction - The deprecated function
 * @param newFunction - The replacement function
 * @param testArgs - Array of test argument sets
 * @param iterations - Number of iterations for performance testing
 * @returns Performance comparison results
 */
export function comparePerformance<T extends (...args: unknown[]) => unknown>(
  oldFunction: T,
  newFunction: T,
  testArgs: Parameters<T>[],
  iterations: number = 1000
): {
  oldTime: number;
  newTime: number;
  improvement: number;
  results: { old: ReturnType<T>; new: ReturnType<T>; args: Parameters<T> }[];
} {
  const results: { old: ReturnType<T>; new: ReturnType<T>; args: Parameters<T> }[] = [];
  
  // Test old function
  const oldStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    for (const args of testArgs) {
      try {
        const result = oldFunction(...args);
        if (i === 0) results.push({ old: result, new: undefined as ReturnType<T>, args });
      } catch (error) {
        // Ignore errors during performance testing
      }
    }
  }
  const oldTime = performance.now() - oldStart;

  // Test new function
  const newStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    for (const args of testArgs) {
      try {
        const result = newFunction(...args);
        if (i === 0 && results[testArgs.indexOf(args)]) {
          results[testArgs.indexOf(args)].new = result;
        }
      } catch (error) {
        // Ignore errors during performance testing
      }
    }
  }
  const newTime = performance.now() - newStart;

  const improvement = oldTime > 0 ? ((oldTime - newTime) / oldTime) * 100 : 0;

  return {
    oldTime,
    newTime,
    improvement,
    results
  };
}

/**
 * Validation utilities for ensuring migration correctness
 */
export const migrationValidators = {
  /**
   * Validates that deep equality functions produce the same results
   */
  deepEqualValidator: (oldResult: boolean, newResult: boolean): boolean => {
    return oldResult === newResult;
  },

  /**
   * Validates that DOMException objects have the same essential properties
   */
  domExceptionValidator: (oldResult: DOMException, newResult: DOMException): boolean => {
    return oldResult.message === newResult.message && 
           oldResult.name === newResult.name;
  }
};

/**
 * Migration status tracking
 */
export interface MigrationStatus {
  packageName: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  replacementFunction: string;
  testsPassed: boolean;
  performanceImprovement?: number;
  errors?: string[];
}

/**
 * Track migration progress for reporting
 */
export class MigrationTracker {
  private migrations: Map<string, MigrationStatus> = new Map();

  addMigration(packageName: string, replacementFunction: string): void {
    this.migrations.set(packageName, {
      packageName,
      status: 'pending',
      replacementFunction,
      testsPassed: false
    });
  }

  updateStatus(packageName: string, updates: Partial<MigrationStatus>): void {
    const current = this.migrations.get(packageName);
    if (current) {
      this.migrations.set(packageName, { ...current, ...updates });
    }
  }

  getStatus(packageName: string): MigrationStatus | undefined {
    return this.migrations.get(packageName);
  }

  getAllStatuses(): MigrationStatus[] {
    return Array.from(this.migrations.values());
  }

  generateReport(): string {
    const statuses = this.getAllStatuses();
    const lines: string[] = [];

    lines.push('# Migration Status Report');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    const completed = statuses.filter(s => s.status === 'completed').length;
    const failed = statuses.filter(s => s.status === 'failed').length;
    const pending = statuses.filter(s => s.status === 'pending').length;

    lines.push(`## Summary`);
    lines.push(`- Total migrations: ${statuses.length}`);
    lines.push(`- Completed: ${completed}`);
    lines.push(`- Failed: ${failed}`);
    lines.push(`- Pending: ${pending}`);
    lines.push('');

    lines.push('## Migration Details');
    for (const status of statuses) {
      lines.push(`### ${status.packageName}`);
      lines.push(`- Status: ${status.status}`);
      lines.push(`- Replacement: ${status.replacementFunction}`);
      lines.push(`- Tests passed: ${status.testsPassed}`);
      if (status.performanceImprovement !== undefined) {
        lines.push(`- Performance improvement: ${status.performanceImprovement.toFixed(2)}%`);
      }
      if (status.errors && status.errors.length > 0) {
        lines.push(`- Errors: ${status.errors.join(', ')}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

// Export commonly used instances
export const migrationTracker = new MigrationTracker();

// Initialize tracking for known deprecated packages
migrationTracker.addMigration('lodash.isequal', 'util.isDeepStrictEqual');
migrationTracker.addMigration('node-domexception', 'native DOMException');