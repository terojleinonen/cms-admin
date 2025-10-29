/**
 * Unit tests for migration utilities
 * Tests native function replacements for deprecated libraries
 */

import {
  isDeepEqual,
  createDOMException,
  safeReplace,
  comparePerformance,
  migrationValidators,
  MigrationTracker,
  migrationTracker,
  MigrationError
} from '@/lib/migration-utils';

describe('Migration Utilities', () => {
  describe('isDeepEqual function', () => {
    it('should correctly compare primitive values', () => {
      expect(isDeepEqual(1, 1)).toBe(true);
      expect(isDeepEqual('hello', 'hello')).toBe(true);
      expect(isDeepEqual(true, true)).toBe(true);
      expect(isDeepEqual(null, null)).toBe(true);
      expect(isDeepEqual(undefined, undefined)).toBe(true);
      
      expect(isDeepEqual(1, 2)).toBe(false);
      expect(isDeepEqual('hello', 'world')).toBe(false);
      expect(isDeepEqual(true, false)).toBe(false);
      expect(isDeepEqual(null, undefined)).toBe(false);
    });

    it('should correctly compare arrays', () => {
      expect(isDeepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(isDeepEqual(['a', 'b'], ['a', 'b'])).toBe(true);
      expect(isDeepEqual([], [])).toBe(true);
      
      expect(isDeepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
      expect(isDeepEqual([1, 2], [1, 2, 3])).toBe(false);
      expect(isDeepEqual(['a'], ['b'])).toBe(false);
    });

    it('should correctly compare nested arrays', () => {
      expect(isDeepEqual([[1, 2], [3, 4]], [[1, 2], [3, 4]])).toBe(true);
      expect(isDeepEqual([['a'], ['b']], [['a'], ['b']])).toBe(true);
      
      expect(isDeepEqual([[1, 2], [3, 4]], [[1, 2], [3, 5]])).toBe(false);
      expect(isDeepEqual([['a'], ['b']], [['a'], ['c']])).toBe(false);
    });

    it('should correctly compare objects', () => {
      expect(isDeepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      expect(isDeepEqual({ name: 'test' }, { name: 'test' })).toBe(true);
      expect(isDeepEqual({}, {})).toBe(true);
      
      expect(isDeepEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
      expect(isDeepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
      expect(isDeepEqual({ name: 'test' }, { name: 'other' })).toBe(false);
    });

    it('should correctly compare nested objects', () => {
      const obj1 = { user: { name: 'John', age: 30 }, active: true };
      const obj2 = { user: { name: 'John', age: 30 }, active: true };
      const obj3 = { user: { name: 'John', age: 31 }, active: true };
      
      expect(isDeepEqual(obj1, obj2)).toBe(true);
      expect(isDeepEqual(obj1, obj3)).toBe(false);
    });

    it('should handle complex mixed data structures', () => {
      const complex1 = {
        users: [
          { id: 1, name: 'John', tags: ['admin', 'user'] },
          { id: 2, name: 'Jane', tags: ['user'] }
        ],
        meta: { count: 2, active: true }
      };
      
      const complex2 = {
        users: [
          { id: 1, name: 'John', tags: ['admin', 'user'] },
          { id: 2, name: 'Jane', tags: ['user'] }
        ],
        meta: { count: 2, active: true }
      };
      
      const complex3 = {
        users: [
          { id: 1, name: 'John', tags: ['admin', 'user'] },
          { id: 2, name: 'Jane', tags: ['editor'] }
        ],
        meta: { count: 2, active: true }
      };
      
      expect(isDeepEqual(complex1, complex2)).toBe(true);
      expect(isDeepEqual(complex1, complex3)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isDeepEqual(NaN, NaN)).toBe(true);
      expect(isDeepEqual(0, -0)).toBe(false);
      expect(isDeepEqual(new Date('2023-01-01'), new Date('2023-01-01'))).toBe(true);
      expect(isDeepEqual(new Date('2023-01-01'), new Date('2023-01-02'))).toBe(false);
    });

    it('should handle circular references gracefully', () => {
      const obj1: any = { a: 1 };
      obj1.self = obj1;
      
      const obj2: any = { a: 1 };
      obj2.self = obj2;
      
      // Should not throw an error, even if result varies
      expect(() => isDeepEqual(obj1, obj2)).not.toThrow();
    });
  });

  describe('createDOMException function', () => {
    it('should create DOMException with message only', () => {
      const exception = createDOMException('Test error');
      
      // In Node.js test environment, DOMException might not be available, so we use fallback
      expect(exception.message).toBe('Test error');
      // Name could be 'DOMException' or 'Error' depending on environment
      expect(['DOMException', 'Error']).toContain(exception.name);
    });

    it('should create DOMException with message and name', () => {
      const exception = createDOMException('Invalid state', 'InvalidStateError');
      
      expect(exception.message).toBe('Invalid state');
      expect(exception.name).toBe('InvalidStateError');
    });

    it('should create different types of DOMExceptions', () => {
      const types = [
        'NotFoundError',
        'InvalidStateError',
        'SecurityError',
        'NetworkError',
        'AbortError',
        'QuotaExceededError'
      ];
      
      types.forEach(type => {
        const exception = createDOMException(`Test ${type}`, type);
        expect(exception.name).toBe(type);
        expect(exception.message).toBe(`Test ${type}`);
      });
    });

    it('should handle fallback when native DOMException is not available', () => {
      // Mock DOMException to throw an error
      const originalDOMException = global.DOMException;
      (global as any).DOMException = undefined;
      
      const exception = createDOMException('Fallback test', 'TestError');
      
      expect(exception.message).toBe('Fallback test');
      expect(exception.name).toBe('TestError');
      
      // Restore original
      (global as any).DOMException = originalDOMException;
    });
  });

  describe('safeReplace function', () => {
    it('should use new function when it works correctly', () => {
      const oldFn = (x: number) => x * 2;
      const newFn = (x: number) => x + x; // Same result, different implementation
      
      const safeFn = safeReplace(oldFn, newFn);
      
      expect(safeFn(5)).toBe(10);
      expect(safeFn(0)).toBe(0);
      expect(safeFn(-3)).toBe(-6);
    });

    it('should handle new function errors gracefully', () => {
      const oldFn = (x: number) => x * 2;
      const newFn = (x: number) => {
        if (x < 0) throw new Error('Negative not allowed');
        return x * 2;
      };
      
      const safeFn = safeReplace(oldFn, newFn);
      
      expect(safeFn(5)).toBe(10);
      expect(() => safeFn(-3)).toThrow(MigrationError);
    });

    it('should use validator when provided', () => {
      const oldFn = (x: number) => Math.round(x * 2);
      const newFn = (x: number) => x + x;
      const validator = (oldResult: number, newResult: number) => oldResult === newResult;
      
      const safeFn = safeReplace(oldFn, newFn, validator);
      
      expect(safeFn(5)).toBe(10); // Both functions return 10
      expect(safeFn(2.7)).toBe(5.4); // Old: 5, New: 5.4 - validator will log warning
    });
  });

  describe('comparePerformance function', () => {
    it('should compare performance of two functions', () => {
      const slowFn = (x: number) => {
        // Simulate slow operation
        let result = x;
        for (let i = 0; i < 1000; i++) {
          result = Math.sqrt(result + i);
        }
        return result;
      };
      
      const fastFn = (x: number) => x * 2;
      
      const comparison = comparePerformance(
        slowFn,
        fastFn,
        [[1], [2], [3]],
        10 // Small number for testing
      );
      
      expect(comparison.oldTime).toBeGreaterThan(0);
      expect(comparison.newTime).toBeGreaterThan(0);
      expect(comparison.improvement).toBeGreaterThan(0); // Fast function should be better
      expect(comparison.results).toHaveLength(3);
    });

    it('should handle function errors during performance testing', () => {
      const errorFn = () => { throw new Error('Test error'); };
      const workingFn = (x: number) => x * 2;
      
      expect(() => comparePerformance(
        errorFn,
        workingFn,
        [[1], [2]],
        5
      )).not.toThrow();
    });
  });

  describe('migrationValidators', () => {
    it('should validate deep equality results', () => {
      expect(migrationValidators.deepEqualValidator(true, true)).toBe(true);
      expect(migrationValidators.deepEqualValidator(false, false)).toBe(true);
      expect(migrationValidators.deepEqualValidator(true, false)).toBe(false);
      expect(migrationValidators.deepEqualValidator(false, true)).toBe(false);
    });

    it('should validate DOMException results', () => {
      const ex1 = createDOMException('Test', 'TestError');
      const ex2 = createDOMException('Test', 'TestError');
      const ex3 = createDOMException('Different', 'TestError');
      
      expect(migrationValidators.domExceptionValidator(ex1, ex2)).toBe(true);
      expect(migrationValidators.domExceptionValidator(ex1, ex3)).toBe(false);
    });
  });

  describe('MigrationTracker', () => {
    let tracker: MigrationTracker;

    beforeEach(() => {
      tracker = new MigrationTracker();
    });

    it('should add and track migrations', () => {
      tracker.addMigration('test-package', 'native-function');
      
      const status = tracker.getStatus('test-package');
      expect(status).toBeDefined();
      expect(status?.packageName).toBe('test-package');
      expect(status?.replacementFunction).toBe('native-function');
      expect(status?.status).toBe('pending');
      expect(status?.testsPassed).toBe(false);
    });

    it('should update migration status', () => {
      tracker.addMigration('test-package', 'native-function');
      tracker.updateStatus('test-package', {
        status: 'completed',
        testsPassed: true,
        performanceImprovement: 25.5
      });
      
      const status = tracker.getStatus('test-package');
      expect(status?.status).toBe('completed');
      expect(status?.testsPassed).toBe(true);
      expect(status?.performanceImprovement).toBe(25.5);
    });

    it('should get all migration statuses', () => {
      tracker.addMigration('package1', 'function1');
      tracker.addMigration('package2', 'function2');
      
      const allStatuses = tracker.getAllStatuses();
      expect(allStatuses).toHaveLength(2);
      expect(allStatuses.map(s => s.packageName)).toContain('package1');
      expect(allStatuses.map(s => s.packageName)).toContain('package2');
    });

    it('should generate migration report', () => {
      tracker.addMigration('completed-package', 'native-fn');
      tracker.updateStatus('completed-package', { status: 'completed', testsPassed: true });
      
      tracker.addMigration('failed-package', 'other-fn');
      tracker.updateStatus('failed-package', { 
        status: 'failed', 
        testsPassed: false,
        errors: ['Test error', 'Validation failed']
      });
      
      const report = tracker.generateReport();
      
      expect(report).toContain('Migration Status Report');
      expect(report).toContain('Total migrations: 2');
      expect(report).toContain('Completed: 1');
      expect(report).toContain('Failed: 1');
      expect(report).toContain('completed-package');
      expect(report).toContain('failed-package');
      expect(report).toContain('Test error, Validation failed');
    });
  });

  describe('Global migration tracker', () => {
    it('should have pre-initialized migrations for known deprecated packages', () => {
      const lodashStatus = migrationTracker.getStatus('lodash.isequal');
      const domExceptionStatus = migrationTracker.getStatus('node-domexception');
      
      expect(lodashStatus).toBeDefined();
      expect(lodashStatus?.replacementFunction).toBe('util.isDeepStrictEqual');
      
      expect(domExceptionStatus).toBeDefined();
      expect(domExceptionStatus?.replacementFunction).toBe('native DOMException');
    });
  });

  describe('Performance validation against deprecated functions', () => {
    // Mock lodash.isequal for testing (since it's deprecated)
    const mockLodashIsEqual = (a: any, b: any): boolean => {
      // Simplified lodash.isequal implementation for testing
      if (a === b) return true;
      if (a == null || b == null) return a === b;
      if (typeof a !== typeof b) return false;
      
      if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
          if (!mockLodashIsEqual(a[i], b[i])) return false;
        }
        return true;
      }
      
      if (typeof a === 'object' && typeof b === 'object') {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        for (const key of keysA) {
          if (!keysB.includes(key) || !mockLodashIsEqual(a[key], b[key])) return false;
        }
        return true;
      }
      
      return false;
    };

    it('should produce same results as lodash.isequal for common cases', () => {
      const testCases = [
        [1, 1],
        ['hello', 'hello'],
        [true, false],
        [[1, 2, 3], [1, 2, 3]],
        [{ a: 1, b: 2 }, { a: 1, b: 2 }],
        [{ a: 1, b: 2 }, { a: 1, b: 3 }],
        [null, null],
        [undefined, undefined],
        [null, undefined]
      ];
      
      testCases.forEach(([a, b]) => {
        const lodashResult = mockLodashIsEqual(a, b);
        const nativeResult = isDeepEqual(a, b);
        
        expect(nativeResult).toBe(lodashResult);
      });
    });

    it('should validate performance characteristics', () => {
      const testData = [
        [{ a: 1, b: 2 }, { a: 1, b: 2 }],
        [[1, 2, 3, 4, 5], [1, 2, 3, 4, 5]],
        ['simple string', 'simple string'],
        [42, 42]
      ];
      
      const comparison = comparePerformance(
        mockLodashIsEqual,
        isDeepEqual,
        testData,
        50 // Reduce iterations for more stable test timing
      );
      
      // Both functions should complete successfully
      expect(comparison.oldTime).toBeGreaterThan(0);
      expect(comparison.newTime).toBeGreaterThan(0);
      
      // Results should be identical
      comparison.results.forEach(result => {
        expect(result.old).toBe(result.new);
      });
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle MigrationError properly', () => {
      const error = new MigrationError('Test migration error');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(MigrationError);
      expect(error.name).toBe('MigrationError');
      expect(error.message).toBe('Test migration error');
    });

    it('should handle MigrationError with original error', () => {
      const originalError = new Error('Original error');
      const migrationError = new MigrationError('Migration failed', originalError);
      
      expect(migrationError.originalError).toBe(originalError);
    });

    it('should handle very large objects in isDeepEqual', () => {
      const largeObj1 = { data: new Array(1000).fill(0).map((_, i) => ({ id: i, value: i * 2 })) };
      const largeObj2 = { data: new Array(1000).fill(0).map((_, i) => ({ id: i, value: i * 2 })) };
      const largeObj3 = { data: new Array(1000).fill(0).map((_, i) => ({ id: i, value: i * 3 })) };
      
      expect(isDeepEqual(largeObj1, largeObj2)).toBe(true);
      expect(isDeepEqual(largeObj1, largeObj3)).toBe(false);
    });
  });
});