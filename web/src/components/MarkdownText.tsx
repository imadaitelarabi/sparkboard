'use client'

import React from 'react'
import { Text, Group, Rect } from 'react-konva'
import Konva from 'konva'

interface MarkdownTextProps {
  text: string
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
}

// Simple markdown parser for basic formatting
interface TextToken {
  text: string
  bold?: boolean
  italic?: boolean
  fontSize?: number
  isHeader?: number // header level 1-6
}

function parseMarkdown(markdown: string, baseFontSize: number = 16): TextToken[] {
  const tokens: TextToken[] = []
  const lines = markdown.split('\n')
  
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]
    
    if (line.trim() === '') {
      tokens.push({ text: '\n' })
      continue
    }
    
    // Check for headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headerMatch) {
      const level = headerMatch[1].length
      const headerText = headerMatch[2]
      const headerSizeMultiplier = Math.max(1.2, 2.2 - (level - 1) * 0.2)
      const headerSize = baseFontSize * headerSizeMultiplier
      tokens.push({ 
        text: headerText,
        bold: true,
        fontSize: headerSize,
        isHeader: level
      })
      tokens.push({ text: '\n' })
      continue
    }
    
    // Check for list items
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/)
    if (listMatch) {
      const indent = listMatch[1]
      const bullet = listMatch[2]
      const content = listMatch[3]
      
      // Add indent
      if (indent) {
        tokens.push({ text: indent })
      }
      
      // Add bullet/number
      tokens.push({ text: `${bullet.startsWith('-') || bullet.startsWith('*') || bullet.startsWith('+') ? '•' : bullet} ` })
      
      // Parse the content for inline formatting
      parseInlineFormatting(content, tokens)
      tokens.push({ text: '\n' })
      continue
    }
    
    // Check for blockquotes
    const blockquoteMatch = line.match(/^>\s*(.+)$/)
    if (blockquoteMatch) {
      tokens.push({ text: '▎ ', italic: true })
      parseInlineFormatting(blockquoteMatch[1], tokens, true)
      tokens.push({ text: '\n' })
      continue
    }
    
    // Regular paragraph
    parseInlineFormatting(line, tokens)
    tokens.push({ text: '\n' })
  }
  
  return tokens
}

function parseInlineFormatting(text: string, tokens: TextToken[], isItalic: boolean = false) {
  // Enhanced regex to handle nested formatting better
  const parts = text.split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  
  for (const part of parts) {
    if (!part) continue
    
    if (part.startsWith('***') && part.endsWith('***')) {
      // Bold italic
      tokens.push({ text: part.slice(3, -3), bold: true, italic: true })
    } else if (part.startsWith('**') && part.endsWith('**')) {
      // Bold
      tokens.push({ text: part.slice(2, -2), bold: true, italic: isItalic })
    } else if (part.startsWith('*') && part.endsWith('*')) {
      // Italic
      tokens.push({ text: part.slice(1, -1), italic: true, bold: false })
    } else if (part.startsWith('`') && part.endsWith('`')) {
      // Code - render as normal text for now
      tokens.push({ text: part.slice(1, -1), italic: isItalic })
    } else {
      // Regular text
      tokens.push({ text: part, italic: isItalic })
    }
  }
}

export default function MarkdownText({
  text,
  x,
  y,
  width,
  height,
  fontSize = 16,
  fill = '#000000',
  fontFamily = 'Arial, sans-serif',
  onClick,
  onDblClick,
  draggable = false,
  onDragStart,
  onDragMove,
  onDragEnd,
  onContextMenu,
  isEditing = false
}: MarkdownTextProps) {
  const tokens = parseMarkdown(text, fontSize)
  
  // Calculate text layout with better spacing
  const baseLineHeight = fontSize * 1.4
  let currentX = 0
  let currentY = 0
  const textElements: React.ReactElement[] = []
  const padding = 8
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    
    if (token.text === '\n') {
      currentX = 0
      const prevToken = tokens[i - 1]
      // Use larger line height for headers
      const lineHeight = prevToken?.isHeader ? baseLineHeight * 1.2 : baseLineHeight
      currentY += lineHeight
      continue
    }
    
    const tokenFontSize = token.fontSize || fontSize
    
    // Better font style handling for Konva
    let konvaFontStyle = 'normal'
    if (token.bold && token.italic) {
      konvaFontStyle = 'bold italic'
    } else if (token.bold) {
      konvaFontStyle = 'bold'
    } else if (token.italic) {
      konvaFontStyle = 'italic'
    }
    
    // Create text element for this token
    textElements.push(
      <Text
        key={i}
        x={currentX + padding}
        y={currentY + padding}
        text={token.text}
        fontSize={tokenFontSize}
        fill={fill}
        fontFamily={fontFamily}
        fontStyle={konvaFontStyle}
        align="left"
        wrap="none"
      />
    )
    
    // Better text width estimation
    const avgCharWidth = tokenFontSize * 0.55 // More accurate estimation
    const tokenWidth = token.text.length * avgCharWidth
    currentX += tokenWidth
    
    // Only auto-wrap if we don't have explicit line breaks and text exceeds width
    // This ensures user's intentional line breaks take precedence
    if (currentX > width - padding * 2 - 40) {
      // Check if the next token is a line break - if so, don't auto-wrap
      const nextToken = tokens[i + 1]
      if (!nextToken || nextToken.text !== '\n') {
        currentX = 0
        currentY += baseLineHeight
      }
    }
  }
  
  return (
    <Group
      x={x}
      y={y}
      width={width}
      height={height}
      onClick={onClick}
      onDblClick={onDblClick}
      draggable={draggable && !isEditing}
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
      {!isEditing && textElements}
    </Group>
  )
}