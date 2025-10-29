/**
 * Component Testing Utilities
 * React component testing helpers and providers
 */

import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jest } from '@jest/globals'

// Mock Next.js router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  pathname: '/',
  route: '/',
  query: {},
  asPath: '/',
  basePath: '',
  isLocaleDomain: true,
  isReady: true,
  isPreview: false,
}

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="test-wrapper">{children}</div>
}

// Custom render function with providers
export const renderWithProviders = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: TestWrapper, ...options })
  }
}

// Form testing utilities
export function fillForm(user: any, formData: Record<string, string>) {
  return Promise.all(
    Object.entries(formData).map(async ([field, value]) => {
      const input = document.querySelector(`[name="${field}"]`) as HTMLInputElement
      if (input) {
        await user.clear(input)
        await user.type(input, value)
      }
    })
  )
}

export function submitForm(user: any, formSelector = 'form') {
  const form = document.querySelector(formSelector) as HTMLFormElement
  return user.click(form.querySelector('[type="submit"]') || form.querySelector('button'))
}

// Re-export testing library utilities
export * from '@testing-library/react'
export { renderWithProviders as render }