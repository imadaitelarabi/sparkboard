'use client'

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'

// Extend Window interface for zoom timeout
declare global {
  interface Window {
    zoomTimeout?: NodeJS.Timeout
  }
}
import { Stage, Layer, Rect, Circle, Text, Arrow, Image as KonvaImage } from 'react-konva'
import Konva from 'konva'
import { 
  Square, 
  Circle as CircleIcon, 
  Type, 
  ArrowRight, 
  StickyNote, 
  MousePointer, 
  Trash2,
  Plus,
  Copy,
  Image,
  ArrowUp,
  ArrowDown,
  CornerRightUp,
  CornerRightDown,
  ClipboardCopy,
  Group,
  Ungroup
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { imageUploadService } from '@/lib/image-upload'
import { useAppStore } from '@/store'
import { Database } from '@/types/database.types'
import { 
  ElementProperties,
  getEffectiveFillOpacity,
  getEffectiveStrokeOpacity,
  getEffectiveCornerRadius
} from '@/types/element.types'
import CreateTaskModal from './CreateTaskModal'
import InputModal from './InputModal'
import MarkdownEditModal from './MarkdownEditModal'
import ThemeToggle from './ThemeToggle'
import MarkdownText from './MarkdownText'
import MarkdownToolbar from './MarkdownToolbar'
import InlineMarkdownEditor from './InlineMarkdownEditor'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { cameraStorage } from '@/utils/cameraStorage'

type Tables = Database['public']['Tables']
type Board = Tables['boards']['Row']
type Element = Tables['elements']['Row']

interface WhiteboardViewProps {
  board: Board
}

type ToolType = 'select' | 'rectangle' | 'circle' | 'text' | 'arrow' | 'sticky_note' | 'image'

// Extracted ImageElement component for better performance
const ImageElement = React.memo(({ element, baseProps }: { 
  element: WhiteboardElement, 
  baseProps: {
    x: number
    y: number
    width: number
    height: number
    rotation: number
    draggable: boolean
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => void
    onDblClick: () => void
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void
    onContextMenu: (e: Konva.KonvaEventObject<MouseEvent>) => void
    stroke: string
    strokeWidth: number
    dash?: number[]
    opacity: number
  }
}) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const props = element.properties as ElementProperties || {}

  // Use useMemo to prevent image recreation on every render
  const imageLoader = useMemo(() => {
    if (!props.imageUrl) return null

    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    
    return new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => resolve(img)
      img.onerror = (e) => {
        console.error('Failed to load image:', props.imageUrl, e)
        // Try loading without crossOrigin if it fails
        const imgRetry = new window.Image()
        imgRetry.onload = () => resolve(imgRetry)
        imgRetry.onerror = () => {
          console.error('Failed to load image even without CORS:', props.imageUrl)
          reject(new Error('Failed to load image'))
        }
        imgRetry.src = props.imageUrl!
      }
      img.src = props.imageUrl!
    })
  }, [props.imageUrl])

  useEffect(() => {
    if (imageLoader) {
      imageLoader
        .then(setImage)
        .catch(() => setImage(null))
    } else {
      setImage(null)
    }
  }, [imageLoader])

  if (!image) {
    // Show loading placeholder
    return (
      <Rect
        {...baseProps}
        fill="var(--color-gray-100)"
        stroke="var(--color-gray-300)"
        strokeWidth={1}
        dash={[5, 5]}
      />
    )
  }

  return (
    <KonvaImage
      {...baseProps}
      image={image}
      opacity={props.opacity || 1}
    />
  )
})

ImageElement.displayName = 'ImageElement'

// Helper function to get computed color value
function getComputedColor(cssVar: string): string {
  if (typeof window === 'undefined') return '#6366f1' // fallback for SSR
  
  try {
    const computedStyle = getComputedStyle(document.documentElement)
    const varName = cssVar.replace('var(', '').replace(')', '').trim()
    let value = computedStyle.getPropertyValue(varName).trim()
    
    // If value is empty, try alternative approaches
    if (!value) {
      // Try getting from :root specifically
      const rootStyle = getComputedStyle(document.querySelector(':root')!)
      value = rootStyle.getPropertyValue(varName).trim()
    }
    
    // Ensure we have a valid hex color
    if (value && value.startsWith('#') && value.length >= 4) {
      return value
    }
    
    // Convert rgb() to hex if needed
    if (value && value.startsWith('rgb')) {
      const matches = value.match(/rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)\\)/)
      if (matches) {
        const r = parseInt(matches[1])
        const g = parseInt(matches[2])
        const b = parseInt(matches[3])
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
      }
    }
    
    // Fallback color map for common CSS variables
    const fallbackColors: Record<string, string> = {
      '--color-primary-300': '#a5b4fc',
      '--color-primary-500': '#6366f1',
      '--color-primary-700': '#4338ca',
      '--color-secondary-300': '#7dd3fc',
      '--color-secondary-500': '#0ea5e9',
      '--color-secondary-700': '#0369a1',
      '--color-accent-300': '#6ee7b7',
      '--color-accent-500': '#10b981',
      '--color-accent-700': '#047857',
      '--color-warning-300': '#fdba74',
      '--color-warning-500': '#f97316',
      '--color-warning-700': '#c2410c',
      '--color-success-300': '#86efac',
      '--color-success-500': '#22c55e',
      '--color-success-700': '#15803d',
      '--color-destructive-300': '#fca5a5',
      '--color-destructive-500': '#ef4444',
      '--color-destructive-700': '#b91c1c',
      '--color-gray-200': '#e5e7eb',
      '--color-gray-400': '#9ca3af',
      '--color-gray-600': '#4b5563',
      '--color-gray-800': '#1f2937',
      '--color-gray-900': '#111827'
    }
    
    return fallbackColors[varName] || '#6366f1'
  } catch (error) {
    console.warn('Error getting computed color for', cssVar, error)
    return '#6366f1'
  }
}

// Expanded theme-based color palette for whiteboard elements
const ELEMENT_COLORS = {
  // Primary colors
  'primary-light': {
    fill: 'var(--color-primary-300)',
    stroke: 'var(--color-primary-500)',
    name: 'Primary Light'
  },
  'primary': {
    fill: 'var(--color-primary-500)',
    stroke: 'var(--color-primary-700)',
    name: 'Primary'
  },
  'primary-dark': {
    fill: 'var(--color-primary-700)',
    stroke: 'var(--color-primary-900)',
    name: 'Primary Dark'
  },
  
  // Secondary colors
  'secondary-light': {
    fill: 'var(--color-secondary-300)',
    stroke: 'var(--color-secondary-500)',
    name: 'Secondary Light'
  },
  'secondary': {
    fill: 'var(--color-secondary-500)',
    stroke: 'var(--color-secondary-700)',
    name: 'Secondary'
  },
  'secondary-dark': {
    fill: 'var(--color-secondary-700)',
    stroke: 'var(--color-secondary-900)',
    name: 'Secondary Dark'
  },
  
  // Accent colors
  'accent-light': {
    fill: 'var(--color-accent-300)',
    stroke: 'var(--color-accent-500)',
    name: 'Accent Light'
  },
  'accent': {
    fill: 'var(--color-accent-500)',
    stroke: 'var(--color-accent-700)',
    name: 'Accent'
  },
  'accent-dark': {
    fill: 'var(--color-accent-700)',
    stroke: 'var(--color-accent-900)',
    name: 'Accent Dark'
  },
  
  // Warning colors
  'warning-light': {
    fill: 'var(--color-warning-300)',
    stroke: 'var(--color-warning-500)',
    name: 'Warning Light'
  },
  'warning': {
    fill: 'var(--color-warning-500)',
    stroke: 'var(--color-warning-700)',
    name: 'Warning'
  },
  'warning-dark': {
    fill: 'var(--color-warning-700)',
    stroke: 'var(--color-warning-900)',
    name: 'Warning Dark'
  },
  
  // Success colors
  'success-light': {
    fill: 'var(--color-success-300)',
    stroke: 'var(--color-success-500)',
    name: 'Success Light'
  },
  'success': {
    fill: 'var(--color-success-500)',
    stroke: 'var(--color-success-700)',
    name: 'Success'
  },
  'success-dark': {
    fill: 'var(--color-success-700)',
    stroke: 'var(--color-success-900)',
    name: 'Success Dark'
  },
  
  // Destructive colors
  'destructive-light': {
    fill: 'var(--color-destructive-300)',
    stroke: 'var(--color-destructive-500)',
    name: 'Destructive Light'
  },
  'destructive': {
    fill: 'var(--color-destructive-500)',
    stroke: 'var(--color-destructive-700)',
    name: 'Destructive'
  },
  'destructive-dark': {
    fill: 'var(--color-destructive-700)',
    stroke: 'var(--color-destructive-900)',
    name: 'Destructive Dark'
  },
  
  // Gray colors
  'gray-light': {
    fill: 'var(--color-gray-200)',
    stroke: 'var(--color-gray-400)',
    name: 'Gray Light'
  },
  'gray': {
    fill: 'var(--color-gray-400)',
    stroke: 'var(--color-gray-600)',
    name: 'Gray'
  },
  'gray-dark': {
    fill: 'var(--color-gray-600)',
    stroke: 'var(--color-gray-800)',
    name: 'Gray Dark'
  },
  
  // Pure colors
  'white': {
    fill: '#ffffff',
    stroke: 'var(--color-gray-400)',
    name: 'White'
  },
  'black': {
    fill: 'var(--color-gray-900)',
    stroke: 'var(--color-gray-700)',
    name: 'Black'
  }
} as const

type ElementColorKey = keyof typeof ELEMENT_COLORS

// Default colors for different element types
const DEFAULT_ELEMENT_COLORS: Record<string, ElementColorKey> = {
  rectangle: 'primary',
  circle: 'secondary', 
  text: 'gray-dark',
  arrow: 'gray',
  sticky_note: 'warning',
  image: 'primary'
}

// Primary 4 colors for quick selection
const PRIMARY_COLORS: ElementColorKey[] = ['primary', 'secondary', 'accent', 'warning']

interface WhiteboardElement extends Element {
  konvaRef?: Konva.Node
}

