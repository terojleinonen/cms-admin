/**
 * Custom Modal Component
 * Lightweight replacement for Headless UI Dialog components
 * Built with Tailwind CSS and native React
 */

'use client'

import { Fragment, ReactNode, useEffect, useRef, useState } from 'react'
import { XMarkIcon } from './Icons'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  actions?: ReactNode
}

interface TransitionProps {
  show: boolean
  children: ReactNode
  enter?: string
  enterFrom?: string
  enterTo?: string
  leave?: string
  leaveFrom?: string
  leaveTo?: string
  className?: string
}

/**
 * Simple transition component for animations
 */
function Transition({ 
  show, 
  children, 
  enter = 'transition-opacity duration-300',
  enterFrom = 'opacity-0',
  enterTo = 'opacity-100',
  leave = 'transition-opacity duration-200',
  leaveFrom = 'opacity-100',
  leaveTo = 'opacity-0',
  className = ''
}: TransitionProps) {
  const [shouldRender, setShouldRender] = useState(show)
  const [isVisible, setIsVisible] = useState(show)
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (show) {
      setShouldRender(true)
      // Small delay to ensure element is in DOM before animation
      const timer = setTimeout(() => setIsVisible(true), 10)
      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
      // Wait for animation to complete before removing from DOM
      timeoutRef.current = setTimeout(() => setShouldRender(false), 300)
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
      }
    }
  }, [show])

  if (!shouldRender) return null

  const transitionClass = isVisible 
    ? `${enter} ${enterTo}` 
    : `${leave} ${leaveTo}`

  return (
    <div className={`${transitionClass} ${className}`}>
      {children}
    </div>
  )
}

/**
 * Custom Modal component
 */
export default function CustomModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  actions
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl'
  }

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Handle overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <Transition
        show={isOpen}
        className="fixed inset-0 bg-black bg-opacity-25"
        enter="transition-opacity duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      />

      {/* Modal */}
      <Transition
        show={isOpen}
        className={`relative w-full ${sizeClasses[size]} transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl`}
        enter="transition-all duration-300"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="transition-all duration-200"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        <div 
          ref={modalRef}
          onClick={handleOverlayClick}
          className="flex min-h-full items-center justify-center"
        >
          <div className="w-full">
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between mb-4">
                {title && (
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    {title}
                  </h3>
                )}
                {showCloseButton && (
                  <button
                    type="button"
                    className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={onClose}
                    aria-label="Close modal"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="mb-6">
              {children}
            </div>

            {/* Actions */}
            {actions && (
              <div className="flex justify-end space-x-3">
                {actions}
              </div>
            )}
          </div>
        </div>
      </Transition>
    </div>
  )

  // Render modal in portal
  return typeof document !== 'undefined' 
    ? createPortal(modalContent, document.body)
    : null
}

// Export individual components for compatibility
export { Transition }

// Dialog component for compatibility with existing code
export function Dialog({ 
  isOpen, 
  onClose, 
  children, 
  className = '' 
}: {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={false}
      closeOnOverlayClick={true}
    >
      <div className={className}>
        {children}
      </div>
    </CustomModal>
  )
}

// DialogPanel component for compatibility
export function DialogPanel({ 
  children, 
  className = '' 
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}

// DialogTitle component for compatibility
export function DialogTitle({ 
  children, 
  className = '',
  as: Component = 'h3'
}: {
  children: ReactNode
  className?: string
  as?: keyof JSX.IntrinsicElements
}) {
  const Comp = Component as any
  return (
    <Comp className={className}>
      {children}
    </Comp>
  )
}