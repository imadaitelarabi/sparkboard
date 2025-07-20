'use client'

import React, { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import Modal from './Modal'
import TiptapEditor, { TiptapEditorRef } from './TiptapEditor'
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
  const [previewContent, setPreviewContent] = useState(defaultValue)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')
  const editorRef = useRef<TiptapEditorRef>(null)

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue)
      setPreviewContent(defaultValue)
      setActiveTab('edit')
      // Focus the editor after modal animation
      setTimeout(() => {
        editorRef.current?.focus()
      }, 150)
    }
  }, [isOpen, defaultValue])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const content = editorRef.current?.getMarkdown() || ''
    if (!content.trim()) return

    setLoading(true)
    try {
      onSubmit(content.trim())
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

  // Insert markdown formatting
  function insertFormatting(before: string, after: string = '') {
    editorRef.current?.insertFormatting(before, after)
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
              <TiptapEditor
                ref={editorRef}
                content={value}
                onChange={(htmlContent) => {
                  setValue(htmlContent)
                  // Also update a markdown version for preview
                  if (editorRef.current) {
                    const markdownContent = editorRef.current.getMarkdown()
                    // We'll use this for preview
                    setPreviewContent(markdownContent)
                  }
                }}
                placeholder="Start typing with rich text formatting..."
                className="h-full"
                editable={!loading}
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
                  {previewContent || '*Nothing to preview*'}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-3 p-6 border-t border-border bg-card">
          <div className="text-xs text-muted-foreground">
            <FileText className="h-3 w-3 inline mr-1" />
            Rich text editor with markdown support
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