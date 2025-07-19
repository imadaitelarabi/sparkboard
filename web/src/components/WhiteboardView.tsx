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
  Copy,
  Edit3
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/store'
import { Database } from '@/types/database.types'

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
    setIsCreateTaskModalOpen
  } = useAppStore()

  const [activeTool, setActiveTool] = useState<ToolType>('select')
  const [isDrawing, setIsDrawing] = useState(false)
  const [stageScale, setStageScale] = useState(1)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })

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

  async function createElement(type: string, x: number, y: number, properties: any = {}) {
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
      created_by: user.id
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
    } else if (activeTool !== 'select') {
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

  function handleElementDrag(elementId: string, newAttrs: any) {
    updateElement(elementId, { x: newAttrs.x, y: newAttrs.y })
  }

  function handleElementDragEnd(elementId: string, newAttrs: any) {
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

    const newScale = e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy
    
    setStageScale(newScale)
    setStagePos({
      x: -(mousePointTo.x - stage.getPointerPosition()!.x / newScale) * newScale,
      y: -(mousePointTo.y - stage.getPointerPosition()!.y / newScale) * newScale
    })
  }

  function renderElement(element: WhiteboardElement) {
    const isSelected = selectedElementIds.includes(element.id)
    const props = element.properties as any

    const baseProps = {
      key: element.id,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      rotation: element.rotation,
      draggable: activeTool === 'select',
      onClick: (e: any) => handleElementClick(element.id, e),
      onDragMove: (e: any) => handleElementDrag(element.id, e.target.attrs),
      onDragEnd: (e: any) => handleElementDragEnd(element.id, e.target.attrs),
      stroke: isSelected ? '#ef4444' : props.stroke,
      strokeWidth: isSelected ? 3 : props.strokeWidth || 2
    }

    switch (element.type) {
      case 'rectangle':
      case 'sticky_note':
        return (
          <Rect
            {...baseProps}
            fill={props.fill}
            cornerRadius={element.type === 'sticky_note' ? 8 : 0}
          />
        )
      case 'circle':
        return (
          <Circle
            {...baseProps}
            radius={element.width / 2}
            fill={props.fill}
          />
        )
      case 'text':
      case 'sticky_note':
        return (
          <Text
            {...baseProps}
            text={props.text || 'Text'}
            fontSize={props.fontSize || 16}
            fill={props.textColor || '#000000'}
            align="center"
            verticalAlign="middle"
            onDblClick={() => {
              const newText = prompt('Edit text:', props.text)
              if (newText !== null) {
                updateElementInDB(element.id, {
                  properties: { ...props, text: newText }
                })
              }
            }}
          />
        )
      case 'arrow':
        return (
          <Arrow
            {...baseProps}
            points={[0, 0, element.width, element.height]}
            fill={props.fill}
            pointerLength={10}
            pointerWidth={10}
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
    <div className="h-full flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {tools.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={() => setActiveTool(type)}
              className={`p-2 rounded-lg transition-colors ${
                activeTool === type
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={label}
            >
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </div>

        {selectedElementIds.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreateTaskModalOpen(true)}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              Create Task ({selectedElementIds.length})
            </button>
            <button
              onClick={() => {
                selectedElementIds.forEach(id => deleteElement(id))
                clearSelection()
              }}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Selected"
            >
              <Trash2 className="h-5 w-5" />
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
            {/* Grid */}
            {Array.from({ length: 50 }, (_, i) => (
              <React.Fragment key={i}>
                <Rect
                  x={i * 50}
                  y={0}
                  width={1}
                  height={2500}
                  fill="#f0f0f0"
                />
                <Rect
                  x={0}
                  y={i * 50}
                  width={2500}
                  height={1}
                  fill="#f0f0f0"
                />
              </React.Fragment>
            ))}
            
            {/* Elements */}
            {elements.map(renderElement)}
          </Layer>
        </Stage>
      </div>
    </div>
  )
}