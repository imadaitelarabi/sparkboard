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
  Trash2
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/store'
import { Database } from '@/types/database.types'
import CreateTaskModal from './CreateTaskModal'
import InputModal from './InputModal'

type Tables = Database['public']['Tables']
type Board = Tables['boards']['Row']
type Element = Tables['elements']['Row']

interface WhiteboardViewProps {
  board: Board
}

type ToolType = 'select' | 'rectangle' | 'circle' | 'text' | 'arrow' | 'sticky_note'

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

  useEffect(() => {
    loadElements()
  }, [board.id])

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

    const newElement = {
      board_id: board.id,
      type,
      x,
      y,
      width: type === 'text' ? 200 : 100,
      height: type === 'text' ? 50 : 100,
      rotation: 0,
      properties: {
        fill: type === 'sticky_note' ? '#fef3c7' : '#3b82f6',
        stroke: '#1f2937',
        strokeWidth: 2,
        text: type === 'text' || type === 'sticky_note' ? 'Double click to edit' : '',
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

  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = e.target.getStage()
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

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
    
    if (activeTool === 'select') {
      if (e.evt.shiftKey) {
        toggleElementSelection(elementId)
      } else {
        setSelectedElementIds([elementId])
      }
    }
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
      stroke: isSelected ? '#ef4444' : (props.stroke as string),
      strokeWidth: isSelected ? 2 : (props.strokeWidth as number) || 1
    }

    switch (element.type) {
      case 'rectangle':
      case 'sticky_note':
        return (
          <Rect
            key={element.id}
            {...baseProps}
            fill={props.fill as string}
            cornerRadius={element.type === 'sticky_note' ? 6 : 0}
          />
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
      case 'sticky_note':
        return (
          <Text
            key={element.id}
            {...baseProps}
            text={(props.text as string) || 'Text'}
            fontSize={(props.fontSize as number) || 14}
            fill={(props.textColor as string) || '#000000'}
            align="center"
            verticalAlign="middle"
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

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="bg-card border-b border-border p-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {tools.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={() => setActiveTool(type)}
              className={`p-2 rounded-md transition-colors ${
                activeTool === type
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
              title={label}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>

        {selectedElementIds.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreateTaskModalOpen(true)}
              className="px-3 py-2 bg-success-600 text-success-50 rounded-md hover:bg-success-700 transition-colors text-sm font-medium"
            >
              Create Task ({selectedElementIds.length})
            </button>
            <button
              onClick={() => {
                selectedElementIds.forEach(id => deleteElement(id))
                clearSelection()
              }}
              className="p-2 text-destructive hover:bg-destructive-50 rounded-md transition-colors"
              title="Delete Selected"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        <Stage
          ref={stageRef}
          width={window.innerWidth}
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
              let baseDotSpacing = 20
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