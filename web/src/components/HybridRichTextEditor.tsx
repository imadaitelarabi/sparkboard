'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'

interface HybridRichTextEditorProps {
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

// Helper function to calculate text dimensions based on content
function calculateTextDimensions(text: string, fontSize: number = 16): { width: number; height: number } {
  const lines = text.split('\n')
  const padding = 16 // 8px padding on each side
  const lineHeight = fontSize * 1.4
  
  // Calculate width based on longest line
  let maxWidth = 0
  lines.forEach(line => {
    // Handle markdown headers
    let lineLength = line.length
    let lineFontSize = fontSize
    
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headerMatch) {
      const level = headerMatch[1].length
      const headerSizeMultiplier = Math.max(1.2, 2.2 - (level - 1) * 0.2)
      lineFontSize = fontSize * headerSizeMultiplier
      lineLength = headerMatch[2].length
    }
    
    // Estimate character width (more accurate than simple multiplication)
    const avgCharWidth = lineFontSize * 0.55
    const lineWidth = lineLength * avgCharWidth
    maxWidth = Math.max(maxWidth, lineWidth)
  })
  
  // Calculate height
  const height = Math.max(50, lines.length * lineHeight + padding)
  
  // Set minimum and maximum constraints
  const width = Math.max(120, Math.min(maxWidth + padding, 600))
  
  return { width, height }
}

// Convert markdown to HTML for rich display
function markdownToHtml(markdown: string): string {
  return markdown
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Headers
    .replace(/^# (.*$)/gm, '<h1 style="font-size: 1.5em; font-weight: bold; margin: 0;">$1</h1>')
    .replace(/^## (.*$)/gm, '<h2 style="font-size: 1.25em; font-weight: bold; margin: 0;">$1</h2>')
    // Inline code
    .replace(/`(.*?)`/g, '<code style="background: rgba(0,0,0,0.1); padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>')
    // List items
    .replace(/^- (.*$)/gm, '<li style="margin-left: 1em;">$1</li>')
    // Line breaks
    .replace(/\n/g, '<br>')
}

export default function HybridRichTextEditor({
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
}: HybridRichTextEditorProps) {
  const [markdownValue, setMarkdownValue] = useState(initialValue)
  const [htmlPreview, setHtmlPreview] = useState('')
  const [currentWidth, setCurrentWidth] = useState(width)
  const [currentHeight, setCurrentHeight] = useState(height)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const isFormattingRef = useRef(false)

  // Update HTML preview and dynamic size when markdown changes
  useEffect(() => {
    setHtmlPreview(markdownToHtml(markdownValue))
    
    // Calculate new dimensions based on content
    if (onResize && markdownValue.trim()) {
      const newDimensions = calculateTextDimensions(markdownValue, fontSize)
      if (newDimensions.width !== currentWidth || newDimensions.height !== currentHeight) {
        setCurrentWidth(newDimensions.width)
        setCurrentHeight(newDimensions.height)
        onResize(newDimensions.width, newDimensions.height)
      }
    }
  }, [markdownValue, fontSize, onResize, currentWidth, currentHeight])

  useEffect(() => {
    if (isEditing) {
      setMarkdownValue(initialValue)
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

  // Function to insert markdown formatting at cursor/selection
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
        width: currentWidth,
        height: currentHeight,
      }}
    >
      {/* Rich text preview background */}
      <div
        ref={previewRef}
        className="absolute inset-0 px-3 py-2 bg-[var(--color-input)] border-2 border-[var(--color-ring)] rounded-[var(--radius-md)] text-sm shadow-[var(--shadow-lg)] overflow-hidden pointer-events-none"
        style={{
          fontSize: fontSize,
          fontFamily: fontFamily,
          color: fill,
          lineHeight: '1.4',
          fontWeight: 'inherit',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
        }}
        dangerouslySetInnerHTML={{ __html: htmlPreview || '&nbsp;' }}
      />
      
      {/* Transparent textarea overlay for input */}
      <textarea
        ref={textareaRef}
        value={markdownValue}
        onChange={(e) => setMarkdownValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="absolute inset-0 w-full h-full px-3 py-2 text-transparent bg-transparent border-2 border-transparent focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent text-sm resize-none outline-none caret-black"
        style={{
          fontSize: fontSize,
          fontFamily: fontFamily,
          lineHeight: '1.4',
          fontWeight: 'inherit',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          // Make text transparent but keep caret visible
          caretColor: fill,
          background: 'transparent',
        }}
        placeholder="Type your markdown text..."
        spellCheck={false}
      />
    </div>
  )
}