export default function WhiteboardView({ board }: WhiteboardViewProps) {
  const stageRef = useRef<Konva.Stage>(null)
  const supabase = createClient()
  const { 
    elements, 
    setElements, 
    addElement, 
    updateElement, 
    updateElementSilent,
    removeElement,
    selectedElementIds,
    setSelectedElementIds,
    toggleElementSelection,
    clearSelection,
    user,
    isCreateTaskModalOpen,
    setIsCreateTaskModalOpen,
    navigationContext,
    setNavigationContext,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    saveToHistory
  } = useAppStore()

  const [activeTool, setActiveTool] = useState<ToolType>('select')
  const [stageScale, setStageScale] = useState(1)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [editingElement, setEditingElement] = useState<{ id: string; text: string } | null>(null)
  const [editingMarkdownElement, setEditingMarkdownElement] = useState<{ id: string; text: string } | null>(null)
  const [inlineEditingElement, setInlineEditingElement] = useState<string | null>(null)
  const [insertFormattingFn, setInsertFormattingFn] = useState<((before: string, after?: string) => void) | null>(null)
  const [selectedColor, setSelectedColor] = useState<ElementColorKey>('primary')
  const [customColor, setCustomColor] = useState('#6366f1')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId: string } | null>(null)
  const [copiedElements, setCopiedElements] = useState<WhiteboardElement[]>([])
  const [resizeState, setResizeState] = useState<{
    isResizing: boolean;
    elementId: string | null;
    handleType: string | null;
    startPointer: { x: number; y: number } | null;
    originalBounds: { x: number; y: number; width: number; height: number } | null;
  }>({ isResizing: false, elementId: null, handleType: null, startPointer: null, originalBounds: null })
  const [showComingSoonModal, setShowComingSoonModal] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [draggedElements, setDraggedElements] = useState<Set<string>>(new Set())
  const [dragStartPositions, setDragStartPositions] = useState<Map<string, { x: number; y: number }>>(new Map())
  
  // Zoom state for better control
  const [isZooming, setIsZooming] = useState(false)
  
  // Selection rectangle state for drag selection
  const [selectionRect, setSelectionRect] = useState<{
    visible: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
    startX: number;
    startY: number;
    shiftHeld: boolean;
  }>({ visible: false, x: 0, y: 0, width: 0, height: 0, startX: 0, startY: 0, shiftHeld: false })
  
  // Panning state for two-finger/middle-mouse panning
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<{ x: number; y: number; stageX: number; stageY: number } | null>(null)

  // Auto-select appropriate color when switching tools
  const handleToolChange = (toolType: ToolType) => {
    setActiveTool(toolType)
    if (toolType !== 'select' && DEFAULT_ELEMENT_COLORS[toolType]) {
      setSelectedColor(DEFAULT_ELEMENT_COLORS[toolType])
    }
    
    // Handle image tool - open file picker immediately
    if (toolType === 'image') {
      handleImageUpload()
    }
  }

  // Copy selected elements to clipboard
  const copyElements = () => {
    if (selectedElementIds.length === 0) return
    const selectedElements = elements.filter(el => selectedElementIds.includes(el.id))
    setCopiedElements(selectedElements)
  }

  // Handle pasting images from system clipboard
  const handleClipboardPaste = useCallback(async (e: ClipboardEvent) => {
    const items = Array.from(e.clipboardData?.items || [])
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          try {
            const result = await imageUploadService.uploadImage(file, board.id)
            
            // Create image element in center of viewport
            const stageCenter = {
              x: (window.innerWidth - 256) / 2 / stageScale - stagePos.x / stageScale,
              y: (window.innerHeight - 140) / 2 / stageScale - stagePos.y / stageScale
            }
            
            const imageWidth = 200 // Default width
            const imageHeight = imageWidth / result.aspectRatio
            
            const newElement: Omit<Element, 'id' | 'created_at' | 'updated_at'> = {
              board_id: board.id,
              type: 'image',
              x: stageCenter.x - imageWidth / 2,
              y: stageCenter.y - imageHeight / 2,
              width: imageWidth,
              height: imageHeight,
              rotation: 0,
              properties: {
                imageUrl: result.url,
                imageStoragePath: result.storagePath,
                aspectRatio: result.aspectRatio
              },
              layer_index: elements.length,
              created_by: (user as { id: string } | null)?.id || ''
            }

            const { data, error } = await supabase
              .from('elements')
              .insert(newElement)
              .select()
              .single()

            if (error) throw error
            addElement(data)
            setSelectedElementIds([data.id])
          } catch (error) {
            console.error('Error pasting image:', error)
            alert('Failed to paste image. Please try again.')
          }
        }
        return // Only handle the first image
      }
    }
  }, [board.id, stageScale, stagePos, elements.length, user, addElement, supabase, setSelectedElementIds])

  // Paste elements from clipboard
  const pasteElements = async () => {
    if (copiedElements.length === 0) return

    const offset = 20 // Offset to avoid pasting exactly on top
    const newElements = []

    for (const element of copiedElements) {
      const newElement: Omit<Element, 'id' | 'created_at' | 'updated_at'> = {
        board_id: board.id,
        type: element.type,
        x: (element.x || 0) + offset,
        y: (element.y || 0) + offset,
        width: element.width,
        height: element.height,
        rotation: element.rotation,
        properties: element.properties,
        layer_index: elements.length + newElements.length,
        created_by: (user as { id: string } | null)?.id || ''
      }

      try {
        const { data, error } = await supabase
          .from('elements')
          .insert(newElement)
          .select()
          .single()

        if (error) throw error
        newElements.push(data)
      } catch (error) {
        console.error('Error pasting element:', error)
      }
    }

    // Add all new elements to store and select them
    newElements.forEach(element => addElement(element))
    setSelectedElementIds(newElements.map(el => el.id))
  }

  // Handle image upload
  const handleImageUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        try {
          const result = await imageUploadService.uploadImage(file, board.id)
          
          // Create image element in center of viewport
          const stageCenter = {
            x: (window.innerWidth - 256) / 2 / stageScale - stagePos.x / stageScale,
            y: (window.innerHeight - 140) / 2 / stageScale - stagePos.y / stageScale
          }
          
          const imageWidth = 200 // Default width
          const imageHeight = imageWidth / result.aspectRatio
          
          const newElement: Omit<Element, 'id' | 'created_at' | 'updated_at'> = {
            board_id: board.id,
            type: 'image',
            x: stageCenter.x - imageWidth / 2,
            y: stageCenter.y - imageHeight / 2,
            width: imageWidth,
            height: imageHeight,
            rotation: 0,
            properties: {
              imageUrl: result.url,
              imageStoragePath: result.storagePath,
              aspectRatio: result.aspectRatio
            },
            layer_index: elements.length,
            created_by: (user as { id: string } | null)?.id || ''
          }

          const { data, error } = await supabase
            .from('elements')
            .insert(newElement)
            .select()
            .single()

          if (error) throw error
          addElement(data)
          setSelectedElementIds([data.id])
          setActiveTool('select') // Switch back to select tool
        } catch (error) {
          console.error('Error uploading image:', error)
          alert('Failed to upload image. Please try again.')
        }
      }
    }
    input.click()
  }

  // Duplicate selected elements
  const duplicateElements = async () => {
    const selectedElements = elements.filter(el => selectedElementIds.includes(el.id))
    if (selectedElements.length === 0) return

    const offset = 20 // Offset to avoid duplicating exactly on top
    const newElements = []

    for (const element of selectedElements) {
      const newElement: Omit<Element, 'id' | 'created_at' | 'updated_at'> = {
        board_id: board.id,
        type: element.type,
        x: (element.x || 0) + offset,
        y: (element.y || 0) + offset,
        width: element.width,
        height: element.height,
        rotation: element.rotation,
        properties: element.properties,
        layer_index: elements.length + newElements.length,
        created_by: (user as { id: string } | null)?.id || ''
      }

      try {
        const { data, error } = await supabase
          .from('elements')
          .insert(newElement)
          .select()
          .single()

        if (error) throw error
        newElements.push(data)
      } catch (error) {
        console.error('Error duplicating element:', error)
      }
    }

    // Add all new elements to store and select them
    newElements.forEach(element => addElement(element))
    setSelectedElementIds(newElements.map(el => el.id))
  }

  // Group selected elements
  const groupElements = async () => {
    const selectedElements = elements.filter(el => selectedElementIds.includes(el.id))
    if (selectedElements.length < 2) return

    saveToHistory()
    const groupId = crypto.randomUUID()

    // Update all selected elements with the same group ID
    for (const element of selectedElements) {
      const properties = element.properties as ElementProperties || {}
      const updatedProperties = {
        ...properties,
        groupId,
        isGroupLeader: element === selectedElements[0] // First element is the group leader
      }
      
      try {
        await updateElementInDB(element.id, { properties: updatedProperties })
        updateElementSilent(element.id, { properties: updatedProperties })
      } catch (error) {
        console.error('Error grouping element:', error)
      }
    }
  }

  // Ungroup selected elements
  const ungroupElements = async () => {
    const selectedElements = elements.filter(el => selectedElementIds.includes(el.id))
    if (selectedElements.length === 0) return

    saveToHistory()

    // Find all elements that belong to the same groups as selected elements
    const groupIds = new Set<string>()
    selectedElements.forEach(element => {
      const properties = element.properties as ElementProperties
      if (properties?.groupId) {
        groupIds.add(properties.groupId)
      }
    })

    // Remove group properties from all elements in these groups
    for (const element of elements) {
      const properties = element.properties as ElementProperties
      if (properties?.groupId && groupIds.has(properties.groupId)) {
        const updatedProperties = { ...properties }
        delete updatedProperties.groupId
        delete updatedProperties.isGroupLeader
        
        try {
          await updateElementInDB(element.id, { properties: updatedProperties })
          updateElementSilent(element.id, { properties: updatedProperties })
        } catch (error) {
          console.error('Error ungrouping element:', error)
        }
      }
    }
  }

  // Keyboard shortcuts for whiteboard
  useKeyboardShortcuts([
    // Tool selection shortcuts
    {
      key: 'v',
      callback: () => setActiveTool('select'),
      description: 'Select tool'
    },
    {
      key: 'r',
      callback: () => handleToolChange('rectangle'),
      description: 'Rectangle tool'
    },
    {
      key: 'c',
      callback: () => handleToolChange('circle'),
      description: 'Circle tool'
    },
    {
      key: 't',
      callback: () => handleToolChange('text'),
      description: 'Text tool'
    },
    {
      key: 'a',
      callback: () => handleToolChange('arrow'),
      description: 'Arrow tool'
    },
    {
      key: 's',
      callback: () => handleToolChange('sticky_note'),
      description: 'Sticky note tool'
    },
    {
      key: 'i',
      callback: () => handleToolChange('image'),
      description: 'Image tool'
    },
    // Element actions
    {
      key: 'Delete',
      callback: () => {
        if (selectedElementIds.length > 0) {
          selectedElementIds.forEach(id => deleteElement(id))
          clearSelection()
        }
      },
      description: 'Delete selected elements'
    },
    {
      key: 'Backspace',
      callback: () => {
        if (selectedElementIds.length > 0) {
          selectedElementIds.forEach(id => deleteElement(id))
          clearSelection()
        }
      },
      description: 'Delete selected elements'
    },
    // Selection shortcuts
    {
      key: 'Escape',
      callback: () => {
        clearSelection()
        setContextMenu(null)
        if (activeTool !== 'select') {
          setActiveTool('select')
        }
      },
      description: 'Clear selection and return to select tool'
    },
    {
      key: 'a',
      ctrlKey: true,
      callback: () => {
        // Select all elements
        const allElementIds = elements.map(el => el.id)
        setSelectedElementIds(allElementIds)
      },
      description: 'Select all elements',
      preventDefault: true
    },
    // Grouping shortcuts
    {
      key: 'g',
      ctrlKey: true,
      callback: () => {
        if (selectedElementIds.length > 1) {
          groupElements()
        }
      },
      description: 'Group selected elements',
      preventDefault: true
    },
    {
      key: 'g',
      ctrlKey: true,
      shiftKey: true,
      callback: () => {
        if (selectedElementIds.length > 0) {
          ungroupElements()
        }
      },
      description: 'Ungroup selected elements',
      preventDefault: true
    },
    // Zoom and navigation
    {
      key: '=',
      ctrlKey: true,
      callback: () => {
        const newScale = Math.min(stageScale * 1.2, 5)
        setStageScale(newScale)
      },
      description: 'Zoom in',
      preventDefault: true
    },
    {
      key: '+',
      ctrlKey: true,
      callback: () => {
        const newScale = Math.min(stageScale * 1.2, 5)
        setStageScale(newScale)
      },
      description: 'Zoom in (plus key)',
      preventDefault: true
    },
    {
      key: '-',
      ctrlKey: true,
      callback: () => {
        const newScale = Math.max(stageScale / 1.2, 0.1)
        setStageScale(newScale)
      },
      description: 'Zoom out',
      preventDefault: true
    },
    {
      key: '0',
      ctrlKey: true,
      callback: () => {
        setStageScale(1)
        setStagePos({ x: 0, y: 0 })
      },
      description: 'Reset zoom and position',
      preventDefault: true
    },
    // Task creation
    {
      key: 'Enter',
      ctrlKey: true,
      callback: () => {
        if (selectedElementIds.length > 0) {
          setIsCreateTaskModalOpen(true)
        }
      },
      description: 'Create task from selected elements',
      preventDefault: true
    },
    // Copy, paste, and duplicate shortcuts
    {
      key: 'c',
      ctrlKey: true,
      callback: () => {
        if (selectedElementIds.length > 0) {
          copyElements()
        }
      },
      description: 'Copy selected elements',
      preventDefault: true
    },
    {
      key: 'v',
      ctrlKey: true,
      callback: async () => {
        // Check if clipboard contains images first
        try {
          const clipboardItems = await navigator.clipboard.read()
          const hasImage = clipboardItems.some(item => 
            item.types.some(type => type.startsWith('image/'))
          )
          
          if (hasImage) {
            // Let the native paste event handle images - don't prevent default
            // The handleClipboardPaste listener will handle this
            return
          }
        } catch {
          // If clipboard API fails, fall back to element pasting
          console.log('Clipboard API not available, falling back to element paste')
        }
        
        // No images found, handle internal element pasting
        pasteElements()
      },
      description: 'Paste elements or images',
      preventDefault: false
    },
    {
      key: 'd',
      ctrlKey: true,
      callback: () => {
        if (selectedElementIds.length > 0) {
          duplicateElements()
        }
      },
      description: 'Duplicate selected elements',
      preventDefault: true
    },
    // Undo/Redo shortcuts
    {
      key: 'z',
      ctrlKey: true,
      callback: (event) => {
        if (!event.shiftKey) {
          undo()
        }
      },
      description: 'Undo',
      preventDefault: true
    },
    {
      key: 'z',
      ctrlKey: true,
      shiftKey: true,
      callback: () => {
        redo()
      },
      description: 'Redo (Ctrl+Shift+Z)',
      preventDefault: true
    },
    {
      key: 'y',
      ctrlKey: true,
      callback: () => {
        redo()
      },
      description: 'Redo (Ctrl+Y)',
      preventDefault: true
    }
  ])

  useEffect(() => {
    loadElements()
  }, [board.id])

  // Restore camera position when board changes
  useEffect(() => {
    const savedPosition = cameraStorage.get(board.id)
    if (savedPosition) {
      setStageScale(savedPosition.scale)
      setStagePos({ x: savedPosition.x, y: savedPosition.y })
    }
  }, [board.id])

  // Save camera position when it changes (with debounce)
  useEffect(() => {
    const saveTimeout = setTimeout(() => {
      cameraStorage.save(board.id, {
        x: stagePos.x,
        y: stagePos.y,
        scale: stageScale
      })
    }, 500) // 500ms debounce

    return () => clearTimeout(saveTimeout)
  }, [board.id, stagePos.x, stagePos.y, stageScale])

  // Handle navigation context for auto-selection and centering
  useEffect(() => {
    if (navigationContext?.fromTask && navigationContext.elementIds.length > 0) {
      // Filter to only include elements that exist on this board
      const validElementIds = navigationContext.elementIds.filter(id => 
        elements.some(el => el.id === id)
      )
      
      if (validElementIds.length > 0) {
        // Select the elements
        setSelectedElementIds(validElementIds)
        
        // Center view on selected elements with a small delay to ensure elements are rendered
        setTimeout(() => {
          centerViewOnElements(validElementIds)
        }, 200)
      } else {
        // Reset to a reasonable default view if no elements found
        setStageScale(0.5)
        setStagePos({ x: 0, y: 0 })
      }
      
      // Clear navigation context after handling
      setNavigationContext(null)
    }
  }, [navigationContext, elements, setSelectedElementIds, setNavigationContext])
  
  // Close context menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (contextMenu) {
        // Don't close on right-click events or Mac Ctrl+click
        if (event.button === 2 || event.ctrlKey) return
        
        const target = event.target
        if (target instanceof Element && !target.closest('.context-menu')) {
          setContextMenu(null)
        }
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [contextMenu])

  // Keyboard shortcuts for zoom and context menu
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey) {
        if (event.key === '=' || event.key === '+') {
          event.preventDefault()
          // Zoom in - more noticeable steps
          const currentScale = stageScale
          const newScale = Math.min(5.0, currentScale * 1.5) // 50% zoom in
          setStageScale(newScale)
        } else if (event.key === '-') {
          event.preventDefault()
          // Zoom out - more noticeable steps  
          const currentScale = stageScale
          const newScale = Math.max(0.1, currentScale / 1.5) // 33% zoom out
          setStageScale(newScale)
        } else if (event.key === '0') {
          event.preventDefault()
          // Reset zoom to 100%
          setStageScale(1)
          setStagePos({ x: 0, y: 0 })
        }
      }
      
      // Context menu shortcut for accessibility and Mac users
      if (event.key === 'F10' && event.shiftKey && selectedElementIds.length > 0) {
        event.preventDefault()
        // Show context menu at center of first selected element
        const firstElement = elements.find(el => el.id === selectedElementIds[0])
        if (firstElement) {
          const centerX = (firstElement.x || 0) + (firstElement.width || 0) / 2
          const centerY = (firstElement.y || 0) + (firstElement.height || 0) / 2
          
          // Convert to screen coordinates
          const screenX = centerX * stageScale + stagePos.x + 256 // Account for left panel
          const screenY = centerY * stageScale + stagePos.y + 140 // Account for header
          
          setContextMenu({
            x: screenX,
            y: screenY,
            elementId: firstElement.id
          })
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [stageScale, selectedElementIds, elements, stagePos])

  // Handle clipboard paste events
  useEffect(() => {
    document.addEventListener('paste', handleClipboardPaste)
    return () => {
      document.removeEventListener('paste', handleClipboardPaste)
    }
  }, [handleClipboardPaste])

  async function loadElements() {
    try {
      const { data, error } = await supabase
        .from('elements')
        .select('*')
        .eq('board_id', board.id)
        .order('layer_index', { ascending: true })

      if (error) throw error
      setElements(data || [])
      clearHistory() // Clear history when loading new board
    } catch (error) {
      console.error('Error loading elements:', error)
    }
  }

  function centerViewOnElements(elementIds: string[]) {
    if (!stageRef.current || elementIds.length === 0) return

    const stage = stageRef.current
    const stageWidth = stage.width()
    const stageHeight = stage.height()
    
    // Calculate the bounding box of all selected elements
    const selectedElements = elements.filter(el => elementIds.includes(el.id))
    if (selectedElements.length === 0) return

    // Calculate element positions and bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    const elementPositions: Array<{ element: typeof selectedElements[0], x: number, y: number, width: number, height: number, centerX: number, centerY: number }> = []

    selectedElements.forEach(element => {
      // Use the actual element position (what the renderer uses)
      const x = element.x || 0
      const y = element.y || 0
      const width = element.width || 100
      const height = element.height || 100
      const centerX = x + width / 2
      const centerY = y + height / 2


      elementPositions.push({ element, x, y, width, height, centerX, centerY })

      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x + width)
      maxY = Math.max(maxY, y + height)
    })

    const elementsWidth = maxX - minX
    const elementsHeight = maxY - minY
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2


    // Check if elements are very distant from each other
    const maxDistance = Math.max(elementsWidth, elementsHeight)
    const avgElementSize = elementPositions.reduce((sum, pos) => sum + Math.max(pos.width, pos.height), 0) / elementPositions.length
    const distanceRatio = maxDistance / avgElementSize

    // If elements are very far apart (distance ratio > 10), consider grouping them
    const shouldGroup = distanceRatio > 10 && selectedElements.length > 1

    if (shouldGroup) {
      
      // Calculate optimal grouping position (viewport center)
      const targetCenterX = stageWidth / (2 * stageScale) - stagePos.x / stageScale
      const targetCenterY = stageHeight / (2 * stageScale) - stagePos.y / stageScale
      
      // Group elements closer together around the target center
      const groupRadius = Math.min(300, Math.max(200, avgElementSize * 3))
      const angleStep = (2 * Math.PI) / elementPositions.length
      
      // Create smooth grouped positions
      const groupedPositions = elementPositions.map((pos, index) => {
        let newX, newY
        
        if (elementPositions.length === 1) {
          newX = targetCenterX - pos.width / 2
          newY = targetCenterY - pos.height / 2
        } else if (elementPositions.length === 2) {
          // Place two elements side by side
          const spacing = Math.max(pos.width, pos.height) + 50
          newX = targetCenterX + (index === 0 ? -spacing/2 : spacing/2) - pos.width / 2
          newY = targetCenterY - pos.height / 2
        } else {
          // Arrange in a circle or grid pattern
          const angle = angleStep * index
          const radius = Math.min(groupRadius, groupRadius * Math.sqrt(elementPositions.length) / 3)
          newX = targetCenterX + Math.cos(angle) * radius - pos.width / 2
          newY = targetCenterY + Math.sin(angle) * radius - pos.height / 2
        }
        
        return { ...pos, newX, newY }
      })

      // Update elements with their new grouped positions
      const updatedElementsMap = new Map(groupedPositions.map(({ element, newX, newY }) => [
        element.id,
        {
          ...element,
          properties: {
            ...(element.properties as Record<string, unknown> || {}),
            x: newX,
            y: newY
          }
        }
      ]))

      // Update all elements in a single setState call
      // @ts-expect-error - TypeScript is being too strict about element types
      setElements(prev => prev.map(el => updatedElementsMap.get(el.id) || el))
      
      // Update positions in database asynchronously
      groupedPositions.forEach(async ({ element, newX, newY }) => {
        try {
          const newProperties = {
            ...(element.properties as Record<string, unknown> || {}),
            x: newX,
            y: newY
          }
          
          await supabase
            .from('elements')
            .update({ properties: newProperties })
            .eq('id', element.id)
        } catch (error) {
          console.error('Error updating element position:', error)
        }
      })

      // Calculate new bounding box after grouping
      const groupedMinX = Math.min(...groupedPositions.map(p => p.newX))
      const groupedMinY = Math.min(...groupedPositions.map(p => p.newY))
      const groupedMaxX = Math.max(...groupedPositions.map(p => p.newX + p.width))
      const groupedMaxY = Math.max(...groupedPositions.map(p => p.newY + p.height))
      
      const groupedCenterX = (groupedMinX + groupedMaxX) / 2
      const groupedCenterY = (groupedMinY + groupedMaxY) / 2
      const groupedWidth = groupedMaxX - groupedMinX
      const groupedHeight = groupedMaxY - groupedMinY

      // Calculate scale and position for grouped elements
      const padding = 150
      const scaleX = (stageWidth - padding * 2) / groupedWidth
      const scaleY = (stageHeight - padding * 2) / groupedHeight
      const calculatedScale = Math.min(scaleX, scaleY)
      const newScale = Math.min(Math.max(calculatedScale, 0.1), 1.0) // Same conservative limits

      // Center the grouped elements in viewport
      const viewportCenterX = stageWidth / 2
      const viewportCenterY = stageHeight / 2
      const newX = viewportCenterX - (groupedCenterX * newScale)
      const newY = viewportCenterY - (groupedCenterY * newScale)


      // Update stage with smoother animation for grouped elements
      setStageScale(newScale)
      setStagePos({ x: newX, y: newY })

      stage.to({
        duration: 0.5,
        x: newX,
        y: newY,
        scaleX: newScale,
        scaleY: newScale,
        easing: Konva.Easings.EaseInOut
      })

    } else {
      // Use original centering logic for elements that are close together
      // Calculate scale to fit elements with some padding
      const padding = 100
      
      // Handle case where elements have zero width/height
      const safeElementsWidth = Math.max(elementsWidth, 100)
      const safeElementsHeight = Math.max(elementsHeight, 100)
      
      const scaleX = (stageWidth - padding * 2) / safeElementsWidth
      const scaleY = (stageHeight - padding * 2) / safeElementsHeight
      
      // More conservative scale limits - don't zoom in too much
      const calculatedScale = Math.min(scaleX, scaleY)
      const newScale = Math.min(Math.max(calculatedScale, 0.1), 1.0) // Clamp between 0.1x and 1.0x
      
      // Calculate new position to center the elements in the viewport
      // We want the element center to appear at the viewport center
      // Stage positioning: negative values move content left/up, positive values move content right/down
      const viewportCenterX = stageWidth / 2
      const viewportCenterY = stageHeight / 2
      
      // Calculate where the element center will be in screen coordinates
      // We need: elementWorldPos * scale + stagePos = viewportCenter
      // So: stagePos = viewportCenter - (elementWorldPos * scale)
      
      // WAIT - I think the issue is that elements at (0,0) means their TOP-LEFT is at (0,0)
      // But their CENTER is at (50, 50) assuming 100x100 size
      // We want the CENTER to appear at viewport center
      
      const newX = viewportCenterX - (centerX * newScale)
      const newY = viewportCenterY - (centerY * newScale)

      // Update stage position and scale
      setStageScale(newScale)
      setStagePos({ x: newX, y: newY })

      // Add a subtle animation effect - animate the stage itself
      stage.to({
        duration: 0.3,
        x: newX,
        y: newY,
        scaleX: newScale,
        scaleY: newScale,
        easing: Konva.Easings.EaseOut
      })
    }
  }

  async function createElement(type: string, x: number, y: number, properties: Record<string, unknown> = {}) {
    if (!user) return

    // Get default color for this element type, but use selected color if available
    const colorKey = selectedColor
    const defaultColor = ELEMENT_COLORS[colorKey]
    
    // Get CSS custom property values
    const fillColor = getComputedColor(defaultColor.fill)
    const strokeColor = getComputedColor(defaultColor.stroke)

    const newElement = {
      board_id: board.id,
      type,
      x,
      y,
      width: type === 'text' ? 200 : 100,
      height: type === 'text' ? 50 : 100,
      rotation: 0,
      properties: {
        // Existing properties
        fill: type === 'text' ? (fillColor || 'var(--color-foreground)') : (fillColor || (type === 'sticky_note' ? '#fef3c7' : '#6366f1')),
        stroke: type === 'text' ? '' : (strokeColor || '#334155'),
        strokeWidth: type === 'text' ? 0 : 2,
        text: type === 'text' ? '# Markdown Text\n\nDouble click to edit\n\n- **Bold text**\n- *Italic text*\n- ***Bold italic***' : (type === 'sticky_note' ? 'Double click to edit' : ''),
        fontSize: type === 'text' ? 16 : undefined,
        fontWeight: type === 'text' ? 'normal' : undefined,
        colorKey, // Store the theme color key for future reference
        
        // New style properties with sensible defaults
        fillMode: 'filled',
        strokeStyle: 'solid',
        opacity: 1,
        cornerRadiusPreset: 'rounded',
        cornerRadius: type === 'rectangle' ? 3 : 0,
        fillOpacity: 1,
        strokeOpacity: 1,
        
        ...properties
      },
      layer_index: elements.length,
      created_by: (user as { id: string } | null)?.id || ''
    }

    try {
      const { data, error } = await supabase
        .from('elements')
        .insert(newElement)
        .select()
        .single()

      if (error) throw error
      addElement(data)
    } catch (error) {
      console.error('Error creating element:', error)
    }
  }

  async function updateElementInDB(id: string, updates: Partial<Element>) {
    try {
      const { error } = await supabase
        .from('elements')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      updateElement(id, updates)
    } catch (error) {
      console.error('Error updating element:', error)
    }
  }

  async function deleteElement(id: string) {
    try {
      const { error } = await supabase
        .from('elements')
        .delete()
        .eq('id', id)

      if (error) throw error
      removeElement(id)
    } catch (error) {
      console.error('Error deleting element:', error)
    }
  }

  async function changeElementColor(elementId: string, colorKey: ElementColorKey) {
    const colorConfig = ELEMENT_COLORS[colorKey]
    const fillColor = getComputedColor(colorConfig.fill)
    const strokeColor = getComputedColor(colorConfig.stroke)
    
    const element = elements.find(el => el.id === elementId)
    if (!element) return
    
    const updatedProperties = {
      ...(element.properties as Record<string, unknown>),
      fill: fillColor,
      stroke: strokeColor,
      colorKey
    }
    
    await updateElementInDB(elementId, { properties: updatedProperties })
  }
  
  async function changeElementToCustomColor(elementId: string, fillColor: string) {
    // Generate a slightly darker stroke color
    const strokeColor = adjustColorBrightness(fillColor, -20)
    
    const element = elements.find(el => el.id === elementId)
    if (!element) return
    
    const updatedProperties = {
      ...(element.properties as Record<string, unknown>),
      fill: fillColor,
      stroke: strokeColor,
      colorKey: 'custom' // Mark as custom color
    }
    
    await updateElementInDB(elementId, { properties: updatedProperties })
  }

  // Update element style properties
  async function updateElementProperties(elementId: string, newProperties: Partial<ElementProperties>) {
    const element = elements.find(el => el.id === elementId)
    if (!element) return

    const currentProperties = (element.properties as ElementProperties) || {}
    const updatedProperties = { ...currentProperties, ...newProperties }
    
    await updateElementInDB(elementId, { properties: updatedProperties })
  }
  
  // Helper function to adjust color brightness
  function adjustColorBrightness(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = (num >> 16) + amt
    const G = (num >> 8 & 0x00FF) + amt
    const B = (num & 0x0000FF) + amt
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1)
  }
  
  
  // Layer management functions
  function sendToBack() {
    if (selectedElementIds.length === 0) return
    
    // Find the minimum layer index among selected elements
    const selectedElements = elements.filter(el => selectedElementIds.includes(el.id))
    const minSelectedLayer = Math.min(...selectedElements.map(el => el.layer_index || 0))
    
    // Move other elements up to make room at the bottom
    elements.forEach(element => {
      if (!selectedElementIds.includes(element.id) && (element.layer_index || 0) < minSelectedLayer) {
        updateElementInDB(element.id, { layer_index: (element.layer_index || 0) + selectedElementIds.length })
      }
    })
    
    // Move selected elements to the back
    selectedElementIds.forEach((id, index) => {
      updateElementInDB(id, { layer_index: index })
    })
  }
  
  function sendBackward() {
    if (selectedElementIds.length === 0) return
    
    selectedElementIds.forEach(id => {
      const element = elements.find(el => el.id === id)
      if (element && (element.layer_index || 0) > 0) {
        const newLayerIndex = (element.layer_index || 0) - 1
        
        // Find element that currently has this layer index and swap
        const elementToSwap = elements.find(el => 
          !selectedElementIds.includes(el.id) && (el.layer_index || 0) === newLayerIndex
        )
        
        if (elementToSwap) {
          updateElementInDB(elementToSwap.id, { layer_index: element.layer_index || 0 })
        }
        
        updateElementInDB(id, { layer_index: newLayerIndex })
      }
    })
  }
  
  function bringForward() {
    if (selectedElementIds.length === 0) return
    
    const maxLayerIndex = Math.max(...elements.map(el => el.layer_index || 0))
    
    selectedElementIds.forEach(id => {
      const element = elements.find(el => el.id === id)
      if (element && (element.layer_index || 0) < maxLayerIndex) {
        const newLayerIndex = (element.layer_index || 0) + 1
        
        // Find element that currently has this layer index and swap
        const elementToSwap = elements.find(el => 
          !selectedElementIds.includes(el.id) && (el.layer_index || 0) === newLayerIndex
        )
        
        if (elementToSwap) {
          updateElementInDB(elementToSwap.id, { layer_index: element.layer_index || 0 })
        }
        
        updateElementInDB(id, { layer_index: newLayerIndex })
      }
    })
  }
  
  function bringToFront() {
    if (selectedElementIds.length === 0) return
    
    const maxLayerIndex = Math.max(...elements.map(el => el.layer_index || 0))
    
    selectedElementIds.forEach((id, index) => {
      updateElementInDB(id, { layer_index: maxLayerIndex + 1 + index })
    })
  }
  

  // Render context menu
  function renderContextMenu() {
    if (!contextMenu) return null
    
    const selectedCount = selectedElementIds.length
    
    return (
      <div
        className="context-menu fixed z-50 rounded-lg py-2 px-1 animate-in fade-in zoom-in-95 duration-150"
        style={{
          left: `${contextMenu.x}px`,
          top: `${contextMenu.y}px`,
          minWidth: '200px',
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-floating)'
        }}
      >
        {/* Task Creation */}
        <button
          onClick={() => {
            setIsCreateTaskModalOpen(true)
            setContextMenu(null)
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-all"
          style={{
            color: 'var(--color-card-foreground)',
            transitionDuration: 'var(--duration-normal)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'
            e.currentTarget.style.opacity = '0.8'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.opacity = '1'
          }}
        >
          <Plus className="h-4 w-4" />
          Create Task{selectedCount > 1 ? ` (${selectedCount})` : ''}
        </button>
        
        <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
        
        {/* Copy and Duplicate */}
        <button
          onClick={() => {
            copyElements()
            setContextMenu(null)
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-all"
          style={{
            color: 'var(--color-card-foreground)',
            transitionDuration: 'var(--duration-normal)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(14, 165, 233, 0.1)'
            e.currentTarget.style.opacity = '0.8'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.opacity = '1'
          }}
        >
          <ClipboardCopy className="h-4 w-4" />
          Copy{selectedCount > 1 ? ` (${selectedCount})` : ''}
        </button>
        
        <button
          onClick={() => {
            duplicateElements()
            setContextMenu(null)
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-all"
          style={{
            color: 'var(--color-card-foreground)',
            transitionDuration: 'var(--duration-normal)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(14, 165, 233, 0.1)'
            e.currentTarget.style.opacity = '0.8'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.opacity = '1'
          }}
        >
          <Copy className="h-4 w-4" />
          Duplicate{selectedCount > 1 ? ` (${selectedCount})` : ''}
        </button>
        
        <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
        
        {/* Layer Management */}
        <button
          onClick={() => {
            bringToFront()
            setContextMenu(null)
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-all"
          style={{
            color: 'var(--color-card-foreground)',
            transitionDuration: 'var(--duration-normal)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'
            e.currentTarget.style.opacity = '0.8'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.opacity = '1'
          }}
        >
          <CornerRightUp className="h-4 w-4" />
          Bring to Front
        </button>
        
        <button
          onClick={() => {
            bringForward()
            setContextMenu(null)
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-all"
          style={{
            color: 'var(--color-card-foreground)',
            transitionDuration: 'var(--duration-normal)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'
            e.currentTarget.style.opacity = '0.8'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.opacity = '1'
          }}
        >
          <ArrowUp className="h-4 w-4" />
          Bring Forward
        </button>
        
        <button
          onClick={() => {
            sendBackward()
            setContextMenu(null)
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-all"
          style={{
            color: 'var(--color-card-foreground)',
            transitionDuration: 'var(--duration-normal)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'
            e.currentTarget.style.opacity = '0.8'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.opacity = '1'
          }}
        >
          <ArrowDown className="h-4 w-4" />
          Send Backward
        </button>
        
        <button
          onClick={() => {
            sendToBack()
            setContextMenu(null)
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-all"
          style={{
            color: 'var(--color-card-foreground)',
            transitionDuration: 'var(--duration-normal)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'
            e.currentTarget.style.opacity = '0.8'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.opacity = '1'
          }}
        >
          <CornerRightDown className="h-4 w-4" />
          Send to Back
        </button>
        
        <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
        
        {/* Group Management */}
        {selectedCount > 1 && (
          <button
            onClick={() => {
              groupElements()
              setContextMenu(null)
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-all"
            style={{
              color: 'var(--color-card-foreground)',
              transitionDuration: 'var(--duration-normal)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'
              e.currentTarget.style.opacity = '0.8'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.opacity = '1'
            }}
          >
            <Group className="h-4 w-4" />
            Group ({selectedCount})
          </button>
        )}
        
        {/* Show ungroup if any selected element is in a group */}
        {selectedElementIds.some(id => {
          const element = elements.find(el => el.id === id)
          const properties = element?.properties as ElementProperties
          return properties?.groupId
        }) && (
          <button
            onClick={() => {
              ungroupElements()
              setContextMenu(null)
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-all"
            style={{
              color: 'var(--color-card-foreground)',
              transitionDuration: 'var(--duration-normal)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'
              e.currentTarget.style.opacity = '0.8'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.opacity = '1'
            }}
          >
            <Ungroup className="h-4 w-4" />
            Ungroup
          </button>
        )}
        
        {(selectedCount > 1 || selectedElementIds.some(id => {
          const element = elements.find(el => el.id === id)
          const properties = element?.properties as ElementProperties
          return properties?.groupId
        })) && (
          <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
        )}
        
        {/* Delete */}
        <button
          onClick={() => {
            selectedElementIds.forEach(id => deleteElement(id))
            setContextMenu(null)
            clearSelection()
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-all"
          style={{
            color: 'var(--color-destructive-500)',
            transitionDuration: 'var(--duration-normal)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
            e.currentTarget.style.opacity = '0.8'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.opacity = '1'
          }}
        >
          <Trash2 className="h-4 w-4" />
          Delete{selectedCount > 1 ? ` (${selectedCount})` : ''}
        </button>
      </div>
    )
  }

  function handleStageMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = e.target.getStage()
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

    // Close context menu
    setContextMenu(null)

    // Check for middle mouse button panning only
    const isMiddleClick = e.evt.button === 1
    
    if (isMiddleClick) {
      // Start panning
      setIsPanning(true)
      setPanStart({
        x: pos.x,
        y: pos.y,
        stageX: stagePos.x,
        stageY: stagePos.y
      })
      e.evt.preventDefault()
      document.body.style.cursor = 'grabbing'
      return
    }

    if (activeTool === 'select') {
      // If clicking on empty space with left mouse button, start selection rectangle
      if (e.target === stage && e.evt.button === 0) {
        // Clear existing selection if not holding shift
        if (!e.evt.shiftKey) {
          clearSelection()
        }
        
        // Convert screen coordinates to stage coordinates for proper alignment
        const stagePos = stage.getRelativePointerPosition()
        if (!stagePos) return
        
        // Start selection rectangle with stage-relative coordinates
        setSelectionRect({
          visible: true,
          x: stagePos.x,
          y: stagePos.y,
          width: 0,
          height: 0,
          startX: stagePos.x,
          startY: stagePos.y,
          shiftHeld: e.evt.shiftKey
        })
      }
    } else {
      // Create new element (use relative position for consistency)
      const stagePos = stage.getRelativePointerPosition()
      if (stagePos) {
        createElement(activeTool, stagePos.x, stagePos.y)
      }
      setActiveTool('select')
    }
  }

  function handleStageClick() {
    // This will only be called for actual clicks (not drags)
    // The selection logic is now handled in mouse down/up/move
  }

  function handleElementClick(elementId: string, e: Konva.KonvaEventObject<MouseEvent>) {
    e.cancelBubble = true
    
    // Check for Mac trackpad two-finger tap or right-click
    if (e.evt.button === 2 || e.evt.ctrlKey) {
      handleElementRightClick(elementId, e)
      return
    }
    
    // Close context menu on regular click
    setContextMenu(null)
    
    if (activeTool === 'select') {
      // Get the clicked element to check if it's part of a group
      const clickedElement = elements.find(el => el.id === elementId)
      const clickedProperties = clickedElement?.properties as ElementProperties
      
      // If the element is part of a group, select all group members
      const groupMembers = clickedProperties?.groupId 
        ? elements.filter(el => {
            const props = el.properties as ElementProperties
            return props?.groupId === clickedProperties.groupId
          }).map(el => el.id)
        : []
      
      if (e.evt.shiftKey) {
        if (groupMembers.length > 0) {
          // Toggle all group members
          groupMembers.forEach(id => toggleElementSelection(id))
        } else {
          toggleElementSelection(elementId)
        }
      } else {
        // Select the element or all group members
        const elementsToSelect = groupMembers.length > 0 ? groupMembers : [elementId]
        setSelectedElementIds(elementsToSelect)
      }
    }
  }
  
  function handleElementRightClick(elementId: string, e: Konva.KonvaEventObject<MouseEvent>) {
    e.cancelBubble = true
    e.evt.preventDefault()
    
    // Select the element if not already selected
    if (!selectedElementIds.includes(elementId)) {
      setSelectedElementIds([elementId])
    }
    
    // Get the mouse position relative to the browser window
    const clientX = e.evt.clientX
    const clientY = e.evt.clientY
    
    setContextMenu({
      x: clientX,
      y: clientY,
      elementId
    })
  }

  function handleElementDragStart(elementId: string) {
    // Save to history only once at the start of drag operation
    if (!isDragging) {
      saveToHistory()
      setIsDragging(true)
      
      let elementsToMove: string[]
      
      // Get the dragged element to check if it's part of a group
      const draggedElement = elements.find(el => el.id === elementId)
      const draggedProperties = draggedElement?.properties as ElementProperties
      
      // If the element is part of a group, include all group members
      const groupMembers = draggedProperties?.groupId 
        ? elements.filter(el => {
            const props = el.properties as ElementProperties
            return props?.groupId === draggedProperties.groupId
          }).map(el => el.id)
        : []
      
      // If the dragged element is part of a selection, drag all selected elements
      if (selectedElementIds.includes(elementId)) {
        elementsToMove = [...new Set([...selectedElementIds, ...groupMembers])]
        setDraggedElements(new Set(elementsToMove))
      } else {
        // If dragging a non-selected element, include its group members
        const elementsToSelect = groupMembers.length > 0 ? groupMembers : [elementId]
        setSelectedElementIds(elementsToSelect)
        elementsToMove = elementsToSelect
        setDraggedElements(new Set(elementsToSelect))
      }
      
      // Store initial positions for all elements that will be moved
      const initialPositions = new Map<string, { x: number; y: number }>()
      elementsToMove.forEach(id => {
        const element = elements.find(el => el.id === id)
        if (element) {
          initialPositions.set(id, { x: element.x || 0, y: element.y || 0 })
        }
      })
      setDragStartPositions(initialPositions)
    } else {
      // Add to dragged elements if multi-select drag
      setDraggedElements(prev => new Set([...prev, elementId]))
    }
  }
  
  function handleElementDrag(elementId: string, newAttrs: { x: number; y: number }) {
    // Get the original position of the dragged element
    const originalPos = dragStartPositions.get(elementId)
    if (!originalPos) {
      // Fallback: just update this element
      updateElementSilent(elementId, { x: newAttrs.x, y: newAttrs.y })
      return
    }
    
    // Calculate the offset from original position
    const deltaX = newAttrs.x - originalPos.x
    const deltaY = newAttrs.y - originalPos.y
    
    // Move all dragged elements by the same offset
    draggedElements.forEach(id => {
      const startPos = dragStartPositions.get(id)
      if (startPos) {
        const newX = startPos.x + deltaX
        const newY = startPos.y + deltaY
        updateElementSilent(id, { x: newX, y: newY })
      }
    })
  }

  function handleElementDragEnd(elementId: string, newAttrs: { x: number; y: number }) {
    // Update database for all dragged elements with their final positions
    draggedElements.forEach(id => {
      const element = elements.find(el => el.id === id)
      if (element) {
        updateElementInDB(id, { x: element.x, y: element.y })
      }
    })
    
    // Reset drag state
    setIsDragging(false)
    setDraggedElements(new Set())
    setDragStartPositions(new Map())
  }

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault()
    
    const stage = stageRef.current
    if (!stage) return

    const deltaX = e.evt.deltaX
    const deltaY = e.evt.deltaY
    
    // PRIORITY 1: Ctrl/Cmd + scroll = zooming
    if (e.evt.ctrlKey || e.evt.metaKey) {
      // Set zooming state for UI feedback
      setIsZooming(true)
    
      // Clear any existing zoom timeout
      if (window.zoomTimeout) {
        clearTimeout(window.zoomTimeout)
      }
      
      // Reset zooming state after a delay
      window.zoomTimeout = setTimeout(() => {
        setIsZooming(false)
      }, 150)

      // Zoom limits for better UX
      const minScale = 0.1  // 10% minimum zoom
      const maxScale = 5.0  // 500% maximum zoom
      
      // Improved scaling with better sensitivity and device detection
      // Different sensitivity for different scroll types
      // Most trackpads send smaller deltaY values, mice send larger ones
      let sensitivity = 0.01 // Increased base sensitivity for more noticeable zoom
      
      // Detect trackpad vs mouse wheel based on deltaY magnitude
      if (Math.abs(deltaY) > 100) {
        // Likely a mouse wheel - use higher sensitivity for more responsive feel
        sensitivity = 0.015
      } else {
        // Likely a trackpad - moderate sensitivity for good control
        sensitivity = 0.008
      }
      
      // Calculate zoom factor based on scroll amount
      let zoomFactor = 1 - (deltaY * sensitivity)
      
      // Wider zoom factor range for more noticeable steps
      zoomFactor = Math.max(0.8, Math.min(1.25, zoomFactor))
      
      const oldScale = stage.scaleX()
      let newScale = oldScale * zoomFactor
      
      // Apply zoom limits
      newScale = Math.max(minScale, Math.min(maxScale, newScale))
      
      // If we're at the limits, don't zoom
      if (newScale === oldScale) return
      
      // Calculate mouse position for zoom-to-mouse behavior
      const pointer = stage.getPointerPosition()
      if (!pointer) return
      
      const mousePointTo = {
        x: pointer.x / oldScale - stage.x() / oldScale,
        y: pointer.y / oldScale - stage.y() / oldScale
      }
      
      // Update scale and position for smooth zoom-to-mouse
      setStageScale(newScale)
      setStagePos({
        x: -(mousePointTo.x - pointer.x / newScale) * newScale,
        y: -(mousePointTo.y - pointer.y / newScale) * newScale
      })
      return
    }
    
    // PRIORITY 2: Regular scroll = panning in any direction
    // This makes trackpad navigation natural - scroll to move around
    setStagePos(prev => ({
      x: prev.x - deltaX,
      y: prev.y - deltaY
    }))
  }

  function handleStageMouseMove() {
    const stage = stageRef.current
    if (!stage) return
    
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    
    // Handle element resizing
    if (resizeState.isResizing) {
      if (!resizeState.startPointer || !resizeState.originalBounds || !resizeState.elementId) return
      
      // Calculate offset from original drag start position
      const deltaX = pointer.x - resizeState.startPointer.x
      const deltaY = pointer.y - resizeState.startPointer.y
      
      const { x: origX, y: origY, width: origWidth, height: origHeight } = resizeState.originalBounds
      
      
      // Calculate new dimensions and position based on handle type and delta
      let newAttrs: Partial<WhiteboardElement> = {}
      
      switch (resizeState.handleType) {
        case 'se': // Bottom-right corner
          newAttrs = {
            width: Math.max(20, origWidth + deltaX),
            height: Math.max(20, origHeight + deltaY)
          }
          break
        case 'nw': // Top-left corner
          const nwNewWidth = Math.max(20, origWidth - deltaX)
          const nwNewHeight = Math.max(20, origHeight - deltaY)
          newAttrs = {
            x: origX + (origWidth - nwNewWidth),
            y: origY + (origHeight - nwNewHeight),
            width: nwNewWidth,
            height: nwNewHeight
          }
          break
        case 'ne': // Top-right corner
          const neNewHeight = Math.max(20, origHeight - deltaY)
          newAttrs = {
            y: origY + (origHeight - neNewHeight),
            width: Math.max(20, origWidth + deltaX),
            height: neNewHeight
          }
          break
        case 'sw': // Bottom-left corner
          const swNewWidth = Math.max(20, origWidth - deltaX)
          newAttrs = {
            x: origX + (origWidth - swNewWidth),
            width: swNewWidth,
            height: Math.max(20, origHeight + deltaY)
          }
          break
        case 'e': // Right side
          newAttrs = { width: Math.max(20, origWidth + deltaX) }
          break
        case 'w': // Left side
          const wNewWidth = Math.max(20, origWidth - deltaX)
          newAttrs = {
            x: origX + (origWidth - wNewWidth),
            width: wNewWidth
          }
          break
        case 's': // Bottom side
          newAttrs = { height: Math.max(20, origHeight + deltaY) }
          break
        case 'n': // Top side
          const nNewHeight = Math.max(20, origHeight - deltaY)
          newAttrs = {
            y: origY + (origHeight - nNewHeight),
            height: nNewHeight
          }
          break
      }
      
      
      // Update element locally for smooth interaction without saving to history
      updateElementSilent(resizeState.elementId, newAttrs)
      return
    }
    
    // Handle panning
    if (isPanning && panStart) {
      const deltaX = pointer.x - panStart.x
      const deltaY = pointer.y - panStart.y
      
      setStagePos({
        x: panStart.stageX + deltaX,
        y: panStart.stageY + deltaY
      })
      return
    }
    
    // Handle selection rectangle dragging
    if (selectionRect.visible) {
      // Use stage-relative coordinates for proper alignment
      const stagePos = stage.getRelativePointerPosition()
      if (!stagePos) return
      
      const startX = selectionRect.startX
      const startY = selectionRect.startY
      const currentX = stagePos.x
      const currentY = stagePos.y
      
      // Calculate rectangle bounds (handle dragging in any direction: up/down/left/right)
      // Math.min ensures the top-left corner is always the origin regardless of drag direction
      const x = Math.min(startX, currentX)
      const y = Math.min(startY, currentY)
      const width = Math.abs(currentX - startX)
      const height = Math.abs(currentY - startY)
      
      setSelectionRect(prev => ({
        ...prev,
        x,
        y,
        width,
        height
      }))
    }
  }

  function handleStageMouseUp() {
    // Handle panning completion
    if (isPanning) {
      setIsPanning(false)
      setPanStart(null)
      document.body.style.cursor = ''
      return
    }
    
    // Handle resize completion
    if (resizeState.isResizing) {
      const elementId = resizeState.elementId
      
      // Reset resize state
      setResizeState({ 
        isResizing: false, 
        elementId: null, 
        handleType: null, 
        startPointer: null, 
        originalBounds: null 
      })
      
      // Persist changes to database only after resize ends
      if (elementId) {
        const currentElement = elements.find(el => el.id === elementId)
        if (currentElement) {
          updateElementInDB(elementId, {
            x: currentElement.x,
            y: currentElement.y,
            width: currentElement.width,
            height: currentElement.height
          })
        }
      }
      return
    }
    
    // Handle selection rectangle completion
    if (selectionRect.visible) {
      // Find elements that intersect with the selection rectangle
      const selectedElements: string[] = []
      
      elements.forEach(element => {
        const elementX = element.x || 0
        const elementY = element.y || 0
        const elementWidth = element.width || 0
        const elementHeight = element.height || 0
        
        // Check if element intersects with selection rectangle
        const isIntersecting = !(
          elementX > selectionRect.x + selectionRect.width ||
          elementX + elementWidth < selectionRect.x ||
          elementY > selectionRect.y + selectionRect.height ||
          elementY + elementHeight < selectionRect.y
        )
        
        if (isIntersecting) {
          selectedElements.push(element.id)
        }
      })
      
      // Only apply selection if we actually dragged (minimum 2px movement for higher sensitivity)
      const draggedDistance = Math.abs(selectionRect.width) + Math.abs(selectionRect.height)
      if (draggedDistance > 2) {
        if (selectionRect.shiftHeld && selectedElements.length > 0) {
          // Add to existing selection
          const combinedSelection = [...new Set([...selectedElementIds, ...selectedElements])]
          setSelectedElementIds(combinedSelection)
        } else if (selectedElements.length > 0) {
          // Replace selection
          setSelectedElementIds(selectedElements)
        }
      }
      
      // Reset selection rectangle
      setSelectionRect({
        visible: false,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        startX: 0,
        startY: 0,
        shiftHeld: false
      })
    }
  }



  function renderResizeHandles(element: WhiteboardElement) {
    // Don't show resize handles for circles - not supported yet
    if (element.type === 'circle') {
      return []
    }

    const handleSize = 6 / stageScale // Scale handle size with zoom (reduced from 8 to 6)
    const x = element.x || 0
    const y = element.y || 0
    const width = element.width || 0
    const height = element.height || 0
    
    // For rectangles and other shapes, use rectangular bounding box
    const handles = [
      // Corner handles - positioned at exact corners
      { x: x - handleSize/2, y: y - handleSize/2, cursor: 'nw-resize', type: 'nw' },
      { x: x + width - handleSize/2, y: y - handleSize/2, cursor: 'ne-resize', type: 'ne' },
      { x: x - handleSize/2, y: y + height - handleSize/2, cursor: 'sw-resize', type: 'sw' },
      { x: x + width - handleSize/2, y: y + height - handleSize/2, cursor: 'se-resize', type: 'se' },
      // Side handles - positioned at midpoints
      { x: x + width/2 - handleSize/2, y: y - handleSize/2, cursor: 'n-resize', type: 'n' },
      { x: x + width/2 - handleSize/2, y: y + height - handleSize/2, cursor: 's-resize', type: 's' },
      { x: x - handleSize/2, y: y + height/2 - handleSize/2, cursor: 'w-resize', type: 'w' },
      { x: x + width - handleSize/2, y: y + height/2 - handleSize/2, cursor: 'e-resize', type: 'e' }
    ]

    return handles.map(handle => (
      <Rect
        key={`handle-${element.id}-${handle.type}`}
        x={handle.x}
        y={handle.y}
        width={handleSize}
        height={handleSize}
        fill="#ffffff"
        stroke="#6366f1"
        strokeWidth={1.5 / stageScale}
        draggable={false}
        perfectDrawEnabled={false}
        onMouseDown={(e) => {
          const stage = stageRef.current
          if (!stage) return
          
          const pointer = stage.getPointerPosition()
          if (!pointer) return
          
          // Prevent event bubbling
          e.cancelBubble = true
          e.evt.preventDefault()
          e.evt.stopPropagation()
          
          // Save to history before starting resize
          saveToHistory()
          
          // Store initial state for proper offset calculation
          setResizeState({
            isResizing: true,
            elementId: element.id,
            handleType: handle.type,
            startPointer: { x: pointer.x, y: pointer.y },
            originalBounds: { x: element.x || 0, y: element.y || 0, width: element.width || 0, height: element.height || 0 }
          })
          
        }}
      />
    ))
  }

  // Helper function to convert stroke style to Konva dash array
  function getStrokeDashArray(strokeStyle: string | undefined, strokeWidth: number): number[] | undefined {
    switch (strokeStyle) {
      case 'dashed':
        return [strokeWidth * 3, strokeWidth * 2]
      case 'dotted':
        return [strokeWidth, strokeWidth]
      default:
        return undefined
    }
  }


  // Helper function to get group information
  function getGroupInfo(elementId: string) {
    const element = elements.find(el => el.id === elementId)
    const props = element?.properties as ElementProperties
    const groupId = props?.groupId
    
    if (!groupId) return null
    
    const groupMembers = elements.filter(el => {
      const memberProps = el.properties as ElementProperties
      return memberProps?.groupId === groupId
    })
    
    return {
      groupId,
      memberCount: groupMembers.length,
      isGroupLeader: props?.isGroupLeader || false,
      members: groupMembers
    }
  }

  function renderElement(element: WhiteboardElement) {
    const isSelected = selectedElementIds.includes(element.id)
    const props = element.properties as ElementProperties || {}
    const groupInfo = getGroupInfo(element.id)
    const isGrouped = !!groupInfo

    // Get effective style values
    const fillOpacity = getEffectiveFillOpacity(props)
    const strokeOpacity = getEffectiveStrokeOpacity(props)
    
    // Enhanced stroke styling for selection and grouping
    let strokeWidth = props.strokeWidth || 2
    let strokeColor = props.stroke as string
    
    if (isSelected) {
      strokeWidth = 2
      strokeColor = 'var(--color-primary-500)'
    } else if (isGrouped) {
      strokeWidth = 1.5
      strokeColor = '#6ee7b7' // Light emerald for grouped elements
    }
    
    const dashArray = getStrokeDashArray(props.strokeStyle, strokeWidth)
    
    const baseProps = {
      x: element.x || 0,
      y: element.y || 0,
      width: element.width || 0,
      height: element.height || 0,
      rotation: element.rotation || 0,
      draggable: activeTool === 'select',
      onClick: (e: Konva.KonvaEventObject<MouseEvent>) => handleElementClick(element.id, e),
      onDblClick: () => {
        // For images, double-click could open properties or do nothing for now
        console.log('Image double-clicked:', element.id)
      },
      onDragStart: () => handleElementDragStart(element.id),
      onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => handleElementDrag(element.id, e.target.attrs),
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => handleElementDragEnd(element.id, e.target.attrs),
      onContextMenu: (e: Konva.KonvaEventObject<MouseEvent>) => handleElementRightClick(element.id, e),
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      ...(dashArray && { dash: dashArray }),
      opacity: props.opacity || 1
    }

    switch (element.type) {
      case 'rectangle':
        const cornerRadius = getEffectiveCornerRadius(props, element.width || 0, element.height || 0)
        return (
          <Rect
            key={element.id}
            {...baseProps}
            fill={props.fill as string}
            fillOpacity={fillOpacity}
            strokeOpacity={strokeOpacity}
            cornerRadius={cornerRadius}
          />
        )
      case 'sticky_note':
        return (
          <React.Fragment key={element.id}>
            <Rect
              {...baseProps}
              fill={props.fill as string}
              cornerRadius={8}
            />
            <Text
              {...baseProps}
              text={(props.text as string) || 'Double click to edit'}
              fontSize={(props.fontSize as number) || 14}
              fill="var(--color-gray-800)"
              align="center"
              verticalAlign="middle"
              fontFamily="var(--font-sans)"
              padding={8}
              onDblClick={() => {
                setEditingElement({ id: element.id, text: (props.text as string) || '' })
              }}
            />
          </React.Fragment>
        )
      case 'circle':
        return (
          <Circle
            key={element.id}
            {...baseProps}
            radius={(element.width || 0) / 2}
            fill={props.fill as string}
            fillOpacity={fillOpacity}
            strokeOpacity={strokeOpacity}
            onDblClick={() => setShowComingSoonModal(true)}
          />
        )
      case 'text':
        return (
          <MarkdownText
            key={element.id}
            text={(props.text as string) || '# Markdown Text\n\nDouble click to edit\n\n- **Bold text**\n- *Italic text*\n- ***Bold italic***'}
            x={element.x || 0}
            y={element.y || 0}
            width={element.width || 200}
            height={element.height || 100}
            fontSize={(props.fontSize as number) || 16}
            fill={(props.fill as string) || 'var(--color-foreground)'}
            fontFamily="Arial, sans-serif"
            align="left"
            verticalAlign="top"
            onClick={(e: Konva.KonvaEventObject<MouseEvent>) => handleElementClick(element.id, e)}
            onDblClick={() => {
              setInlineEditingElement(element.id)
            }}
            draggable={activeTool === 'select' && inlineEditingElement !== element.id}
            onDragStart={() => handleElementDragStart(element.id)}
            onDragMove={(e: Konva.KonvaEventObject<DragEvent>) => handleElementDrag(element.id, e.target.attrs)}
            onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => handleElementDragEnd(element.id, e.target.attrs)}
            onContextMenu={(e: Konva.KonvaEventObject<MouseEvent>) => handleElementRightClick(element.id, e)}
            isEditing={inlineEditingElement === element.id}
            onTextSave={(newText: string) => {
              updateElementProperties(element.id, { text: newText })
              setInlineEditingElement(null)
            }}
            onEditingCancel={() => {
              setInlineEditingElement(null)
            }}
          />
        )
      case 'arrow':
        return (
          <Arrow
            key={element.id}
            {...baseProps}
            points={[0, 0, element.width || 0, element.height || 0]}
            fill={props.fill as string}
            pointerLength={8}
            pointerWidth={8}
          />
        )
      case 'image':
        return (
          <ImageElement
            key={element.id}
            element={element}
            baseProps={baseProps}
          />
        )
      default:
        return null
    }
  }

  const tools = [
    { type: 'select', icon: MousePointer, label: 'Select' },
    { type: 'rectangle', icon: Square, label: 'Rectangle' },
    { type: 'circle', icon: CircleIcon, label: 'Circle' },
    { type: 'text', icon: Type, label: 'Text' },
    { type: 'arrow', icon: ArrowRight, label: 'Arrow' },
    { type: 'sticky_note', icon: StickyNote, label: 'Sticky Note' },
    { type: 'image', icon: Image, label: 'Image' }
  ] as const

  // Render left panel
  function renderLeftPanel() {
    return (
      <div className="w-64 whimsical-card border-r-0 flex flex-col">

        {/* Tools Section */}
        <div className="p-4 border-b border-purple-200 dark:border-purple-700">
          <h3 className="text-sm font-medium text-foreground mb-3">Tools</h3>
          <div className="grid grid-cols-3 gap-2">
            {tools.map(({ type, icon: Icon, label }) => {
              const shortcutMap: Record<string, string> = {
                select: 'V',
                rectangle: 'R',
                circle: 'C',
                text: 'T',
                arrow: 'A',
                sticky_note: 'S',
                image: 'I'
              }
              
              return (
                <button
                  key={type}
                  onClick={() => handleToolChange(type)}
                  className={`p-3 rounded-lg transition-colors duration-200 flex flex-col items-center gap-1 ${
                    activeTool === type
                      ? 'bg-purple-500 text-white'
                      : 'text-muted-foreground hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700 dark:hover:text-purple-300'
                  }`}
                  title={`${label} (${shortcutMap[type]})`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{shortcutMap[type]}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Colors Section */}
        <div className="p-4 border-b border-purple-200 dark:border-purple-700">
          <h3 className="text-sm font-medium text-foreground mb-3">Colors</h3>
          
          {/* Primary 4 Colors */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {PRIMARY_COLORS.map(colorKey => {
              const config = ELEMENT_COLORS[colorKey]
              const fillColor = getComputedColor(config.fill)
              const strokeColor = getComputedColor(config.stroke)
              
              return (
                <button
                  key={colorKey}
                  onClick={() => {
                    setSelectedColor(colorKey)
                    if (selectedElementIds.length > 0) {
                      selectedElementIds.forEach(id => changeElementColor(id, colorKey))
                    }
                  }}
                  className={`p-2 rounded-lg transition-colors duration-200 ${
                    selectedColor === colorKey ? 'ring-2 ring-purple-400 dark:ring-purple-500' : 'hover:ring-1 hover:ring-purple-200 dark:hover:ring-purple-600'
                  }`}
                  title={config.name}
                >
                  <div 
                    className="w-8 h-8 rounded-full mx-auto"
                    style={{ 
                      backgroundColor: fillColor,
                      border: `2px solid ${strokeColor}`
                    }}
                  />
                </button>
              )
            })}
          </div>

          {/* All Colors Grid */}
          <div className="grid grid-cols-6 gap-1 mb-4">
            {Object.entries(ELEMENT_COLORS).map(([colorKey, config]) => {
              const fillColor = getComputedColor(config.fill)
              const strokeColor = getComputedColor(config.stroke)
              
              return (
                <button
                  key={colorKey}
                  onClick={() => {
                    setSelectedColor(colorKey as ElementColorKey)
                    if (selectedElementIds.length > 0) {
                      selectedElementIds.forEach(id => changeElementColor(id, colorKey as ElementColorKey))
                    }
                  }}
                  className={`p-1 rounded transition-colors duration-200 ${
                    selectedColor === colorKey ? 'ring-2 ring-purple-400 dark:ring-purple-500' : 'hover:ring-1 hover:ring-purple-200 dark:hover:ring-purple-600'
                  }`}
                  title={config.name}
                >
                  <div 
                    className="w-6 h-6 rounded border-2"
                    style={{ 
                      backgroundColor: fillColor,
                      borderColor: strokeColor
                    }}
                  />
                </button>
              )
            })}
          </div>

          {/* Custom Color Picker */}
          <div className="border-t border-purple-200 dark:border-purple-700 pt-3">
            <div className="text-xs font-medium text-foreground mb-2">Custom</div>
            <div className="flex gap-2 items-center mb-2">
              <input
                type="color"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value)
                  if (selectedElementIds.length > 0) {
                    selectedElementIds.forEach(id => changeElementToCustomColor(id, e.target.value))
                  }
                }}
                className="w-8 h-8 rounded border border-purple-200 dark:border-purple-600 cursor-pointer flex-shrink-0"
                title="Custom color picker"
              />
              <input
                type="text"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && selectedElementIds.length > 0) {
                    selectedElementIds.forEach(id => changeElementToCustomColor(id, customColor))
                  }
                }}
                placeholder="#ffffff"
                className="flex-1 min-w-0 px-2 py-1 text-xs border border-border rounded bg-input text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
                pattern="^#[0-9A-Fa-f]{6}$"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Pick or type hex color
            </div>
          </div>
        </div>

        {/* Selection Actions */}
        {selectedElementIds.length > 0 && (
          <div className="p-4 border-b border-purple-200 dark:border-purple-700">
            <h3 className="text-sm font-medium text-foreground mb-3">
              Selection ({selectedElementIds.length})
            </h3>
            
            {/* Circle resizing notice */}
            {selectedElementIds.some(id => {
              const element = elements.find(el => el.id === id)
              return element?.type === 'circle'
            }) && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-xs text-amber-800">
                  💡 Circle resizing is coming soon! Double-click to learn more.
                </p>
              </div>
            )}

            
            <div className="space-y-2">
              <button
                onClick={() => setIsCreateTaskModalOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Create Task
              </button>
              <button
                onClick={() => {
                  duplicateElements()
                }}
                className="w-full flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm"
              >
                <Copy className="h-4 w-4" />
                Duplicate
              </button>
              <button
                onClick={() => {
                  selectedElementIds.forEach(id => deleteElement(id))
                  clearSelection()
                }}
                className="w-full flex items-center gap-2 px-3 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/80 transition-colors text-sm"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            </div>
          </div>
        )}

      </div>
    )
  }

  return (
    <div className="h-full flex relative z-10 bg-card">
      {/* Unified Panel Container */}
      <div className="whimsical-card border-r border-purple-200 dark:border-purple-700 flex">
        {/* Left Panel */}
        {renderLeftPanel()}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="whimsical-card border-b border-purple-200 dark:border-purple-700 p-3 flex items-center justify-between">
          <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
            {board.name} - Whiteboard
          </div>
          <div className="flex items-center gap-4">
            {/* Style Options for Selected Elements */}
            {(() => {
              // Get supported elements (rectangles, circles, and text)
              const supportedElements = selectedElementIds
                .map(id => elements.find(el => el.id === id))
                .filter((el): el is NonNullable<typeof el> => 
                  el !== undefined && (el.type === 'rectangle' || el.type === 'circle' || el.type === 'text')
                )
              
              
              // Get non-text elements that need styling controls
              const nonTextElements = supportedElements.filter(el => el.type !== 'text')
              
              // Only show the toolbar container if we're in inline editing mode OR there are non-text elements
              const shouldShowContainer = !!inlineEditingElement || nonTextElements.length > 0
              
              if (!shouldShowContainer) return null

              // Check if all elements have the same property value
              const getCommonValue = <K extends keyof ElementProperties>(key: K): ElementProperties[K] | undefined => {
                const values = supportedElements.map(el => {
                  const props = el.properties as ElementProperties
                  return props?.[key]
                })
                const firstValue = values[0]
                return values.every(val => val === firstValue) ? firstValue : undefined
              }

              return (
                <div className="flex items-center gap-4 px-3 py-1 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                  {/* Markdown Toolbar - only show during inline editing */}
                  <MarkdownToolbar 
                    isVisible={!!inlineEditingElement}
                    onInsertFormatting={(before: string, after?: string) => {
                      if (insertFormattingFn) {
                        insertFormattingFn(before, after)
                      }
                    }}
                  />
                  
                  {/* Opacity and Stroke Style - only show for shapes */}
                  {nonTextElements.length > 0 && (
                    <>
                      {/* Quick Opacity Presets */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">Opacity</span>
                        <div className="flex gap-1">
                          {[0.25, 0.5, 0.75, 1].map((opacity) => (
                            <button
                              key={opacity}
                              onClick={() => {
                                supportedElements.forEach(element => {
                                  updateElementProperties(element.id, { opacity })
                                })
                              }}
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                Math.abs((getCommonValue('opacity') || 1) - opacity) < 0.05
                                  ? 'bg-purple-500 text-white'
                                  : 'bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-800/50'
                              }`}
                              title={`${Math.round(opacity * 100)}%`}
                            >
                              {Math.round(opacity * 100)}%
                            </button>
                          ))}
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={(getCommonValue('opacity') || 1) * 100}
                          onChange={(e) => {
                            const opacity = Number(e.target.value) / 100
                            supportedElements.forEach(element => {
                              updateElementProperties(element.id, { opacity })
                            })
                          }}
                          className="w-16 h-1 bg-purple-200 dark:bg-purple-700 rounded appearance-none cursor-pointer ml-2"
                        />
                      </div>
                      
                      {/* Quick Stroke Style Presets */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">Style</span>
                        <div className="flex gap-1">
                          {[
                            { value: 'solid', label: 'Solid', symbol: '━' },
                            { value: 'dashed', label: 'Dash', symbol: '┅' },
                            { value: 'dotted', label: 'Dot', symbol: '⋯' }
                          ].map(({ value, label, symbol }) => (
                            <button
                              key={value}
                              onClick={() => {
                                supportedElements.forEach(element => {
                                  updateElementProperties(element.id, { strokeStyle: value as 'solid' | 'dashed' | 'dotted' })
                                })
                              }}
                              className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                                (getCommonValue('strokeStyle') || 'solid') === value
                                  ? 'bg-purple-500 text-white'
                                  : 'bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-800/50'
                              }`}
                              title={label}
                            >
                              <span className="text-sm">{symbol}</span>
                              <span>{label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )
            })()}
            
            <div className="flex items-center gap-2">
              <div 
                className={`text-xs px-2 py-1 rounded border font-medium ${
                  isZooming 
                    ? 'bg-purple-500 text-white border-purple-400' 
                    : 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700'
                }`}
                title="Use Ctrl+scroll to zoom, or Ctrl+Plus/Minus/0"
              >
                Zoom: {Math.round(stageScale * 100)}%
              </div>
              
              
              {isPanning && (
                <div 
                  className="text-xs px-2 py-1 rounded border font-medium bg-blue-500 text-white border-blue-400"
                  title="Currently panning"
                >
                  ↔️ Panning
                </div>
              )}
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-hidden">
          <Stage
            ref={stageRef}
            width={window.innerWidth - 256} // Account for left panel (w-64 = 256px)
            height={window.innerHeight - 140} // Account for header and toolbar
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePos.x}
          y={stagePos.y}
          onWheel={handleWheel}
          onClick={handleStageClick}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onContextMenu={(e) => {
            // Handle stage-level context menu (e.g., for background)
            e.evt.preventDefault()
            // For now, just close any existing context menu when right-clicking on empty space
            setContextMenu(null)
          }}
          draggable={false}
        >
          <Layer>
            {/* Dot Grid Pattern like Whimsical */}
            {(() => {
              // Adaptive dot spacing based on zoom level
              const baseDotSpacing = 20
              let currentDotSpacing = baseDotSpacing
              let dotLevel = 0
              
              // Scale dot spacing based on zoom - show larger spacing when zoomed out
              if (stageScale < 0.25) {
                currentDotSpacing = baseDotSpacing * 8 // 160px spacing
                dotLevel = 3
              } else if (stageScale < 0.5) {
                currentDotSpacing = baseDotSpacing * 4 // 80px spacing  
                dotLevel = 2
              } else if (stageScale < 1) {
                currentDotSpacing = baseDotSpacing * 2 // 40px spacing
                dotLevel = 1
              } else {
                currentDotSpacing = baseDotSpacing // 20px spacing
                dotLevel = 0
              }
              
              const majorDotSpacing = currentDotSpacing * 5 // Every 5th dot is larger
              const dots = []
              
              // Calculate visible area based on zoom and position
              const visibleArea = {
                x: -stagePos.x / stageScale,
                y: -stagePos.y / stageScale,
                width: window.innerWidth / stageScale,
                height: window.innerHeight / stageScale
              }
              
              // Only render dots in visible area for performance
              const startX = Math.floor(visibleArea.x / currentDotSpacing) * currentDotSpacing
              const endX = Math.ceil((visibleArea.x + visibleArea.width) / currentDotSpacing) * currentDotSpacing
              const startY = Math.floor(visibleArea.y / currentDotSpacing) * currentDotSpacing
              const endY = Math.ceil((visibleArea.y + visibleArea.height) / currentDotSpacing) * currentDotSpacing
              
              // Calculate opacity based on zoom level for smooth transitions
              const minOpacity = 0.2
              const maxOpacity = 0.6
              const dotOpacity = Math.max(minOpacity, Math.min(maxOpacity, stageScale * 0.4 + 0.2))
              
              // Dot size scales with zoom
              const minorDotSize = Math.max(1, Math.min(2, stageScale * 1.5))
              const majorDotSize = Math.max(2, Math.min(4, stageScale * 2.5))
              
              // Create dots at grid intersections
              for (let x = startX; x <= endX; x += currentDotSpacing) {
                for (let y = startY; y <= endY; y += currentDotSpacing) {
                  const isMajor = (x % majorDotSpacing === 0) && (y % majorDotSpacing === 0)
                  const dotSize = isMajor ? majorDotSize : minorDotSize
                  
                  dots.push(
                    <Circle
                      key={`dot-${x}-${y}-${dotLevel}`}
                      x={x}
                      y={y}
                      radius={dotSize}
                      fill={isMajor ? '#94a3b8' : '#cbd5e1'}
                      opacity={isMajor ? dotOpacity : dotOpacity * 0.7}
                    />
                  )
                }
              }
              
              return dots
            })()}
            
            {/* Elements */}
            {elements.map(renderElement)}
            
            {/* Group boundaries */}
            {(() => {
              const groupsToRender = new Set<string>()
              const groupBounds = new Map<string, { minX: number, minY: number, maxX: number, maxY: number, count: number, leaderElement?: WhiteboardElement }>()
              
              // Calculate bounds for each group
              elements.forEach(element => {
                const props = element.properties as ElementProperties
                const groupId = props?.groupId
                if (!groupId) return
                
                groupsToRender.add(groupId)
                
                const x = element.x || 0
                const y = element.y || 0
                const width = element.width || 0
                const height = element.height || 0
                
                if (groupBounds.has(groupId)) {
                  const bounds = groupBounds.get(groupId)!
                  bounds.minX = Math.min(bounds.minX, x)
                  bounds.minY = Math.min(bounds.minY, y)
                  bounds.maxX = Math.max(bounds.maxX, x + width)
                  bounds.maxY = Math.max(bounds.maxY, y + height)
                  bounds.count++
                  if (props?.isGroupLeader) {
                    bounds.leaderElement = element
                  }
                } else {
                  groupBounds.set(groupId, {
                    minX: x,
                    minY: y,
                    maxX: x + width,
                    maxY: y + height,
                    count: 1,
                    leaderElement: props?.isGroupLeader ? element : undefined
                  })
                }
              })
              
              return Array.from(groupsToRender).map(groupId => {
                const bounds = groupBounds.get(groupId)
                if (!bounds) return null
                
                // Check if any group member is selected
                const hasSelectedMember = elements
                  .filter(el => {
                    const props = el.properties as ElementProperties
                    return props?.groupId === groupId
                  })
                  .some(el => selectedElementIds.includes(el.id))
                
                // Don't show group boundary if any member is selected (to avoid visual clutter)
                if (hasSelectedMember) return null
                
                const padding = 8 // Padding around grouped elements
                const x = bounds.minX - padding
                const y = bounds.minY - padding
                const width = bounds.maxX - bounds.minX + padding * 2
                const height = bounds.maxY - bounds.minY + padding * 2
                
                return (
                  <React.Fragment key={`group-${groupId}`}>
                    {/* Group boundary rectangle */}
                    <Rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill="rgba(16, 185, 129, 0.03)"
                      stroke="#6ee7b7"
                      strokeWidth={1.5 / stageScale}
                      dash={[6 / stageScale, 6 / stageScale]}
                      listening={false}
                      perfectDrawEnabled={false}
                      opacity={0.7}
                      cornerRadius={4 / stageScale}
                    />
                    
                    {/* Group count indicator */}
                    <Rect
                      x={x + width - 28 / stageScale}
                      y={y - 14 / stageScale}
                      width={24 / stageScale}
                      height={18 / stageScale}
                      fill="#10b981"
                      stroke="#6ee7b7"
                      strokeWidth={1 / stageScale}
                      cornerRadius={4 / stageScale}
                      listening={false}
                      perfectDrawEnabled={false}
                    />
                    
                    <Text
                      x={x + width - 28 / stageScale}
                      y={y - 14 / stageScale}
                      width={24 / stageScale}
                      height={18 / stageScale}
                      text={bounds.count.toString()}
                      fontSize={11 / stageScale}
                      fontFamily="Inter, system-ui, sans-serif"
                      fontWeight="600"
                      fill="white"
                      align="center"
                      verticalAlign="middle"
                      listening={false}
                      perfectDrawEnabled={false}
                    />
                  </React.Fragment>
                )
              })
            })()}
            
            {/* Selection borders and resize handles for selected elements */}
            {selectedElementIds.map(elementId => {
              const element = elements.find(el => el.id === elementId)
              if (!element) return null
              
              return (
                <React.Fragment key={`selection-${element.id}`}>
                  {/* Purple selection border */}
                  {element.type !== 'circle' && (
                    <Rect
                      x={element.x || 0}
                      y={element.y || 0}
                      width={element.width || 0}
                      height={element.height || 0}
                      rotation={element.rotation || 0}
                      fill="transparent"
                      stroke="#6366f1"
                      strokeWidth={1.5 / stageScale}
                      dash={[6 / stageScale, 3 / stageScale]}
                      listening={false}
                      perfectDrawEnabled={false}
                    />
                  )}
                  {element.type === 'circle' && (
                    <Circle
                      x={(element.x || 0) + (element.width || 0) / 2}
                      y={(element.y || 0) + (element.height || 0) / 2}
                      radius={(element.width || 0) / 2}
                      fill="transparent"
                      stroke="#6366f1"
                      strokeWidth={1.5 / stageScale}
                      dash={[6 / stageScale, 3 / stageScale]}
                      listening={false}
                      perfectDrawEnabled={false}
                    />
                  )}
                  {renderResizeHandles(element)}
                </React.Fragment>
              )
            })}
            
            {/* Selection rectangle */}
            {selectionRect.visible && (selectionRect.width > 1 || selectionRect.height > 1) && (
              <Rect
                x={selectionRect.x}
                y={selectionRect.y}
                width={selectionRect.width}
                height={selectionRect.height}
                fill="rgba(99, 102, 241, 0.05)"
                stroke="var(--color-primary-500)"
                strokeWidth={1.5 / stageScale}
                dash={[4 / stageScale, 4 / stageScale]}
                listening={false}
                perfectDrawEnabled={false}
              />
            )}
          </Layer>
        </Stage>
        </div>
      </div>

      {/* Context Menu */}
      {renderContextMenu()}
      
      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
        onTaskCreated={() => {
          // Optional: Show success message or refresh data
        }}
      />

      {/* Text Edit Modal */}
      <InputModal
        isOpen={!!editingElement}
        onClose={() => setEditingElement(null)}
        onSubmit={(newText) => {
          if (editingElement) {
            const element = elements.find(el => el.id === editingElement.id)
            if (element) {
              updateElementInDB(element.id, {
                properties: { ...(element.properties as Record<string, unknown>), text: newText }
              })
            }
          }
          setEditingElement(null)
        }}
        title="Edit Text"
        placeholder="Enter text..."
        defaultValue={editingElement?.text || ''}
        submitText="Update"
        type="textarea"
      />

      {/* Markdown Edit Modal */}
      <MarkdownEditModal
        isOpen={!!editingMarkdownElement}
        onClose={() => setEditingMarkdownElement(null)}
        onSubmit={(newText) => {
          if (editingMarkdownElement) {
            const element = elements.find(el => el.id === editingMarkdownElement.id)
            if (element) {
              updateElementInDB(element.id, {
                properties: { ...(element.properties as Record<string, unknown>), text: newText }
              })
            }
          }
          setEditingMarkdownElement(null)
        }}
        title="Edit Markdown Text"
        defaultValue={editingMarkdownElement?.text || ''}
        submitText="Update"
      />

      {/* Coming Soon Modal for Circle Resizing */}
      {showComingSoonModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-sm mx-4 shadow-lg">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Circle Resizing</h3>
              <p className="text-muted-foreground mb-6">
                Circle resizing is coming soon! We&apos;re working on making it perfect for you.
              </p>
              <button
                onClick={() => setShowComingSoonModal(false)}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Markdown Editor */}
      {inlineEditingElement && (() => {
        const element = elements.find(el => el.id === inlineEditingElement)
        if (!element) return null
        
        const props = element.properties as ElementProperties
        const stageRect = stageRef.current?.content?.getBoundingClientRect()
        
        if (!stageRect) return null
        
        // Calculate absolute position on screen
        const absoluteX = stageRect.left + (element.x || 0) * stageScale + stagePos.x
        const absoluteY = stageRect.top + (element.y || 0) * stageScale + stagePos.y
        const scaledWidth = (element.width || 200) * stageScale
        const scaledHeight = (element.height || 100) * stageScale
        
        return (
          <InlineMarkdownEditor
            x={absoluteX}
            y={absoluteY}
            width={scaledWidth}
            height={scaledHeight}
            fontSize={(props.fontSize as number || 16) * stageScale}
            fontFamily="Arial, sans-serif"
            fill={props.fill as string || 'var(--color-foreground)'}
            initialValue={props.text as string || ''}
            isEditing={true}
            onSave={(newText: string) => {
              updateElementProperties(element.id, { text: newText })
              setInlineEditingElement(null)
              setInsertFormattingFn(null)
            }}
            onCancel={() => {
              setInlineEditingElement(null)
              setInsertFormattingFn(null)
            }}
            onReady={(insertFn) => {
              setInsertFormattingFn(() => insertFn)
            }}
          />
        )
      })()}

    </div>
  )
}