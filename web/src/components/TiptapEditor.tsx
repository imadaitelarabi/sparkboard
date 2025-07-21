'use client'

import React, { useEffect, useImperativeHandle, forwardRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'

interface TiptapEditorProps {
  content: string
  onChange?: (content: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  placeholder?: string
  className?: string
  style?: React.CSSProperties
  editable?: boolean
  autoFocus?: boolean
  onFocus?: () => void
  onBlur?: () => void
}

export interface TiptapEditorRef {
  insertFormatting: (before: string, after?: string) => void
  focus: () => void
  getHTML: () => string
  getText: () => string
  getMarkdown: () => string
  setContent: (content: string) => void
  toggleBold: () => void
  toggleItalic: () => void
  toggleUnderline: () => void
  toggleStrike: () => void
  toggleBulletList: () => void
  toggleOrderedList: () => void
  toggleBlockquote: () => void
  toggleCodeBlock: () => void
  setHeading: (level: number) => void
}

const TiptapEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(({
  content,
  onChange,
  onKeyDown,
  placeholder = 'Type your markdown text...',
  className = '',
  style,
  editable = true,
  autoFocus = false,
  onFocus,
  onBlur
}, ref) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        hardBreak: {
          keepMarks: false,
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
    onFocus,
    onBlur,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none dark:prose-invert focus:outline-none',
      },
      handleKeyDown: (_view, event) => {
        if (onKeyDown) {
          // Create a synthetic React keyboard event
          const syntheticEvent = event as unknown as React.KeyboardEvent
          onKeyDown(syntheticEvent)
          return event.defaultPrevented
        }
        return false
      },
    },
    immediatelyRender: false,
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  useEffect(() => {
    if (editor && autoFocus) {
      editor.commands.focus()
    }
  }, [editor, autoFocus])

  // Helper function to convert HTML to Markdown-like text
  const htmlToMarkdown = (html: string): string => {
    if (!html) return ''
    
    // Create a temporary DOM element to parse HTML properly
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html
    
    // Function to recursively process nodes
    const processNode = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || ''
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element
        const children = Array.from(element.childNodes).map(processNode).join('')
        
        switch (element.tagName?.toLowerCase()) {
          case 'p':
            return children + '\n\n'
          case 'br':
            return '\n'
          case 'h1':
            return '# ' + children + '\n\n'
          case 'h2':
            return '## ' + children + '\n\n'
          case 'h3':
            return '### ' + children + '\n\n'
          case 'h4':
            return '#### ' + children + '\n\n'
          case 'h5':
            return '##### ' + children + '\n\n'
          case 'h6':
            return '###### ' + children + '\n\n'
          case 'strong':
          case 'b':
            return '**' + children + '**'
          case 'em':
          case 'i':
            return '*' + children + '*'
          case 'code':
            return '`' + children + '`'
          case 'ul':
            return children + '\n'
          case 'ol':
            return children + '\n'
          case 'li':
            return '- ' + children + '\n'
          case 'blockquote':
            return '> ' + children + '\n\n'
          default:
            return children
        }
      }
      
      return ''
    }
    
    const result = Array.from(tempDiv.childNodes).map(processNode).join('')
    
    // Clean up extra whitespace and line breaks
    return result
      .replace(/\n\n\n+/g, '\n\n')
      .trim()
  }

  useImperativeHandle(ref, () => ({
    insertFormatting: (before: string, after: string = '') => {
      if (!editor) return
      
      const { selection } = editor.state
      const { from, to } = selection
      
      if (from === to) {
        // No selection, insert formatting at cursor
        editor.commands.insertContent(before + after)
        editor.commands.setTextSelection(from + before.length)
      } else {
        // Text is selected, wrap it
        const selectedText = editor.state.doc.textBetween(from, to)
        editor.commands.insertContentAt(
          { from, to },
          before + selectedText + after
        )
        editor.commands.setTextSelection(to + before.length + after.length)
      }
      
      editor.commands.focus()
    },
    focus: () => {
      editor?.commands.focus()
    },
    getHTML: () => {
      return editor?.getHTML() || ''
    },
    getText: () => {
      return editor?.getText() || ''
    },
    getMarkdown: () => {
      const html = editor?.getHTML() || ''
      return htmlToMarkdown(html)
    },
    setContent: (newContent: string) => {
      editor?.commands.setContent(newContent)
    },
    toggleBold: () => {
      editor?.chain().focus().toggleBold().run()
    },
    toggleItalic: () => {
      editor?.chain().focus().toggleItalic().run()
    },
    toggleUnderline: () => {
      editor?.chain().focus().toggleUnderline().run()
    },
    toggleStrike: () => {
      editor?.chain().focus().toggleStrike().run()
    },
    toggleBulletList: () => {
      editor?.chain().focus().toggleBulletList().run()
    },
    toggleOrderedList: () => {
      editor?.chain().focus().toggleOrderedList().run()
    },
    toggleBlockquote: () => {
      editor?.chain().focus().toggleBlockquote().run()
    },
    toggleCodeBlock: () => {
      editor?.chain().focus().toggleCodeBlock().run()
    },
    setHeading: (level: number) => {
      editor?.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run()
    },
  }), [editor])

  if (!editor) {
    // Fallback loading state
    return (
      <div 
        className={`w-full h-full ${className}`}
        style={style}
      >
        <div className="w-full h-full px-3 py-2 bg-[var(--color-input)] border-2 border-[var(--color-ring)] rounded-[var(--radius-md)] text-sm text-muted-foreground flex items-start">
          {placeholder}
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`w-full h-full ${className}`}
      style={style}
    >
      <EditorContent 
        editor={editor}
        className={`w-full h-full ${className?.includes('embedded') ? 
          '[&_.tiptap]:outline-none [&_.tiptap]:h-full [&_.tiptap]:min-h-full [&_.tiptap]:bg-transparent [&_.tiptap]:border-none [&_.tiptap]:p-0' : 
          'px-3 py-2 bg-[var(--color-input)] border-2 border-[var(--color-ring)] rounded-[var(--radius-md)] focus-within:ring-2 focus-within:ring-[var(--color-ring)] focus-within:border-transparent text-sm resize-none shadow-[var(--shadow-lg)] transition-all duration-[var(--duration-fast)] [&_.tiptap]:outline-none [&_.tiptap]:h-full [&_.tiptap]:min-h-full [&_.tiptap]:flex [&_.tiptap]:flex-col [&_.tiptap]:justify-start'
        }`}
      />
    </div>
  )
})

TiptapEditor.displayName = 'TiptapEditor'

export default TiptapEditor