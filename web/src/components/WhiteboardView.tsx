'use client'

import React, { useEffect, useRef, useState } from 'react'

// Extend Window interface for zoom timeout
declare global {
  interface Window {
    zoomTimeout?: NodeJS.Timeout
  }
}
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
  text: 'gray-dark',
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
    setIsCreateTaskModalOpen,
    navigationContext,
    setNavigationContext
  } = useAppStore()

  const [activeTool, setActiveTool] = useState<ToolType>('select')
  const [stageScale, setStageScale] = useState(1)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [editingElement, setEditingElement] = useState<{ id: string; text: string } | null>(null)
  const [editingMarkdownElement, setEditingMarkdownElement] = useState<{ id: string; text: string } | null>(null)
  const [selectedColor, setSelectedColor] = useState<ElementColorKey>('primary')
  const [customColor, setCustomColor] = useState('#6366f1')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId: string } | null>(null)
  const [clipboard, setClipboard] = useState<Element[]>([])
  const [resizeState, setResizeState] = useState<{
    isResizing: boolean;
    elementId: string | null;
    handleType: string | null;
    startPointer: { x: number; y: number } | null;
    originalBounds: { x: number; y: number; width: number; height: number } | null;
  }>({ isResizing: false, elementId: null, handleType: null, startPointer: null, originalBounds: null })
  const [showComingSoonModal, setShowComingSoonModal] = useState(false)
  
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
  const [spacePressed, setSpacePressed] = useState(false)

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
        
        // Center view on selected elements
        setTimeout(() => {
          centerViewOnElements(validElementIds)
        }, 100)
      }
      
      // Clear navigation context after handling
      setNavigationContext(null)
    }
  }, [navigationContext, elements, setSelectedElementIds, setNavigationContext])
  
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

  // Keyboard shortcuts for zoom and space bar panning
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Space bar for panning mode
      if (event.code === 'Space' && !spacePressed) {
        event.preventDefault()
        setSpacePressed(true)
        document.body.style.cursor = 'grab'
        return
      }
      
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
    }
    
    function handleKeyUp(event: KeyboardEvent) {
      // Space bar release
      if (event.code === 'Space') {
        setSpacePressed(false)
        document.body.style.cursor = ''
        // Stop panning if currently panning with space
        if (isPanning) {
          setIsPanning(false)
          setPanStart(null)
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [stageScale, spacePressed, isPanning])

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

  function centerViewOnElements(elementIds: string[]) {
    if (!stageRef.current || elementIds.length === 0) return

    const stage = stageRef.current
    const stageWidth = stage.width()
    const stageHeight = stage.height()

    // Calculate the bounding box of all selected elements
    const selectedElements = elements.filter(el => elementIds.includes(el.id))
    if (selectedElements.length === 0) return

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    selectedElements.forEach(element => {
      const props = element.properties as ElementProperties || {}
      const x = props.x || 0
      const y = props.y || 0
      const width = props.width || 100
      const height = props.height || 100

      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x + width)
      maxY = Math.max(maxY, y + height)
    })

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    // Calculate scale to fit elements with some padding
    const elementsWidth = maxX - minX
    const elementsHeight = maxY - minY
    const padding = 100 // pixels of padding around elements

    const scaleX = (stageWidth - padding * 2) / elementsWidth
    const scaleY = (stageHeight - padding * 2) / elementsHeight
    const newScale = Math.min(scaleX, scaleY, 1.5) // Don't zoom in too much

    // Calculate new position to center the elements
    const newX = stageWidth / 2 - centerX * newScale
    const newY = stageHeight / 2 - centerY * newScale

    // Update stage position and scale
    setStageScale(newScale)
    setStagePos({ x: newX, y: newY })

    // Add a subtle animation effect
    stage.to({
      duration: 0.3,
      x: newX,
      y: newY,
      scaleX: newScale,
      scaleY: newScale,
      easing: Konva.Easings.EaseOut
    })
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

  function handleStageMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = e.target.getStage()
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

    // Close context menu
    setContextMenu(null)

    // Check for panning gestures (middle mouse button, space+click, or two-finger equivalent)
    const isMiddleClick = e.evt.button === 1
    const isSpaceClick = e.evt.button === 0 && spacePressed // Space + left click
    const isRightClickPan = e.evt.button === 2 && e.evt.shiftKey // Shift+Right click
    const isShiftMetaClick = e.evt.button === 0 && e.evt.shiftKey && e.evt.metaKey // Shift+Cmd+Click for Mac
    
    if (isMiddleClick || isSpaceClick || isRightClickPan || isShiftMetaClick) {
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
      
      
      // Update element locally for smooth interaction
      updateElement(resizeState.elementId, newAttrs)
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
      document.body.style.cursor = spacePressed ? 'grab' : ''
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

    const handleSize = 8 / stageScale // Scale handle size with zoom
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
        stroke="#2563eb"
        strokeWidth={1.5 / stageScale}
        draggable={false}
        onMouseDown={(e) => {
          const stage = stageRef.current
          if (!stage) return
          
          const pointer = stage.getPointerPosition()
          if (!pointer) return
          
          // Prevent event bubbling
          e.cancelBubble = true
          e.evt.preventDefault()
          e.evt.stopPropagation()
          
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

  function renderElement(element: WhiteboardElement) {
    const isSelected = selectedElementIds.includes(element.id)
    const props = element.properties as ElementProperties || {}

    // Get effective style values
    const fillOpacity = getEffectiveFillOpacity(props)
    const strokeOpacity = getEffectiveStrokeOpacity(props)
    const strokeWidth = isSelected ? 3 : (props.strokeWidth || 2)
    const strokeColor = isSelected ? 'var(--color-destructive-500)' : (props.stroke as string)
    const dashArray = getStrokeDashArray(props.strokeStyle, strokeWidth)
    
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
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      dash: dashArray,
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
              setEditingMarkdownElement({ id: element.id, text: (props.text as string) || '' })
            }}
            draggable={activeTool === 'select'}
            onDragMove={(e: Konva.KonvaEventObject<DragEvent>) => handleElementDrag(element.id, e.target.attrs)}
            onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => handleElementDragEnd(element.id, e.target.attrs)}
            onContextMenu={(e: Konva.KonvaEventObject<MouseEvent>) => handleElementRightClick(element.id, e)}
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
                sticky_note: 'S'
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
              
              // Get text elements specifically
              const textElements = selectedElementIds
                .map(id => elements.find(el => el.id === id))
                .filter((el): el is NonNullable<typeof el> => 
                  el !== undefined && el.type === 'text'
                )
              
              if (supportedElements.length === 0) return null

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
                  {/* Text Formatting Controls - only show for text elements */}
                  {textElements.length > 0 && (
                    <>
                      {/* Font Size Controls */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">Size</span>
                        <div className="flex gap-1">
                          {[12, 16, 20, 24, 32].map((fontSize) => (
                            <button
                              key={fontSize}
                              onClick={() => {
                                textElements.forEach(element => {
                                  updateElementProperties(element.id, { fontSize })
                                })
                              }}
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                (getCommonValue('fontSize') || 16) === fontSize
                                  ? 'bg-purple-500 text-white'
                                  : 'bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-800/50'
                              }`}
                              title={`${fontSize}px`}
                            >
                              {fontSize}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Font Weight Controls */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">Weight</span>
                        <div className="flex gap-1">
                          {[
                            { value: 'normal', label: 'Normal' },
                            { value: 'bold', label: 'Bold' }
                          ].map(({ value, label }) => (
                            <button
                              key={value}
                              onClick={() => {
                                textElements.forEach(element => {
                                  updateElementProperties(element.id, { fontWeight: value })
                                })
                              }}
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                (getCommonValue('fontWeight') || 'normal') === value
                                  ? 'bg-purple-500 text-white'
                                  : 'bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-800/50'
                              }`}
                              title={label}
                            >
                              {value === 'bold' ? <strong>B</strong> : 'N'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* Opacity and Stroke Style - only show for shapes */}
                  {supportedElements.filter(el => el.type !== 'text').length > 0 && (
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
              
              {spacePressed && (
                <div 
                  className="text-xs px-2 py-1 rounded border font-medium bg-green-500 text-white border-green-400"
                  title="Pan mode active - click and drag to move around"
                >
                  🖐️ Pan Mode
                </div>
              )}
              
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
            
            {/* Resize handles for selected elements */}
            {selectedElementIds.map(elementId => {
              const element = elements.find(el => el.id === elementId)
              return element ? renderResizeHandles(element) : null
            })}
            
            {/* Selection rectangle */}
            {selectionRect.visible && (selectionRect.width > 1 || selectionRect.height > 1) && (
              <Rect
                x={selectionRect.x}
                y={selectionRect.y}
                width={selectionRect.width}
                height={selectionRect.height}
                fill="rgba(59, 130, 246, 0.08)"
                stroke="#3b82f6"
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

    </div>
  )
}