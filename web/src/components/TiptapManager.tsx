'use client'

import React, { useRef, useEffect, useCallback } from 'react'
import { useTextEditor } from '../hooks/useTextEditor'
import TiptapEditor, { TiptapEditorRef } from './TiptapEditor'

interface TiptapManagerProps {
  onSave: (elementId: string, content: string) => void
  stageContainer?: HTMLDivElement | null
  stageScale?: number
  stagePosition?: { x: number; y: number }
}

export default function TiptapManager({ onSave, stageContainer, stageScale = 1, stagePosition = { x: 0, y: 0 } }: TiptapManagerProps) {
  const { state, updateContent, saveContent, stopEditing } = useTextEditor()
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

  // Focus editor when editing starts
  useEffect(() => {
    if (state.isEditing) {
      setTimeout(() => {
        editorRef.current?.focus()
      }, 10)
    }
  }, [state.isEditing])

  if (!state.isEditing || !state.position || !stageContainer) {
    return null
  }

  // Calculate absolute position
  const containerRect = stageContainer.getBoundingClientRect()
  const absoluteX = containerRect.left + (state.position.x * stageScale) + stagePosition.x
  const absoluteY = containerRect.top + (state.position.y * stageScale) + stagePosition.y
  const scaledWidth = state.position.width * stageScale
  const scaledHeight = state.position.height * stageScale

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
          fontSize: state.fontSize * stageScale,
          fontFamily: state.fontFamily,
          color: state.color,
        }}
        placeholder="Type your text..."
      />
    </div>
  )
}