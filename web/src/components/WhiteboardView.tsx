'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Rect, Circle, Text, Arrow } from 'react-konva'
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
  Layers
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/store'
import { Database } from '@/types/database.types'
import CreateTaskModal from './CreateTaskModal'
import InputModal from './InputModal'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

type Tables = Database['public']['Tables']
type Board = Tables['boards']['Row']
type Element = Tables['elements']['Row']

interface WhiteboardViewProps {
  board: Board
}

type ToolType = 'select' | 'rectangle' | 'circle' | 'text' | 'arrow' | 'sticky_note'

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
  text: 'accent',
  arrow: 'gray',
  sticky_note: 'warning'
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
    removeElement,
    selectedElementIds,
    setSelectedElementIds,
    toggleElementSelection,
    clearSelection,
    user,
    isCreateTaskModalOpen,
    setIsCreateTaskModalOpen
  } = useAppStore()

  const [activeTool, setActiveTool] = useState<ToolType>('select')
  const [stageScale, setStageScale] = useState(1)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [editingElement, setEditingElement] = useState<{ id: string; text: string } | null>(null)
  const [selectedColor, setSelectedColor] = useState<ElementColorKey>('primary')
  const [customColor, setCustomColor] = useState('#6366f1')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId: string } | null>(null)
  const [clipboard, setClipboard] = useState<Element[]>([])

  // Auto-select appropriate color when switching tools
  const handleToolChange = (toolType: ToolType) => {
    setActiveTool(toolType)
    if (toolType !== 'select' && DEFAULT_ELEMENT_COLORS[toolType]) {
      setSelectedColor(DEFAULT_ELEMENT_COLORS[toolType])
    }
  }

  // Copy selected elements to clipboard
  const copyElements = () => {
    const selectedElements = elements.filter(el => selectedElementIds.includes(el.id))
    setClipboard(selectedElements)
  }

  // Paste elements from clipboard
  const pasteElements = async () => {
    if (clipboard.length === 0) return

    const offset = 20 // Offset to avoid pasting exactly on top
    const newElements = []

    for (const element of clipboard) {
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
      callback: () => {
        pasteElements()
      },
      description: 'Paste elements',
      preventDefault: true
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
    }
  ])

  useEffect(() => {
    loadElements()
  }, [board.id])
  
  // Close context menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (contextMenu) {
        const target = event.target
        if (target instanceof Element && !target.closest('.context-menu')) {
          setContextMenu(null)
        }
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [contextMenu])

  async function loadElements() {
    try {
      const { data, error } = await supabase
        .from('elements')
        .select('*')
        .eq('board_id', board.id)
        .order('layer_index', { ascending: true })

      if (error) throw error
      setElements(data || [])
    } catch (error) {
      console.error('Error loading elements:', error)
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
        fill: fillColor || (type === 'sticky_note' ? '#fef3c7' : '#6366f1'),
        stroke: strokeColor || '#334155',
        strokeWidth: 2,
        text: type === 'text' || type === 'sticky_note' ? 'Double click to edit' : '',
        colorKey, // Store the theme color key for future reference
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
  
  
  // Render context menu
  function renderContextMenu() {
    if (!contextMenu) return null
    
    const selectedCount = selectedElementIds.length
    
    return (
      <div
        className="context-menu fixed z-50 bg-card border border-border rounded-lg shadow-xl py-2 animate-in fade-in zoom-in-95 duration-150"
        style={{
          left: `${contextMenu.x}px`,
          top: `${contextMenu.y}px`,
          minWidth: '160px'
        }}
      >
        <button
          onClick={() => {
            setIsCreateTaskModalOpen(true)
            setContextMenu(null)
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Task{selectedCount > 1 ? ` (${selectedCount})` : ''}
        </button>
        
        <button
          onClick={() => {
            duplicateElements()
            setContextMenu(null)
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
        >
          <Copy className="h-4 w-4" />
          Duplicate{selectedCount > 1 ? ` (${selectedCount})` : ''}
        </button>
        
        <button
          onClick={() => {
            // Move to front
            selectedElementIds.forEach(id => {
              updateElementInDB(id, { layer_index: elements.length })
            })
            setContextMenu(null)
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
        >
          <Layers className="h-4 w-4" />
          Bring to Front
        </button>
        
        <div className="border-t border-border my-1" />
        
        <button
          onClick={() => {
            selectedElementIds.forEach(id => deleteElement(id))
            setContextMenu(null)
            clearSelection()
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-destructive hover:bg-destructive-50 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          Delete{selectedCount > 1 ? ` (${selectedCount})` : ''}
        </button>
      </div>
    )
  }

  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = e.target.getStage()
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

    // Close context menu on stage click
    setContextMenu(null)

    if (activeTool === 'select') {
      // If clicking on empty space, clear selection
      if (e.target === stage) {
        clearSelection()
      }
    } else {
      // Create new element
      createElement(activeTool, pos.x, pos.y)
      setActiveTool('select')
    }
  }

  function handleElementClick(elementId: string, e: Konva.KonvaEventObject<MouseEvent>) {
    e.cancelBubble = true
    
    // Close context menu on regular click
    setContextMenu(null)
    
    if (activeTool === 'select') {
      if (e.evt.shiftKey) {
        toggleElementSelection(elementId)
      } else {
        setSelectedElementIds([elementId])
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
    
    // Get the mouse position relative to the stage
    const stage = e.target.getStage()
    if (!stage) return
    
    const pointerPosition = stage.getPointerPosition()
    if (!pointerPosition) return
    
    // Convert to screen coordinates
    const screenX = pointerPosition.x * stageScale + stagePos.x
    const screenY = pointerPosition.y * stageScale + stagePos.y
    
    setContextMenu({
      x: screenX,
      y: screenY,
      elementId
    })
  }

  function handleElementDrag(elementId: string, newAttrs: { x: number; y: number }) {
    updateElement(elementId, { x: newAttrs.x, y: newAttrs.y })
  }

  function handleElementDragEnd(elementId: string, newAttrs: { x: number; y: number }) {
    updateElementInDB(elementId, { x: newAttrs.x, y: newAttrs.y })
  }

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault()
    
    const stage = stageRef.current
    if (!stage) return

    const scaleBy = 1.02
    const oldScale = stage.scaleX()
    const mousePointTo = {
      x: stage.getPointerPosition()!.x / oldScale - stage.x() / oldScale,
      y: stage.getPointerPosition()!.y / oldScale - stage.y() / oldScale
    }

    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy
    
    setStageScale(newScale)
    setStagePos({
      x: -(mousePointTo.x - stage.getPointerPosition()!.x / newScale) * newScale,
      y: -(mousePointTo.y - stage.getPointerPosition()!.y / newScale) * newScale
    })
  }

  function handleElementResize(elementId: string, newSize: { width: number; height: number }) {
    updateElementInDB(elementId, newSize)
  }

  function renderResizeHandles(element: WhiteboardElement) {
    const handleSize = 8 / stageScale // Scale handle size with zoom
    const x = element.x || 0
    const y = element.y || 0
    const width = element.width || 0
    const height = element.height || 0
    
    const handles = [
      // Corner handles
      { x: x - handleSize/2, y: y - handleSize/2, cursor: 'nw-resize', type: 'nw' },
      { x: x + width - handleSize/2, y: y - handleSize/2, cursor: 'ne-resize', type: 'ne' },
      { x: x - handleSize/2, y: y + height - handleSize/2, cursor: 'sw-resize', type: 'sw' },
      { x: x + width - handleSize/2, y: y + height - handleSize/2, cursor: 'se-resize', type: 'se' },
      // Side handles
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
        stroke="#2563eb"
        strokeWidth={1.5 / stageScale}
        draggable={true}
        onDragMove={() => {
          const stage = stageRef.current
          if (!stage) return
          
          const pointer = stage.getPointerPosition()
          if (!pointer) return
          
          const newWidth = element.width || 0
          const newHeight = element.height || 0
          
          // Calculate new dimensions based on handle type
          let updatedSize = { width: newWidth, height: newHeight }
          
          switch (handle.type) {
            case 'se': // Bottom-right corner
              updatedSize = {
                width: Math.max(20, pointer.x - x),
                height: Math.max(20, pointer.y - y)
              }
              break
            case 'nw': // Top-left corner
              updatedSize = {
                width: Math.max(20, (x + newWidth) - pointer.x),
                height: Math.max(20, (y + newHeight) - pointer.y)
              }
              // Also need to update position
              updateElementInDB(element.id, { 
                x: pointer.x, 
                y: pointer.y,
                ...updatedSize 
              })
              return
            case 'ne': // Top-right corner
              updatedSize = {
                width: Math.max(20, pointer.x - x),
                height: Math.max(20, (y + newHeight) - pointer.y)
              }
              updateElementInDB(element.id, { 
                y: pointer.y,
                ...updatedSize 
              })
              return
            case 'sw': // Bottom-left corner
              updatedSize = {
                width: Math.max(20, (x + newWidth) - pointer.x),
                height: Math.max(20, pointer.y - y)
              }
              updateElementInDB(element.id, { 
                x: pointer.x,
                ...updatedSize 
              })
              return
            case 'e': // Right side
              updatedSize = { width: Math.max(20, pointer.x - x), height: newHeight }
              break
            case 'w': // Left side
              updatedSize = { 
                width: Math.max(20, (x + newWidth) - pointer.x), 
                height: newHeight 
              }
              updateElementInDB(element.id, { 
                x: pointer.x,
                ...updatedSize 
              })
              return
            case 's': // Bottom side
              updatedSize = { width: newWidth, height: Math.max(20, pointer.y - y) }
              break
            case 'n': // Top side
              updatedSize = { 
                width: newWidth, 
                height: Math.max(20, (y + newHeight) - pointer.y) 
              }
              updateElementInDB(element.id, { 
                y: pointer.y,
                ...updatedSize 
              })
              return
          }
          
          handleElementResize(element.id, updatedSize)
        }}
      />
    ))
  }

  function renderElement(element: WhiteboardElement) {
    const isSelected = selectedElementIds.includes(element.id)
    const props = element.properties as Record<string, unknown>

    const baseProps = {
      x: element.x || 0,
      y: element.y || 0,
      width: element.width || 0,
      height: element.height || 0,
      rotation: element.rotation || 0,
      draggable: activeTool === 'select',
      onClick: (e: Konva.KonvaEventObject<MouseEvent>) => handleElementClick(element.id, e),
      onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => handleElementDrag(element.id, e.target.attrs),
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => handleElementDragEnd(element.id, e.target.attrs),
      onContextMenu: (e: Konva.KonvaEventObject<MouseEvent>) => handleElementRightClick(element.id, e),
      stroke: isSelected ? 'var(--color-destructive-500)' : (props.stroke as string),
      strokeWidth: isSelected ? 3 : (props.strokeWidth as number) || 2
    }

    switch (element.type) {
      case 'rectangle':
        return (
          <Rect
            key={element.id}
            {...baseProps}
            fill={props.fill as string}
            cornerRadius={3}
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
              fill={(props.textColor as string) || 'var(--color-gray-800)'}
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
          />
        )
      case 'text':
        return (
          <Text
            key={element.id}
            {...baseProps}
            text={(props.text as string) || 'Text'}
            fontSize={(props.fontSize as number) || 16}
            fill={(props.textColor as string) || (props.fill as string) || 'var(--color-foreground)'}
            align="center"
            verticalAlign="middle"
            fontFamily="var(--font-sans)"
            onDblClick={() => {
              setEditingElement({ id: element.id, text: (props.text as string) || '' })
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
    { type: 'sticky_note', icon: StickyNote, label: 'Sticky Note' }
  ] as const

  // Render left panel
  function renderLeftPanel() {
    return (
      <div className="w-64 bg-card border-r border-border flex flex-col">
        {/* Tools Section */}
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-medium text-foreground mb-3">Tools</h3>
          <div className="grid grid-cols-3 gap-2">
            {tools.map(({ type, icon: Icon, label }) => {
              const shortcutMap: Record<string, string> = {
                select: 'V',
                rectangle: 'R',
                circle: 'C',
                text: 'T',
                arrow: 'A',
                sticky_note: 'S'
              }
              
              return (
                <button
                  key={type}
                  onClick={() => handleToolChange(type)}
                  className={`p-3 rounded-lg transition-all duration-200 flex flex-col items-center gap-1 ${
                    activeTool === type
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                  title={`${label} (${shortcutMap[type]})`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{shortcutMap[type]}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Colors Section */}
        <div className="p-4 border-b border-border">
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
                  className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                    selectedColor === colorKey ? 'ring-2 ring-primary scale-105' : 'hover:ring-2 hover:ring-gray-300'
                  }`}
                  title={config.name}
                >
                  <div 
                    className="w-8 h-8 rounded-full mx-auto transition-all duration-200"
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
                  className={`p-1 rounded transition-all duration-200 hover:scale-110 ${
                    selectedColor === colorKey ? 'ring-2 ring-primary scale-110' : ''
                  }`}
                  title={config.name}
                >
                  <div 
                    className="w-6 h-6 rounded border transition-all duration-200"
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
          <div className="border-t border-border pt-3">
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
                className="w-8 h-8 rounded border border-border cursor-pointer flex-shrink-0"
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
                className="flex-1 px-2 py-1 text-xs border border-border rounded bg-input text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
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
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium text-foreground mb-3">
              Selection ({selectedElementIds.length})
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => setIsCreateTaskModalOpen(true)}
                className="w-full flex items-center gap-3 px-3 py-2 bg-success-600 text-success-50 rounded-md hover:bg-success-700 transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Create Task
              </button>
              <button
                onClick={() => {
                  duplicateElements()
                }}
                className="w-full flex items-center gap-3 px-3 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/80 transition-colors text-sm"
              >
                <Copy className="h-4 w-4" />
                Duplicate
              </button>
              <button
                onClick={() => {
                  selectedElementIds.forEach(id => deleteElement(id))
                  clearSelection()
                }}
                className="w-full flex items-center gap-3 px-3 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/80 transition-colors text-sm"
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
    <div className="h-full flex bg-background">
      {/* Left Panel */}
      {renderLeftPanel()}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-card border-b border-border p-3 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {board.name} - Whiteboard
          </div>
          <div className="text-xs text-muted-foreground">
            Zoom: {Math.round(stageScale * 100)}%
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
          draggable={activeTool === 'select'}
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
            
            {/* Resize handles for selected elements */}
            {selectedElementIds.map(elementId => {
              const element = elements.find(el => el.id === elementId)
              return element ? renderResizeHandles(element) : null
            })}
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
    </div>
  )
}