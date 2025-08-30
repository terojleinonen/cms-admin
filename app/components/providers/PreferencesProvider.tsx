/**
 * Preferences Provider Component
 * Provides user preferences context throughout the application
 */

'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { usePreferences, UserPreferences } from '@/lib/hooks/usePreferences'

interface PreferencesContextType {
  preferences: UserPreferences | null
  isLoading: boolean
  error: string | null
  isUpdating: boolean
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<UserPreferences>
  invalidateCache: () => void
  refetch: () => Promise<void>
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined)

interface PreferencesProviderProps {
  children: ReactNode
}

/**
 * Provider component that wraps the app and provides preferences context
 */
export function PreferencesProvider({ children }: PreferencesProviderProps) {
  const preferencesHook = usePreferences()

  return (
    <PreferencesContext.Provider value={preferencesHook}>
      {children}
    </PreferencesContext.Provider>
  )
}

/**
 * Hook to access preferences context
 */
export function usePreferencesContext(): PreferencesContextType {
  const context = useContext(PreferencesContext)
  
  if (context === undefined) {
    throw new Error('usePreferencesContext must be used within a PreferencesProvider')
  }
  
  return context
}

/**
 * Higher-order component to inject preferences into components
 */
export function withPreferences<P extends object>(
  Component: React.ComponentType<P & { preferences: UserPreferences | null }>
) {
  return function WrappedComponent(props: P) {
    const { preferences } = usePreferencesContext()
    
    return <Component {...props} preferences={preferences} />
  }
}