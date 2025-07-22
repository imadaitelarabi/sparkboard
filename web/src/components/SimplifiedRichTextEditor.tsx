'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'

interface SimplifiedRichTextEditorProps {
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
  onResize?: (newWidth: number, newHeight: number) => void
}

// Calculate text dimensions for EDIT MODE (textarea with raw markdown)
function calculateTextDimensionsForEdit(text: string, fontSize: number = 16): { width: number; height: number } {
  const lines = text.split('\n')
  const padding = 24 // 12px padding on each side
  const lineHeight = fontSize * 1.4
  
  let maxWidth = 0
  
  lines.forEach(line => {
    // In edit mode, all text appears at the same fontSize (no visual headers)
    const lineLength = line.length
    const avgCharWidth = fontSize * 0.6
    const lineWidth = lineLength * avgCharWidth
    maxWidth = Math.max(maxWidth, lineWidth)
  })
  
  // Simple height calculation - all lines same height in textarea
  const height = Math.max(50, lines.length * lineHeight + padding)
  const width = Math.max(150, Math.min(maxWidth + padding, 800))
  
  return { width, height }
}

export default function SimplifiedRichTextEditor({
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
  onReady,
  onResize
}: SimplifiedRichTextEditorProps) {
  const [markdownValue, setMarkdownValue] = useState('')
  const [currentWidth, setCurrentWidth] = useState(width)
  const [currentHeight, setCurrentHeight] = useState(height)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isFormattingRef = useRef(false)

  // Initialize content and auto-resize when editing starts
  useEffect(() => {
    if (isEditing) {
      setMarkdownValue(initialValue)
      
      // Focus and select all content
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.select()
        }
      }, 10)
    }
  }, [isEditing, initialValue])

  // Auto-resize based on content changes (using edit mode calculation)
  useEffect(() => {
    if (onResize && markdownValue.trim()) {
      const newDimensions = calculateTextDimensionsForEdit(markdownValue, fontSize)
      if (newDimensions.width !== currentWidth || newDimensions.height !== currentHeight) {
        setCurrentWidth(newDimensions.width)
        setCurrentHeight(newDimensions.height)
        onResize(newDimensions.width, newDimensions.height)
      }
    }
  }, [markdownValue, fontSize, onResize, currentWidth, currentHeight])

  const handleSave = useCallback(() => {
    const processedValue = markdownValue
      .split('\n')
      .map(line => line.trimEnd())
      .join('\n')
      .replace(/^\s+/, '')
      .replace(/\s+$/, '')
    
    const processedInitial = initialValue
      .split('\n')
      .map(line => line.trimEnd())
      .join('\n')
      .replace(/^\s+/, '')
      .replace(/\s+$/, '')
    
    if (processedValue !== processedInitial) {
      onSave(processedValue || 'Empty text')
    } else {
      onCancel()
    }
  }, [markdownValue, initialValue, onSave, onCancel])

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
      const newValue = markdownValue.substring(0, start) + '  ' + markdownValue.substring(end)
      setMarkdownValue(newValue)
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2
      }, 0)
    }
    
    if (onKeyDown) {
      onKeyDown(e)
    }
  }, [markdownValue, handleSave, onCancel, onKeyDown])

  const handleBlur = useCallback(() => {
    if (isFormattingRef.current) {
      return
    }
    handleSave()
  }, [handleSave])

  // Insert markdown formatting at cursor position
  const insertFormatting = useCallback((before: string, after: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    isFormattingRef.current = true

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = markdownValue.substring(start, end)
    const newText = before + selectedText + after
    const newValue = markdownValue.substring(0, start) + newText + markdownValue.substring(end)
    
    setMarkdownValue(newValue)
    
    setTimeout(() => {
      const newPosition = selectedText ? end + before.length + after.length : start + before.length
      textarea.selectionStart = textarea.selectionEnd = newPosition
      textarea.focus()
      isFormattingRef.current = false
    }, 0)
  }, [markdownValue])

  // Expose formatting function to parent
  useEffect(() => {
    if (onReady && isEditing) {
      onReady(insertFormatting)
    }
  }, [onReady, insertFormatting, isEditing])

  if (!isEditing) {
    return null
  }

  return (
    <textarea
      ref={textareaRef}
      value={markdownValue}
      onChange={(e) => setMarkdownValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className="fixed z-[1000] pointer-events-auto px-3 py-2 bg-[var(--color-input)] border-2 border-[var(--color-ring)] rounded-[var(--radius-md)] text-sm shadow-[var(--shadow-lg)] resize-none outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent"
      style={{
        left: x,
        top: y,
        width: currentWidth,
        height: currentHeight,
        fontSize: fontSize,
        fontFamily: fontFamily,
        color: fill,
        lineHeight: '1.4',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
      }}
      placeholder="Type markdown text..."
      spellCheck={false}
    />
  )
}