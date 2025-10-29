/**
 * Consolidated Testing Utilities Index
 * Central export for all testing utilities
 */

// Core testing utilities
export * from './test-utils'
export * from './component-test-utils'

// Setup and configuration
export * from './test-helpers'

// Re-export commonly used testing functions
export {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  renderHook,
} from '@testing-library/react'

export {
  jest,
} from '@jest/globals'