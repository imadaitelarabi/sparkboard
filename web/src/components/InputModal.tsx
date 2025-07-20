'use client'

import React, { useState, useEffect, useRef } from 'react'
import Modal from './Modal'

interface InputModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (value: string) => void
  title: string
  placeholder?: string
  defaultValue?: string
  submitText?: string
  type?: 'text' | 'textarea'
  required?: boolean
}

export default function InputModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  placeholder = '',
  defaultValue = '',
  submitText = 'Submit',
  type = 'text',
  required = true
}: InputModalProps) {
  const [value, setValue] = useState(defaultValue)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue)
      // Focus the input after modal animation
      setTimeout(() => {
        inputRef.current?.focus()
      }, 150)
    }
  }, [isOpen, defaultValue])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (required && !value.trim()) return

    setLoading(true)
    try {
      onSubmit(value.trim())
      onClose()
    } catch (error) {
      console.error('Error in input modal submit:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    if (!loading) {
      onClose()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey && type !== 'textarea') {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="sm"
      closeOnOverlayClick={!loading}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          {type === 'textarea' ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              rows={4}
              className="w-full px-3 py-2 bg-[var(--color-input)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent text-sm resize-none"
              disabled={loading}
              required={required}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              className="w-full px-3 py-2 bg-[var(--color-input)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent text-sm"
              disabled={loading}
              required={required}
              onKeyDown={handleKeyDown}
            />
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-[var(--color-muted-foreground)] hover:text-[var(--color-card-foreground)] transition-colors duration-[var(--duration-fast)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || (required && !value.trim())}
            className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-[var(--radius-md)] hover:bg-[var(--color-primary-600)] transition-colors duration-[var(--duration-fast)] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Processing...' : submitText}
          </button>
        </div>
      </form>
    </Modal>
  )
}