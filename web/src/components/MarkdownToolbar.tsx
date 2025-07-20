'use client'

import React from 'react'
import { Bold, Italic, Heading1, Heading2, List, Code } from 'lucide-react'

interface MarkdownToolbarProps {
  onInsertFormatting: (before: string, after?: string) => void
  isVisible: boolean
}

export default function MarkdownToolbar({ onInsertFormatting, isVisible }: MarkdownToolbarProps) {
  if (!isVisible) {
    return null
  }

  const toolbarButtons = [
    {
      icon: Bold,
      label: 'Bold',
      onClick: () => onInsertFormatting('**', '**'),
      title: 'Bold (Ctrl/Cmd + B)'
    },
    {
      icon: Italic,
      label: 'Italic', 
      onClick: () => onInsertFormatting('*', '*'),
      title: 'Italic (Ctrl/Cmd + I)'
    },
    {
      icon: Heading1,
      label: 'H1',
      onClick: () => onInsertFormatting('# '),
      title: 'Header 1'
    },
    {
      icon: Heading2,
      label: 'H2',
      onClick: () => onInsertFormatting('## '),
      title: 'Header 2'
    },
    {
      icon: List,
      label: 'List',
      onClick: () => onInsertFormatting('- '),
      title: 'Bullet List'
    },
    {
      icon: Code,
      label: 'Code',
      onClick: () => onInsertFormatting('`', '`'),
      title: 'Inline Code'
    }
  ]

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-primary font-medium">Rich Text</span>
      <div className="flex gap-1">
        {toolbarButtons.map(({ icon: Icon, label, onClick, title }) => (
          <button
            key={label}
            onClick={onClick}
            onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
            className="px-2 py-1 text-xs rounded transition-colors bg-card border border-border text-primary hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            title={title}
          >
            <Icon className="h-3 w-3" />
          </button>
        ))}
      </div>
    </div>
  )
}