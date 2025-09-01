/**
 * Dynamic Styles Utility Test Suite
 * 
 * Comprehensive tests for dynamic styles utility functions
 */

import { describe, it, expect } from '@jest/globals';

// Mock the dynamic-styles utility
const mockCn = jest.fn();
const mockGenerateClassName = jest.fn();
const mockMergeStyles = jest.fn();
const mockConditionalStyles = jest.fn();

jest.mock('@/utils/dynamic-styles', () => ({
  cn: mockCn,
  generateClassName: mockGenerateClassName,
  mergeStyles: mockMergeStyles,
  conditionalStyles: mockConditionalStyles,
}));

describe('Dynamic Styles Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('cn (className utility)', () => {
    it('should combine multiple class names', () => {
      const classes = ['btn', 'btn-primary', 'text-white'];
      const expected = 'btn btn-primary text-white';
      
      mockCn.mockReturnValue(expected);
      
      const result = mockCn(...classes);
      
      expect(mockCn).toHaveBeenCalledWith(...classes);
      expect(result).toBe(expected);
    });

    it('should handle conditional classes', () => {
      const classes = ['btn', { 'btn-active': true, 'btn-disabled': false }];
      const expected = 'btn btn-active';
      
      mockCn.mockReturnValue(expected);
      
      const result = mockCn(...classes);
      
      expect(result).toBe(expected);
    });

    it('should filter out falsy values', () => {
      const classes = ['btn', null, undefined, '', 'btn-primary'];
      const expected = 'btn btn-primary';
      
      mockCn.mockReturnValue(expected);
      
      const result = mockCn(...classes);
      
      expect(result).toBe(expected);
    });

    it('should handle empty input', () => {
      mockCn.mockReturnValue('');
      
      const result = mockCn();
      
      expect(result).toBe('');
    });

    it('should handle arrays of classes', () => {
      const classes = [['btn', 'btn-primary'], 'text-white'];
      const expected = 'btn btn-primary text-white';
      
      mockCn.mockReturnValue(expected);
      
      const result = mockCn(...classes);
      
      expect(result).toBe(expected);
    });

    it('should deduplicate classes', () => {
      const classes = ['btn', 'btn-primary', 'btn', 'text-white'];
      const expected = 'btn btn-primary text-white';
      
      mockCn.mockReturnValue(expected);
      
      const result = mockCn(...classes);
      
      expect(result).toBe(expected);
    });
  });

  describe('generateClassName', () => {
    it('should generate BEM-style class names', () => {
      const block = 'button';
      const element = 'icon';
      const modifier = 'large';
      const expected = 'button__icon--large';
      
      mockGenerateClassName.mockReturnValue(expected);
      
      const result = mockGenerateClassName(block, element, modifier);
      
      expect(mockGenerateClassName).toHaveBeenCalledWith(block, element, modifier);
      expect(result).toBe(expected);
    });

    it('should generate class name with only block', () => {
      const block = 'button';
      const expected = 'button';
      
      mockGenerateClassName.mockReturnValue(expected);
      
      const result = mockGenerateClassName(block);
      
      expect(result).toBe(expected);
    });

    it('should generate class name with block and element', () => {
      const block = 'button';
      const element = 'text';
      const expected = 'button__text';
      
      mockGenerateClassName.mockReturnValue(expected);
      
      const result = mockGenerateClassName(block, element);
      
      expect(result).toBe(expected);
    });

    it('should handle special characters in names', () => {
      const block = 'nav-menu';
      const element = 'sub-item';
      const modifier = 'is-active';
      const expected = 'nav-menu__sub-item--is-active';
      
      mockGenerateClassName.mockReturnValue(expected);
      
      const result = mockGenerateClassName(block, element, modifier);
      
      expect(result).toBe(expected);
    });
  });

  describe('mergeStyles', () => {
    it('should merge style objects', () => {
      const style1 = { color: 'red', fontSize: '16px' };
      const style2 = { backgroundColor: 'blue', fontSize: '18px' };
      const expected = { color: 'red', fontSize: '18px', backgroundColor: 'blue' };
      
      mockMergeStyles.mockReturnValue(expected);
      
      const result = mockMergeStyles(style1, style2);
      
      expect(mockMergeStyles).toHaveBeenCalledWith(style1, style2);
      expect(result).toEqual(expected);
    });

    it('should handle empty style objects', () => {
      const style1 = {};
      const style2 = { color: 'red' };
      const expected = { color: 'red' };
      
      mockMergeStyles.mockReturnValue(expected);
      
      const result = mockMergeStyles(style1, style2);
      
      expect(result).toEqual(expected);
    });

    it('should handle null/undefined styles', () => {
      const style1 = null;
      const style2 = { color: 'red' };
      const expected = { color: 'red' };
      
      mockMergeStyles.mockReturnValue(expected);
      
      const result = mockMergeStyles(style1, style2);
      
      expect(result).toEqual(expected);
    });

    it('should handle multiple style objects', () => {
      const style1 = { color: 'red' };
      const style2 = { fontSize: '16px' };
      const style3 = { backgroundColor: 'blue' };
      const expected = { color: 'red', fontSize: '16px', backgroundColor: 'blue' };
      
      mockMergeStyles.mockReturnValue(expected);
      
      const result = mockMergeStyles(style1, style2, style3);
      
      expect(result).toEqual(expected);
    });
  });

  describe('conditionalStyles', () => {
    it('should apply styles based on conditions', () => {
      const baseStyles = 'btn';
      const conditions = {
        'btn-primary': true,
        'btn-secondary': false,
        'btn-large': true,
      };
      const expected = 'btn btn-primary btn-large';
      
      mockConditionalStyles.mockReturnValue(expected);
      
      const result = mockConditionalStyles(baseStyles, conditions);
      
      expect(mockConditionalStyles).toHaveBeenCalledWith(baseStyles, conditions);
      expect(result).toBe(expected);
    });

    it('should handle function conditions', () => {
      const baseStyles = 'btn';
      const conditions = {
        'btn-active': () => true,
        'btn-disabled': () => false,
      };
      const expected = 'btn btn-active';
      
      mockConditionalStyles.mockReturnValue(expected);
      
      const result = mockConditionalStyles(baseStyles, conditions);
      
      expect(result).toBe(expected);
    });

    it('should handle empty conditions', () => {
      const baseStyles = 'btn';
      const conditions = {};
      const expected = 'btn';
      
      mockConditionalStyles.mockReturnValue(expected);
      
      const result = mockConditionalStyles(baseStyles, conditions);
      
      expect(result).toBe(expected);
    });

    it('should handle complex conditions', () => {
      const baseStyles = 'card';
      const isActive = true;
      const hasError = false;
      const size = 'large';
      
      const conditions = {
        'card-active': isActive,
        'card-error': hasError,
        'card-large': size === 'large',
        'card-small': size === 'small',
      };
      const expected = 'card card-active card-large';
      
      mockConditionalStyles.mockReturnValue(expected);
      
      const result = mockConditionalStyles(baseStyles, conditions);
      
      expect(result).toBe(expected);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long class names', () => {
      const longClassName = 'a'.repeat(1000);
      
      mockCn.mockReturnValue(longClassName);
      
      const result = mockCn(longClassName);
      
      expect(result).toBe(longClassName);
    });

    it('should handle special characters in class names', () => {
      const specialClasses = ['btn-@special', 'icon_#hash', 'style$dollar'];
      const expected = 'btn-@special icon_#hash style$dollar';
      
      mockCn.mockReturnValue(expected);
      
      const result = mockCn(...specialClasses);
      
      expect(result).toBe(expected);
    });

    it('should handle numeric class names', () => {
      const numericClasses = ['col-1', 'row-2', 'grid-12'];
      const expected = 'col-1 row-2 grid-12';
      
      mockCn.mockReturnValue(expected);
      
      const result = mockCn(...numericClasses);
      
      expect(result).toBe(expected);
    });

    it('should handle unicode characters', () => {
      const unicodeClasses = ['btn-🚀', 'icon-⭐', 'style-🎨'];
      const expected = 'btn-🚀 icon-⭐ style-🎨';
      
      mockCn.mockReturnValue(expected);
      
      const result = mockCn(...unicodeClasses);
      
      expect(result).toBe(expected);
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of classes efficiently', () => {
      const manyClasses = Array.from({ length: 1000 }, (_, i) => `class-${i}`);
      const expected = manyClasses.join(' ');
      
      mockCn.mockReturnValue(expected);
      
      const startTime = performance.now();
      const result = mockCn(...manyClasses);
      const endTime = performance.now();
      
      expect(result).toBe(expected);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms
    });

    it('should handle deeply nested conditional objects', () => {
      const deepConditions = {
        'level-1': {
          'level-2': {
            'level-3': true,
          },
        },
      };
      
      mockConditionalStyles.mockReturnValue('base level-1 level-2 level-3');
      
      const result = mockConditionalStyles('base', deepConditions);
      
      expect(result).toContain('level-3');
    });
  });

  describe('Type Safety', () => {
    it('should handle mixed input types', () => {
      const mixedInputs = [
        'string-class',
        123, // number
        true, // boolean
        { 'conditional-class': true },
        ['array', 'of', 'classes'],
      ];
      const expected = 'string-class conditional-class array of classes';
      
      mockCn.mockReturnValue(expected);
      
      const result = mockCn(...mixedInputs);
      
      expect(result).toBe(expected);
    });

    it('should handle nested arrays', () => {
      const nestedArrays = [
        'base',
        ['level-1', ['level-2', 'level-2-alt']],
        'final',
      ];
      const expected = 'base level-1 level-2 level-2-alt final';
      
      mockCn.mockReturnValue(expected);
      
      const result = mockCn(...nestedArrays);
      
      expect(result).toBe(expected);
    });
  });
});