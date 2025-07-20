'use client'

import React, { useEffect, useRef, useCallback } from 'react'
import TiptapEditor, { TiptapEditorRef } from './TiptapEditor'

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
  const editorRef = useRef<TiptapEditorRef>(null)
  const isFormattingRef = useRef(false)

  useEffect(() => {
    if (isEditing) {
      // Focus after a short delay
      setTimeout(() => {
        editorRef.current?.focus()
      }, 10)
    }
  }, [isEditing, initialValue])

  const handleSave = useCallback(() => {
    const markdownContent = editorRef.current?.getMarkdown() || ''
    
    const processedValue = markdownContent.trim()
    const processedInitial = initialValue.trim()
    
    if (processedValue !== processedInitial) {
      onSave(processedValue || 'Empty text')
    } else {
      onCancel()
    }
  }, [initialValue, onSave, onCancel])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
    
    if (onKeyDown) {
      onKeyDown(e)
    }
  }, [handleSave, onCancel, onKeyDown])

  const handleBlur = useCallback(() => {
    // Don't save if we're in the middle of formatting
    if (isFormattingRef.current) {
      return
    }
    handleSave()
  }, [handleSave])

  // Function to insert markdown formatting at cursor/selection
  const insertFormatting = useCallback((before: string, after: string = '') => {
    if (!editorRef.current) return

    // Set flag to prevent blur from triggering save
    isFormattingRef.current = true

    editorRef.current.insertFormatting(before, after)
    
    // Reset flag after formatting is complete
    setTimeout(() => {
      isFormattingRef.current = false
    }, 0)
  }, [])

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
      <TiptapEditor
        ref={editorRef}
        content={initialValue}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        autoFocus={true}
        placeholder="Type your markdown text..."
        style={{
          fontSize: fontSize,
          fontFamily: fontFamily,
          color: fill,
        }}
      />
    </div>
  )
}