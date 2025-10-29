/**
 * Keyboard Shortcuts Component for Kin Workspace CMS
 * 
 * Provides global keyboard shortcuts for improved productivity and accessibility.
 * Includes shortcuts for navigation, actions, and common operations.
 * 
 * Features:
 * - Global keyboard event handling
 * - Context-aware shortcuts
 * - Visual shortcut indicators
 * - Accessibility support
 * - Customizable key bindings
 * 
 * @module KeyboardShortcuts
 * @version 1.0.0
 * @author Kin Workspace CMS Team
 * @since 2024-02-09
 */

'use client'

import { useEffect, useCallback, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { Dialog, DialogPanel, DialogTitle, Transition } from './CustomModal'
import { Fragment } from 'react'
import { 
  CommandLineIcon, 
  XMarkIcon
} from './Icons'

/**
 * Keyboard shortcut configuration interface
 */
interface KeyboardShortcut {
  /** Unique identifier for the shortcut */
  id: string
  /** Human-readable description */
  description: string
  /** Key combination (e.g., 'cmd+k', 'ctrl+shift+n') */
  keys: string
  /** Function to execute when shortcut is triggered */
  action: () => void
  /** Whether shortcut is available in current context */
  enabled?: boolean
  /** Category for grouping shortcuts */
  category: 'navigation' | 'actions' | 'editing' | 'global'
}

/**
 * Shortcut help modal props
 */
interface ShortcutHelpProps {
  isOpen: boolean
  onClose: () => void
  shortcuts: KeyboardShortcut[]
}

/**
 * Parse key combination string into modifier keys and main key
 */
function parseKeyCombo(keys: string): {
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  altKey: boolean
  key: string
} {
  const parts = keys.toLowerCase().split('+')
  const mainKey = parts[parts.length - 1]
  
  return {
    ctrlKey: parts.includes('ctrl'),
    metaKey: parts.includes('cmd') || parts.includes('meta'),
    shiftKey: parts.includes('shift'),
    altKey: parts.includes('alt'),
    key: mainKey
  }
}

/**
 * Check if keyboard event matches shortcut configuration
 */
function matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  const combo = parseKeyCombo(shortcut.keys)
  
  return (
    event.key.toLowerCase() === combo.key &&
    event.ctrlKey === combo.ctrlKey &&
    event.metaKey === combo.metaKey &&
    event.shiftKey === combo.shiftKey &&
    event.altKey === combo.altKey
  )
}

/**
 * Format key combination for display
 */
function formatKeyCombo(keys: string): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0
  
  return keys
    .split('+')
    .map(key => {
      switch (key.toLowerCase()) {
        case 'cmd':
        case 'meta':
          return isMac ? '⌘' : 'Ctrl'
        case 'ctrl':
          return isMac ? '⌃' : 'Ctrl'
        case 'shift':
          return isMac ? '⇧' : 'Shift'
        case 'alt':
          return isMac ? '⌥' : 'Alt'
        case 'enter':
          return '↵'
        case 'escape':
          return 'Esc'
        case 'backspace':
          return '⌫'
        case 'delete':
          return '⌦'
        case 'tab':
          return '⇥'
        case 'space':
          return 'Space'
        default:
          return key.toUpperCase()
      }
    })
    .join(isMac ? '' : '+')
}

/**
 * Shortcut help modal component
 */
