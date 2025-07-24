'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'

interface InlineRichTextEditorProps {
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
  onReady?: (insertFormatting: (command: string, value?: string) => void) => void
}

// Convert markdown to HTML for initial display
function markdownToHtml(markdown: string): string {
  return markdown
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Headers
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    // Inline code
    .replace(/`(.*?)`/g, '<code>$1</code>')
    // Line breaks
    .replace(/\n/g, '<br>')
}

// Convert HTML back to markdown for storage
function htmlToMarkdown(html: string): string {
  return html
    // Remove div wrappers that contentEditable might add
    .replace(/<div><br><\/div>/g, '\n')
    .replace(/<div>(.*?)<\/div>/g, '$1\n')
    // Headers
    .replace(/<h1>(.*?)<\/h1>/g, '# $1')
    .replace(/<h2>(.*?)<\/h2>/g, '## $1')
    // Bold
    .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
    .replace(/<b>(.*?)<\/b>/g, '**$1**')
    // Italic
    .replace(/<em>(.*?)<\/em>/g, '*$1*')
    .replace(/<i>(.*?)<\/i>/g, '*$1*')
    // Code
    .replace(/<code>(.*?)<\/code>/g, '`$1`')
    // Line breaks
    .replace(/<br\s*\/?>/g, '\n')
    // Clean up extra whitespace
    .trim()
}

export default function InlineRichTextEditor({
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
}: InlineRichTextEditorProps) {
  const [htmlContent, setHtmlContent] = useState('')
  const editorRef = useRef<HTMLDivElement>(null)
  const isFormattingRef = useRef(false)

  useEffect(() => {
    if (isEditing) {
      const html = markdownToHtml(initialValue)
      setHtmlContent(html)
      
      // Focus and select all content after a short delay
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.focus()
          // Select all content
          const range = document.createRange()
          range.selectNodeContents(editorRef.current)
          const selection = window.getSelection()
          selection?.removeAllRanges()
          selection?.addRange(range)
        }
      }, 10)
    }
  }, [isEditing, initialValue])

  const handleSave = useCallback(() => {
    const markdown = htmlToMarkdown(htmlContent)
    const processedMarkdown = markdown.trim()
    const processedInitial = initialValue.trim()
    
    if (processedMarkdown !== processedInitial) {
      onSave(processedMarkdown || 'Empty text')
    } else {
      onCancel()
    }
  }, [htmlContent, initialValue, onSave, onCancel])

  const handleInput = useCallback((_e: React.FormEvent<HTMLDivElement>) => {
    if (editorRef.current) {
      // Clean up the HTML to prevent contentEditable artifacts
      const content = editorRef.current.innerHTML
      setHtmlContent(content)
    }
  }, [])

  // Handle selection changes to maintain cursor position
  // const handleSelectionChange = useCallback(() => {
  //   if (isFormattingRef.current) return
    
  //   const selection = window.getSelection()
  //   if (selection && selection.rangeCount > 0 && editorRef.current) {
  //     // Store selection for restoration after updates
  //     const range = selection.getRangeAt(0)
  //     // You can add selection preservation logic here if needed
  //   }
  // }, [])

  // Function to execute rich text formatting commands
  const executeCommand = useCallback((command: string, value?: string) => {
    if (!editorRef.current) return
    
    isFormattingRef.current = true
    
    // Store selection before command
    const selection = window.getSelection()
    let range: Range | null = null
    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0).cloneRange()
    }
    
    try {
      document.execCommand(command, false, value)
      // Update our state with the new content
      setHtmlContent(editorRef.current.innerHTML)
    } catch (error) {
      console.warn('execCommand failed:', command, error)
    }
    
    // Refocus and restore selection
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus()
        
        // Try to restore selection
        if (range && selection) {
          try {
            selection.removeAllRanges()
            selection.addRange(range)
          } catch (_e) {
            // If range restoration fails, just place cursor at end
            const newRange = document.createRange()
            newRange.selectNodeContents(editorRef.current)
            newRange.collapse(false)
            selection.removeAllRanges()
            selection.addRange(newRange)
          }
        }
      }
      isFormattingRef.current = false
    }, 0)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle special keys first
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
      return
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      // Ctrl/Cmd + Enter to save
      e.preventDefault()
      handleSave()
      return
    }
    
    // Handle formatting shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault()
          executeCommand('bold')
          return
        case 'i':
          e.preventDefault()
          executeCommand('italic')
          return
        case 'u':
          e.preventDefault()
          executeCommand('underline')
          return
      }
    }

    // Handle backspace and delete more carefully
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        
        // If we're at a formatting boundary, handle it specially
        if (range.collapsed) {
          const container = range.commonAncestorContainer
          const offset = range.startOffset
          
          // Check if we're deleting at the beginning/end of formatted text
          if (container.nodeType === Node.TEXT_NODE) {
            const textNode = container as Text
            if (e.key === 'Backspace' && offset === 0) {
              // At beginning of text node - check if parent has formatting
              const parent = textNode.parentElement
              if (parent && parent !== editorRef.current && 
                  ['STRONG', 'EM', 'B', 'I', 'CODE'].includes(parent.tagName)) {
                // We're deleting at the start of formatted text
                // Let the default behavior handle it, but update content after
                setTimeout(() => {
                  if (editorRef.current) {
                    setHtmlContent(editorRef.current.innerHTML)
                  }
                }, 0)
              }
            }
          }
        }
      }
    }
    
    if (onKeyDown) {
      onKeyDown(e)
    }
  }, [handleSave, onCancel, onKeyDown, executeCommand])

  const handleBlur = useCallback(() => {
    // Don't save if we're in the middle of formatting
    if (isFormattingRef.current) {
      return
    }
    handleSave()
  }, [handleSave])

  // Expose executeCommand function to parent (for toolbar)
  useEffect(() => {
    if (onReady && isEditing) {
      onReady(executeCommand)
    }
  }, [onReady, executeCommand, isEditing])

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
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="w-full h-full px-3 py-2 bg-[var(--color-input)] border-2 border-[var(--color-ring)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent text-sm resize-none shadow-[var(--shadow-lg)] transition-all duration-[var(--duration-fast)] outline-none overflow-auto"
        style={{
          fontSize: fontSize,
          fontFamily: fontFamily,
          color: fill,
          lineHeight: '1.4',
          fontWeight: 'inherit',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          minHeight: '100%',
          // Improve text direction support
          direction: 'ltr',
          unicodeBidi: 'plaintext'
        }}
        // Add additional attributes for better editing experience
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
      />
    </div>
  )
}