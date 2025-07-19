'use client'

import React, { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import Modal from './Modal'
import { Eye, Edit, FileText } from 'lucide-react'

interface MarkdownEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (value: string) => void
  title: string
  defaultValue?: string
  submitText?: string
}

export default function MarkdownEditModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  defaultValue = '',
  submitText = 'Update'
}: MarkdownEditModalProps) {
  const [value, setValue] = useState(defaultValue)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue)
      setActiveTab('edit')
      // Focus the textarea after modal animation
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 150)
    }
  }, [isOpen, defaultValue])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim()) return

    setLoading(true)
    try {
      onSubmit(value.trim())
      onClose()
    } catch (error) {
      console.error('Error in markdown edit modal submit:', error)
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
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.currentTarget as HTMLTextAreaElement
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newValue = value.substring(0, start) + '  ' + value.substring(end)
      setValue(newValue)
      
      // Reset cursor position
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2
      }, 0)
    }
  }

  // Insert markdown formatting
  function insertFormatting(before: string, after: string = '') {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    const newText = before + selectedText + after
    const newValue = value.substring(0, start) + newText + value.substring(end)
    
    setValue(newValue)
    
    // Set cursor position
    setTimeout(() => {
      const newPosition = selectedText ? end + before.length + after.length : start + before.length
      textarea.selectionStart = textarea.selectionEnd = newPosition
      textarea.focus()
    }, 0)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="lg"
      closeOnOverlayClick={!loading}
    >
      <form onSubmit={handleSubmit} className="flex flex-col h-[600px]">
        {/* Tabs */}
        <div className="flex border-b border-[var(--color-border)] bg-card">
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'edit'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Edit className="h-4 w-4" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'preview'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
        </div>

        {/* Toolbar */}
        {activeTab === 'edit' && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 border-b border-border">
            <button
              type="button"
              onClick={() => insertFormatting('**', '**')}
              className="px-2 py-1 text-sm bg-background border border-border rounded hover:bg-accent"
              title="Bold"
            >
              <strong>B</strong>
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('*', '*')}
              className="px-2 py-1 text-sm bg-background border border-border rounded hover:bg-accent"
              title="Italic"
            >
              <em>I</em>
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('# ')}
              className="px-2 py-1 text-sm bg-background border border-border rounded hover:bg-accent"
              title="Header 1"
            >
              H1
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('## ')}
              className="px-2 py-1 text-sm bg-background border border-border rounded hover:bg-accent"
              title="Header 2"
            >
              H2
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('- ')}
              className="px-2 py-1 text-sm bg-background border border-border rounded hover:bg-accent"
              title="List item"
            >
              •
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('`', '`')}
              className="px-2 py-1 text-sm bg-background border border-border rounded hover:bg-accent font-mono"
              title="Code"
            >
              &lt;/&gt;
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 p-6">
          {activeTab === 'edit' ? (
            <div className="h-full">
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={`# Markdown Text

Use markdown syntax for formatting:

- **Bold text**
- *Italic text*
- # Headers
- Lists
- \`Code\`

And much more!`}
                className="w-full h-full px-3 py-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-transparent text-sm resize-none font-mono"
                disabled={loading}
                onKeyDown={handleKeyDown}
              />
            </div>
          ) : (
            <div className="h-full overflow-auto bg-background border border-border rounded-md p-4">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  components={{
                    h1: ({ children }) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xl font-bold mb-3">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-lg font-bold mb-2">{children}</h3>,
                    p: ({ children }) => <p className="mb-3">{children}</p>,
                    ul: ({ children }) => <ul className="mb-3 pl-6 list-disc">{children}</ul>,
                    ol: ({ children }) => <ol className="mb-3 pl-6 list-decimal">{children}</ol>,
                    li: ({ children }) => <li className="mb-1">{children}</li>,
                    code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">{children}</code>,
                    pre: ({ children }) => <pre className="bg-muted p-3 rounded-md overflow-x-auto mb-3">{children}</pre>,
                    blockquote: ({ children }) => <blockquote className="border-l-4 border-border pl-4 italic mb-3">{children}</blockquote>,
                    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>
                  }}
                >
                  {value || '*Nothing to preview*'}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-3 p-6 border-t border-border bg-card">
          <div className="text-xs text-muted-foreground">
            <FileText className="h-3 w-3 inline mr-1" />
            Supports GitHub Flavored Markdown
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !value.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Processing...' : submitText}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}