function ShortcutHelp({ isOpen, onClose, shortcuts }: ShortcutHelpProps) {
  const categories = {
    global: 'Global',
    navigation: 'Navigation',
    actions: 'Actions',
    editing: 'Editing'
  }

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, KeyboardShortcut[]>)

  return (
    <Dialog isOpen={isOpen} onClose={onClose} className="relative z-50">
      <div className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
        <div className="flex items-center justify-between mb-6">
          <DialogTitle
            as="h3"
            className="text-lg font-medium leading-6 text-gray-900 flex items-center"
          >
            <CommandLineIcon className="h-5 w-5 mr-2" />
            Keyboard Shortcuts
          </DialogTitle>
          <button
            type="button"
            className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={onClose}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

                <div className="space-y-6">
                  {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                    <div key={category}>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">
                        {categories[category as keyof typeof categories]}
                      </h4>
                      <div className="space-y-2">
                        {categoryShortcuts.map((shortcut) => (
                          <div
                            key={shortcut.id}
                            className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50"
                          >
                            <span className="text-sm text-gray-700">
                              {shortcut.description}
                            </span>
                            <kbd className="inline-flex items-center px-2 py-1 text-xs font-mono text-gray-600 bg-white border border-gray-200 rounded">
                              {formatKeyCombo(shortcut.keys)}
                            </kbd>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Press <kbd className="px-1 py-0.5 text-xs font-mono bg-gray-100 border border-gray-200 rounded">?</kbd> to toggle this help
                  </p>
                </div>
      </div>
    </Dialog>
  )
}

/**
 * Main keyboard shortcuts hook and component
 */
export default function KeyboardShortcuts() {
  const router = useRouter()
  const pathname = usePathname()
  const [showHelp, setShowHelp] = useState(false)

  /**
   * Define all keyboard shortcuts
   */
  const shortcuts: KeyboardShortcut[] = useMemo(() => [
    // Global shortcuts
    {
      id: 'help',
      description: 'Show keyboard shortcuts',
      keys: '?',
      action: () => setShowHelp(true),
      category: 'global'
    },
    {
      id: 'search',
      description: 'Global search',
      keys: 'cmd+k',
      action: () => {
        // TODO: Implement global search modal
        console.log('Global search triggered')
      },
      category: 'global'
    },
    {
      id: 'settings',
      description: 'Open settings',
      keys: 'cmd+,',
      action: () => router.push('/settings'),
      category: 'global'
    },
    
    // Navigation shortcuts
    {
      id: 'dashboard',
      description: 'Go to dashboard',
      keys: 'g+d',
      action: () => router.push('/'),
      category: 'navigation'
    },
    {
      id: 'products',
      description: 'Go to products',
      keys: 'g+p',
      action: () => router.push('/admin/products'),
      category: 'navigation'
    },
    {
      id: 'users',
      description: 'Go to users',
      keys: 'g+u',
      action: () => router.push('/admin/users'),
      category: 'navigation'
    },
    {
      id: 'media',
      description: 'Go to media library',
      keys: 'g+m',
      action: () => router.push('/media'),
      category: 'navigation'
    },
    {
      id: 'analytics',
      description: 'Go to analytics',
      keys: 'g+a',
      action: () => router.push('/admin/analytics'),
      category: 'navigation'
    },

    // Action shortcuts
    {
      id: 'new-product',
      description: 'Create new product',
      keys: 'cmd+shift+p',
      action: () => router.push('/admin/products/new'),
      enabled: pathname.startsWith('/admin/products'),
      category: 'actions'
    },
    {
      id: 'new-user',
      description: 'Create new user',
      keys: 'cmd+shift+u',
      action: () => router.push('/admin/users/new'),
      enabled: pathname.startsWith('/admin/users'),
      category: 'actions'
    },
    {
      id: 'refresh',
      description: 'Refresh page',
      keys: 'cmd+r',
      action: () => window.location.reload(),
      category: 'actions'
    },

    // Editing shortcuts
    {
      id: 'save',
      description: 'Save current form',
      keys: 'cmd+s',
      action: () => {
        // Trigger save on current form
        const saveButton = document.querySelector('[type="submit"]') as HTMLButtonElement
        if (saveButton) {
          saveButton.click()
        }
      },
      category: 'editing'
    },
    {
      id: 'cancel',
      description: 'Cancel current action',
      keys: 'escape',
      action: () => {
        // Close modals or go back
        const cancelButton = document.querySelector('[data-cancel]') as HTMLButtonElement
        if (cancelButton) {
          cancelButton.click()
        } else {
          router.back()
        }
      },
      category: 'editing'
    }
  ], [router, pathname])

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      // Only allow global shortcuts like help and search
      if (!['?', 'cmd+k', 'escape'].some(key => {
        const shortcut = shortcuts.find(s => s.keys === key)
        return shortcut && matchesShortcut(event, shortcut)
      })) {
        return
      }
    }

    // Find matching shortcut
    const matchingShortcut = shortcuts.find(shortcut => {
      return (
        matchesShortcut(event, shortcut) &&
        (shortcut.enabled === undefined || shortcut.enabled)
      )
    })

    if (matchingShortcut) {
      event.preventDefault()
      event.stopPropagation()
      matchingShortcut.action()
    }
  }, [shortcuts])

  /**
   * Set up keyboard event listeners
   */
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <>
      {/* Keyboard shortcut indicators */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          className="inline-flex items-center px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Keyboard shortcuts (Press ? for help)"
        >
          <CommandLineIcon className="h-4 w-4 mr-1" />
          <kbd className="font-mono">?</kbd>
        </button>
      </div>

      {/* Help modal */}
      <ShortcutHelp
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        shortcuts={shortcuts}
      />
    </>
  )
}

/**
 * Hook for using keyboard shortcuts in components
 */
export function useKeyboardShortcut(
  keys: string,
  callback: () => void,
  deps: React.DependencyList = []
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const combo = parseKeyCombo(keys)
      
      if (
        event.key.toLowerCase() === combo.key &&
        event.ctrlKey === combo.ctrlKey &&
        event.metaKey === combo.metaKey &&
        event.shiftKey === combo.shiftKey &&
        event.altKey === combo.altKey
      ) {
        event.preventDefault()
        callback()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys, callback, ...deps])
}