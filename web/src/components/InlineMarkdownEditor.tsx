'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'

interface InlineMarkdownEditorProps {
  x: number
  y: number
  width: number
  height: number
  fontSize?: number
  fontFamily?: string
  fill?: string
  initialValue: string
  isEditing: boolean
  onSave: (value: string) => void
  onCancel: () => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  onReady?: (insertFormatting: (before: string, after?: string) => void) => void
}

export default function InlineMarkdownEditor({
  x,
  y,
  width,
  height,
  fontSize = 16,
  fontFamily = 'Arial, sans-serif',
  fill = '#000000',
  initialValue,
  isEditing,
  onSave,
  onCancel,
  onKeyDown,
  onReady
}: InlineMarkdownEditorProps) {
  const [value, setValue] = useState(initialValue)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isFormattingRef = useRef(false)

  useEffect(() => {
    if (isEditing) {
      setValue(initialValue)
      // Focus and select all text after a short delay
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.select()
        }
      }, 10)
    }
  }, [isEditing, initialValue])

  const handleSave = useCallback(() => {
    if (value.trim() !== initialValue.trim()) {
      onSave(value.trim() || 'Empty text')
    } else {
      onCancel()
    }
  }, [value, initialValue, onSave, onCancel])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newValue = value.substring(0, start) + '  ' + value.substring(end)
      setValue(newValue)
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2
      }, 0)
    }
    
    if (onKeyDown) {
      onKeyDown(e)
    }
  }, [value, handleSave, onCancel, onKeyDown])

  const handleBlur = useCallback(() => {
    // Don't save if we're in the middle of formatting
    if (isFormattingRef.current) {
      return
    }
    handleSave()
  }, [handleSave])

  // Function to insert markdown formatting at cursor/selection
  const insertFormatting = useCallback((before: string, after: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Set flag to prevent blur from triggering save
    isFormattingRef.current = true

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    const newText = before + selectedText + after
    const newValue = value.substring(0, start) + newText + value.substring(end)
    
    setValue(newValue)
    
    // Set cursor position after formatting and refocus
    setTimeout(() => {
      const newPosition = selectedText ? end + before.length + after.length : start + before.length
      textarea.selectionStart = textarea.selectionEnd = newPosition
      textarea.focus()
      // Reset flag after formatting is complete
      isFormattingRef.current = false
    }, 0)
  }, [value])

  // Expose insertFormatting function to parent
  useEffect(() => {
    if (onReady && isEditing) {
      onReady(insertFormatting)
    }
  }, [onReady, insertFormatting, isEditing])

  if (!isEditing) {
    return null
  }

  return (
    <div
      className="fixed z-[1000] pointer-events-auto"
      style={{
        left: x,
        top: y,
        width: width,
        height: height,
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="w-full h-full px-3 py-2 bg-[var(--color-input)] border-2 border-[var(--color-ring)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent text-sm resize-none shadow-[var(--shadow-lg)] transition-all duration-[var(--duration-fast)] outline-none"
        style={{
          fontSize: fontSize,
          fontFamily: fontFamily,
          color: fill,
          lineHeight: '1.4',
          fontWeight: 'inherit'
        }}
        placeholder="Type your markdown text..."
        spellCheck={false}
      />

    </div>
  )
}