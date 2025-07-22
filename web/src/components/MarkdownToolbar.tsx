'use client'

import React from 'react'
import { Bold, Italic, Heading1, Heading2, List, Code } from 'lucide-react'

interface MarkdownToolbarProps {
  onInsertFormatting?: (before: string, after?: string) => void
  onExecuteCommand?: (command: string, value?: string) => void
  isVisible: boolean
}

export default function MarkdownToolbar({ onInsertFormatting, onExecuteCommand, isVisible }: MarkdownToolbarProps) {
  if (!isVisible) {
    return null
  }

  const toolbarButtons = [
    {
      icon: Bold,
      label: 'Bold',
      onClick: () => {
        if (onExecuteCommand) {
          onExecuteCommand('bold')
        } else if (onInsertFormatting) {
          onInsertFormatting('**', '**')
        }
      },
      title: 'Bold (Ctrl/Cmd + B)'
    },
    {
      icon: Italic,
      label: 'Italic', 
      onClick: () => {
        if (onExecuteCommand) {
          onExecuteCommand('italic')
        } else if (onInsertFormatting) {
          onInsertFormatting('*', '*')
        }
      },
      title: 'Italic (Ctrl/Cmd + I)'
    },
    {
      icon: Heading1,
      label: 'H1',
      onClick: () => {
        if (onExecuteCommand) {
          onExecuteCommand('formatBlock', 'h1')
        } else if (onInsertFormatting) {
          onInsertFormatting('# ')
        }
      },
      title: 'Header 1'
    },
    {
      icon: Heading2,
      label: 'H2',
      onClick: () => {
        if (onExecuteCommand) {
          onExecuteCommand('formatBlock', 'h2')
        } else if (onInsertFormatting) {
          onInsertFormatting('## ')
        }
      },
      title: 'Header 2'
    },
    {
      icon: List,
      label: 'List',
      onClick: () => {
        if (onExecuteCommand) {
          onExecuteCommand('insertUnorderedList')
        } else if (onInsertFormatting) {
          onInsertFormatting('- ')
        }
      },
      title: 'Bullet List'
    },
    {
      icon: Code,
      label: 'Code',
      onClick: () => {
        if (onExecuteCommand) {
          onExecuteCommand('formatBlock', 'pre')
        } else if (onInsertFormatting) {
          onInsertFormatting('`', '`')
        }
      },
      title: 'Inline Code'
    }
  ]

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">Formatting</span>
      <div className="flex gap-1">
        {toolbarButtons.map(({ icon: Icon, label, onClick, title }) => (
          <button
            key={label}
            onClick={onClick}
            onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
            className="px-2 py-1 text-xs rounded transition-colors bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-800/50 border border-purple-200 dark:border-purple-700"
            title={title}
          >
            <Icon className="h-3 w-3" />
          </button>
        ))}
      </div>
    </div>
  )
}