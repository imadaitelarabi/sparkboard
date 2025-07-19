'use client'

import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  children: React.ReactNode
  closeOnOverlayClick?: boolean
  showCloseButton?: boolean
  className?: string
}

export default function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  closeOnOverlayClick = true,
  showCloseButton = true,
  className = ''
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // Handle escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Focus management
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0] as HTMLElement
      if (firstElement) {
        firstElement.focus()
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw] max-h-[95vh]'
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity duration-[var(--duration-normal)]"
        style={{
          opacity: isOpen ? 1 : 0
        }}
      />
      
      {/* Modal */}
      <div
        ref={modalRef}
        className={`
          relative w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden
          bg-[var(--color-card)] border border-[var(--color-border)]
          rounded-[var(--radius-lg)] shadow-[var(--shadow-2xl)]
          transition-all duration-[var(--duration-normal)] ease-[var(--timing-bounce)]
          ${className}
        `}
        style={{
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-10px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
            {title && (
              <h2 className="text-lg font-semibold text-[var(--color-card-foreground)]">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="
                  p-2 rounded-[var(--radius-md)] text-[var(--color-muted-foreground)]
                  hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]
                  transition-colors duration-[var(--duration-fast)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]
                "
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="overflow-auto max-h-[calc(90vh-8rem)]">
          {children}
        </div>
      </div>
    </div>
  )
}