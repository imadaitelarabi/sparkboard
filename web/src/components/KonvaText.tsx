'use client'

import React, { useCallback } from 'react'
import { Group, Rect, Text } from 'react-konva'
import Konva from 'konva'
import { useTextEditor } from '../hooks/useTextEditor'

interface KonvaTextProps {
  id: string
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
}

export default function KonvaText({
  id,
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
}: KonvaTextProps) {
  const { state, startEditing } = useTextEditor()
  
  // Check if this element is currently being edited
  const isBeingEdited = state.isEditing && state.elementId === id

  const handleDoubleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Start editing this text element
    console.log('✏️ Starting text edit:', { id, fill, fontSize, fontFamily })
    startEditing(id, text, { x, y, width, height }, { fontSize, fontFamily, color: fill })
    onDblClick?.(e)
  }, [id, text, x, y, width, height, fontSize, fontFamily, fill, startEditing, onDblClick])

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
    <Group
      x={x}
      y={y}
      width={width}
      height={height}
      onClick={onClick}
      onDblClick={handleDoubleClick}
      draggable={draggable && !isBeingEdited}
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
      
      {/* Text content using Konva Text component - hidden when editing */}
      {!isBeingEdited && (
        <Text
          x={8}
          y={8}
          width={width - 16}
          height={height - 16}
          text={htmlToPlainText(text)}
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
  )
}