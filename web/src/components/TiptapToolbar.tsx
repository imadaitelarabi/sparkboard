'use client'

import React from 'react'
import { useTextEditor } from '../hooks/useTextEditor'
import { Bold, Italic, Underline, Strikethrough, List, ListOrdered, Quote, Code, Heading1, Heading2, Heading3 } from 'lucide-react'

interface TiptapToolbarProps {
  onFormatting: (format: string, value?: string) => void
}

export default function TiptapToolbar({ onFormatting }: TiptapToolbarProps) {
  const { state } = useTextEditor()

  if (!state.isEditing) {
    return null
  }

  const formatButtons = [
    { icon: Bold, action: 'bold', label: 'Bold' },
    { icon: Italic, action: 'italic', label: 'Italic' },
    { icon: Underline, action: 'underline', label: 'Underline' },
    { icon: Strikethrough, action: 'strike', label: 'Strikethrough' },
  ]

  const blockButtons = [
    { icon: Heading1, action: 'heading', value: '1', label: 'Heading 1' },
    { icon: Heading2, action: 'heading', value: '2', label: 'Heading 2' },
    { icon: Heading3, action: 'heading', value: '3', label: 'Heading 3' },
    { icon: Quote, action: 'blockquote', label: 'Quote' },
    { icon: Code, action: 'codeBlock', label: 'Code Block' },
  ]

  const listButtons = [
    { icon: List, action: 'bulletList', label: 'Bullet List' },
    { icon: ListOrdered, action: 'orderedList', label: 'Numbered List' },
  ]

  return (
    <div className="flex items-center gap-4 px-4">
      {/* Status indicator */}
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        <span className="text-xs font-medium text-foreground">Editing</span>
      </div>
      
      {/* Separator */}
      <div className="w-px h-4 bg-purple-200 dark:bg-purple-700"></div>
      
      {/* All formatting buttons in one row */}
      <div className="flex items-center gap-1">
        {/* Basic Formatting */}
        {formatButtons.map(({ icon: Icon, action, label }) => (
          <button
            key={action}
            onClick={() => onFormatting(action)}
            className="p-1.5 rounded hover:bg-purple-100 dark:hover:bg-purple-800 transition-colors"
            title={label}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
        
        {/* Separator */}
        <div className="w-px h-4 bg-purple-200 dark:bg-purple-700 mx-1"></div>
        
        {/* Block Formatting */}
        {blockButtons.map(({ icon: Icon, action, value, label }) => (
          <button
            key={`${action}-${value || ''}`}
            onClick={() => onFormatting(action, value)}
            className="p-1.5 rounded hover:bg-purple-100 dark:hover:bg-purple-800 transition-colors"
            title={label}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
        
        {/* Separator */}
        <div className="w-px h-4 bg-purple-200 dark:bg-purple-700 mx-1"></div>
        
        {/* Lists */}
        {listButtons.map(({ icon: Icon, action, label }) => (
          <button
            key={action}
            onClick={() => onFormatting(action)}
            className="p-1.5 rounded hover:bg-purple-100 dark:hover:bg-purple-800 transition-colors"
            title={label}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
      
      {/* Separator */}
      <div className="w-px h-4 bg-purple-200 dark:bg-purple-700"></div>
      
      {/* Hint */}
      <div className="text-xs text-muted-foreground">
        Enter to save • Esc to cancel
      </div>
    </div>
  )
}