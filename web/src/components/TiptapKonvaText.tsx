'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { Group, Rect, Text } from 'react-konva'
import Konva from 'konva'
import TiptapEditor, { TiptapEditorRef } from './TiptapEditor'

interface TiptapKonvaTextProps {
  text: string // HTML content
  x: number
  y: number
  width: number
  height: number
  fontSize?: number
  fill?: string
  fontFamily?: string
  align?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  onClick?: (e: Konva.KonvaEventObject<MouseEvent>) => void
  onDblClick?: (e: Konva.KonvaEventObject<MouseEvent>) => void
  draggable?: boolean
  onDragStart?: () => void
  onDragMove?: (e: Konva.KonvaEventObject<DragEvent>) => void
  onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void
  onContextMenu?: (e: Konva.KonvaEventObject<MouseEvent>) => void
  isEditing?: boolean
  onTextSave?: (newText: string) => void
  onEditingCancel?: () => void
  scale?: number // Canvas scale for proper font scaling
}

export default function TiptapKonvaText({
  text,
  x,
  y,
  width,
  height,
  fontSize = 16,
  fill = '#000000',
  fontFamily = 'Arial, sans-serif',
  align = 'left',
  verticalAlign = 'top',
  onClick,
  onDblClick,
  draggable = false,
  onDragStart,
  onDragMove,
  onDragEnd,
  onContextMenu,
  isEditing = false,
  onTextSave,
  onEditingCancel,
  scale = 1
}: TiptapKonvaTextProps) {
  const [content, setContent] = useState(text)
  const [isEditMode, setIsEditMode] = useState(isEditing)
  const editorRef = useRef<TiptapEditorRef>(null)
  const groupRef = useRef<Konva.Group>(null)

  // Update content when text prop changes
  useEffect(() => {
    setContent(text)
  }, [text])

  // Update edit mode when isEditing prop changes
  useEffect(() => {
    setIsEditMode(isEditing)
    if (isEditing) {
      // Focus the editor when entering edit mode
      setTimeout(() => {
        editorRef.current?.focus()
      }, 10)
    }
  }, [isEditing])

  const handleSave = useCallback(() => {
    const htmlContent = editorRef.current?.getHTML() || ''
    if (htmlContent.trim() !== text.trim()) {
      onTextSave?.(htmlContent)
    }
    setIsEditMode(false)
  }, [text, onTextSave])

  const handleCancel = useCallback(() => {
    setContent(text) // Reset to original content
    setIsEditMode(false)
    onEditingCancel?.()
  }, [text, onEditingCancel])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }, [handleSave, handleCancel])

  const handleDoubleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    setIsEditMode(true)
    onDblClick?.(e)
  }, [onDblClick])

  // Convert HTML to plain text for Konva Text component
  const htmlToPlainText = useCallback((html: string): string => {
    if (!html) return 'Empty text'
    
    // Create a temporary DOM element to parse HTML
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html
    
    // Get text content and preserve some structure
    let plainText = tempDiv.textContent || tempDiv.innerText || ''
    
    // Clean up extra whitespace but preserve line breaks
    plainText = plainText.replace(/\n\n+/g, '\n\n').trim()
    
    return plainText || 'Empty text'
  }, [])

  return (
    <>
      <Group
        ref={groupRef}
        x={x}
        y={y}
        width={width}
        height={height}
        onClick={onClick}
        onDblClick={handleDoubleClick}
        draggable={draggable && !isEditMode}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onContextMenu={onContextMenu}
        clipX={0}
        clipY={0}
        clipWidth={width}
        clipHeight={height}
      >
        {/* Background for better visibility */}
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill="transparent"
          stroke="transparent"
        />
        
        {/* Text content using Konva Text component for display */}
        {!isEditMode && (
          <Text
            x={8}
            y={8}
            width={width - 16}
            height={height - 16}
            text={htmlToPlainText(content)}
            fontSize={fontSize}
            fontFamily={fontFamily}
            fill={fill}
            align={align}
            verticalAlign={verticalAlign}
            wrap="word"
            ellipsis={true}
          />
        )}
      </Group>
      
      {/* TipTap editor overlay when editing - rendered outside Konva */}
      {isEditMode && typeof window !== 'undefined' && (() => {
        const portalRoot = document.getElementById('tiptap-portal') || (() => {
          const div = document.createElement('div')
          div.id = 'tiptap-portal'
          document.body.appendChild(div)
          return div
        })()
        
        // Calculate absolute position with proper scaling
        const stage = groupRef.current?.getStage()
        const stageContainer = stage?.container()
        if (!stageContainer || !stage) return null
        
        const containerRect = stageContainer.getBoundingClientRect()
        const stageScale = stage.scaleX() || 1
        const stagePos = stage.position()
        
        const absoluteX = containerRect.left + (x * stageScale) + (stagePos?.x || 0)
        const absoluteY = containerRect.top + (y * stageScale) + (stagePos?.y || 0)
        const scaledWidth = width * stageScale
        const scaledHeight = height * stageScale
        
        return ReactDOM.createPortal(
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
              content={content}
              onChange={setContent}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              editable={true}
              autoFocus={true}
              className="embedded h-full"
              style={{
                height: '100%',
                fontSize: fontSize * stageScale,
                fontFamily: fontFamily,
                color: fill,
              }}
              placeholder="Type your text..."
            />
          </div>,
          portalRoot
        )
      })()}
    </>
  )
}