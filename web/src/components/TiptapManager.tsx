'use client'

import React, { useRef, useEffect, useCallback } from 'react'
import { useTextEditor } from '../hooks/useTextEditor'
import TiptapEditor, { TiptapEditorRef } from './TiptapEditor'

interface TiptapManagerProps {
  onSave: (elementId: string, content: string, color: string) => void
}

export default function TiptapManager({ onSave }: TiptapManagerProps) {
  const { state, stageInfo, updateContent, saveContent, stopEditing, setFormatHandler } = useTextEditor()
  const editorRef = useRef<TiptapEditorRef>(null)

  const handleSave = useCallback(() => {
    saveContent(onSave)
  }, [saveContent, onSave])

  const handleCancel = useCallback(() => {
    stopEditing()
  }, [stopEditing])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }, [handleSave, handleCancel])

  // Set up format handler when editor ref is available
  useEffect(() => {
    if (editorRef.current) {
      const formatHandler = (format: string, value?: string) => {
        switch (format) {
          case 'bold':
            editorRef.current?.toggleBold()
            break
          case 'italic':
            editorRef.current?.toggleItalic()
            break
          case 'underline':
            editorRef.current?.toggleUnderline()
            break
          case 'strike':
            editorRef.current?.toggleStrike()
            break
          case 'bulletList':
            editorRef.current?.toggleBulletList()
            break
          case 'orderedList':
            editorRef.current?.toggleOrderedList()
            break
          case 'blockquote':
            editorRef.current?.toggleBlockquote()
            break
          case 'codeBlock':
            editorRef.current?.toggleCodeBlock()
            break
          case 'heading':
            if (value) {
              editorRef.current?.setHeading(parseInt(value))
            }
            break
        }
      }
      setFormatHandler(formatHandler)
    } else {
      setFormatHandler(null)
    }
  }, [setFormatHandler, state.isEditing])

  // Focus editor when editing starts
  useEffect(() => {
    if (state.isEditing) {
      setTimeout(() => {
        editorRef.current?.focus()
      }, 10)
    }
  }, [state.isEditing])

  if (!state.isEditing || !state.position || !stageInfo.container) {
    return null
  }

  // Calculate absolute position
  const containerRect = stageInfo.container.getBoundingClientRect()
  const absoluteX = containerRect.left + (state.position.x * stageInfo.scale) + stageInfo.position.x
  const absoluteY = containerRect.top + (state.position.y * stageInfo.scale) + stageInfo.position.y
  const scaledWidth = state.position.width * stageInfo.scale
  const scaledHeight = state.position.height * stageInfo.scale

  return (
    <div
      style={{
        position: 'fixed',
        left: absoluteX,
        top: absoluteY,
        width: scaledWidth,
        height: scaledHeight,
        zIndex: 1000,
        pointerEvents: 'auto',
      }}
    >
      <TiptapEditor
        ref={editorRef}
        content={state.content}
        onChange={updateContent}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        editable={true}
        autoFocus={true}
        className="embedded h-full"
        style={{
          height: '100%',
          fontSize: state.fontSize * stageInfo.scale,
          fontFamily: state.fontFamily,
          color: state.color,
        }}
        placeholder="Type your text..."
      />
    </div>
  )
}