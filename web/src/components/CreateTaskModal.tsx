'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Calendar, Flag, FileText, Eye, Edit3 } from 'lucide-react'
import Modal from './Modal'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/store'
import { Database } from '@/types/database.types'
import { ElementProperties } from '@/types/element.types'
import { addTaskToFocusMode } from '@/utils/focusMode'
import { useToast } from '@/hooks/useToast'

type Tables = Database['public']['Tables']
type TaskCategory = Tables['task_categories']['Row']

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onTaskCreated?: () => void
}

export default function CreateTaskModal({ isOpen, onClose, onTaskCreated }: CreateTaskModalProps) {
  const supabase = createClient()
  const { success } = useToast()
  const { 
    currentProject, 
    selectedElementIds, 
    clearSelection, 
    addTask,
    user,
    elements,
    updateElement 
  } = useAppStore()
  
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    category_id: '',
    due_date: ''
  })
  const [isDescriptionPreview, setIsDescriptionPreview] = useState(false)

  const renderMarkdown = (markdown: string): React.ReactElement => {
    if (!markdown.trim()) {
      return <span className="text-[var(--color-muted-foreground)]">Click to add description...</span>
    }

    const lines = markdown.split('\n')
    const elements: React.ReactElement[] = []

    lines.forEach((line, index) => {
      if (!line.trim()) {
        elements.push(<br key={index} />)
        return
      }

      let processedLine = line

      // Headers
      const headerMatch = processedLine.match(/^(#{1,6})\s+(.+)$/)
      if (headerMatch) {
        const level = headerMatch[1].length
        const text = headerMatch[2]
        const sizes = ['text-lg', 'text-base', 'text-sm', 'text-xs']
        const size = sizes[Math.min(level - 1, sizes.length - 1)]
        elements.push(
          <h1 key={index} className={`${size} font-bold mb-2`}>
            {text}
          </h1>
        )
        return
      }

      // Bold and italic
      processedLine = processedLine.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      processedLine = processedLine.replace(/\*(.*?)\*/g, '<em>$1</em>')
      
      // Inline code
      processedLine = processedLine.replace(/`([^`]+)`/g, '<code class="bg-[var(--color-accent)] px-1 py-0.5 rounded text-sm">$1</code>')
      
      // Links
      processedLine = processedLine.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[var(--color-primary)] underline" target="_blank" rel="noopener noreferrer">$1</a>')
      
      // Lists
      const listMatch = processedLine.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/)
      if (listMatch) {
        const indent = listMatch[1].length
        const bullet = listMatch[2]
        const content = listMatch[3]
        const indentStyle = { marginLeft: `${Math.min(indent * 8, 24)}px` }
        const bulletSymbol = bullet.match(/^\d+\./) ? '•' : '•'
        
        elements.push(
          <div key={index} style={indentStyle} className="flex items-start mb-1">
            <span className="mr-2 flex-shrink-0">{bulletSymbol}</span>
            <span dangerouslySetInnerHTML={{ __html: content }} />
          </div>
        )
        return
      }

      // Regular paragraph
      elements.push(
        <div key={index} dangerouslySetInnerHTML={{ __html: processedLine }} />
      )
    })

    return <div className="text-sm leading-relaxed">{elements}</div>
  }

  const loadCategories = useCallback(async () => {
    if (!currentProject) return

    try {
      const { data, error } = await supabase
        .from('task_categories')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('position', { ascending: true })

      if (error) throw error
      setCategories(data || [])
      
      // Auto-select first category if available
      if (data && data.length > 0) {
        setFormData(prev => ({ ...prev, category_id: prev.category_id || data[0].id }))
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }, [currentProject, supabase])

  const extractTextFromElements = useCallback(() => {
    if (selectedElementIds.length === 0) return { title: '', description: '' }

    // Find the first selected element that has text content
    for (const elementId of selectedElementIds) {
      const element = elements.find(el => el.id === elementId)
      if (element && element.properties) {
        const properties = element.properties as Record<string, unknown>
        const elementText = properties?.text as string | undefined
        if (elementText && elementText.trim()) {
          const text = elementText.trim()
          const lines = text.split('\n').filter(line => line.trim())
          
          if (lines.length > 0) {
            // Parse markdown from first line for title (strip markdown formatting)
            const firstLine = lines[0].trim()
            const title = firstLine
              .replace(/^#{1,6}\s+/gm, '') // Remove heading markers
              .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers
              .replace(/\*(.*?)\*/g, '$1') // Remove italic markers
              .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // Remove inline code
              .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove link markdown, keep text
              .trim()
            
            const description = text
            return { title, description }
          }
        }
      }
    }

    return { title: '', description: '' }
  }, [selectedElementIds, elements])

  // Automatically group selected elements
  const autoGroupSelectedElements = useCallback(async () => {
    if (selectedElementIds.length < 2) return

    const selectedElements = elements.filter(el => selectedElementIds.includes(el.id))
    if (selectedElements.length < 2) return

    // Check if elements are already grouped
    const existingGroups = new Set<string>()
    selectedElements.forEach(element => {
      const properties = element.properties as ElementProperties
      if (properties?.groupId) {
        existingGroups.add(properties.groupId)
      }
    })

    // If all elements are already in the same group, don't create a new group
    if (existingGroups.size === 1 && selectedElements.every(el => {
      const properties = el.properties as ElementProperties
      return properties?.groupId && existingGroups.has(properties.groupId)
    })) {
      return
    }

    // Create a new group for the elements
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
        const { error } = await supabase
          .from('elements')
          .update({ properties: updatedProperties })
          .eq('id', element.id)

        if (error) throw error

        // Update local state
        updateElement(element.id, { properties: updatedProperties })
      } catch (error) {
        console.error('Error grouping element:', error)
      }
    }
  }, [selectedElementIds, elements, supabase, updateElement])

  useEffect(() => {
    if (isOpen && currentProject) {
      loadCategories()
      
      // Extract text from selected elements and auto-populate form
      const { title, description } = extractTextFromElements()
      
      setFormData({
        title,
        description,
        priority: 'medium',
        category_id: '',
        due_date: ''
      })
    }
  }, [isOpen, currentProject, loadCategories, extractTextFromElements])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !currentProject || !formData.title.trim()) return

    setLoading(true)
    try {
      // Create the task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          project_id: currentProject.id,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          priority: formData.priority,
          category_id: formData.category_id || null,
          due_date: formData.due_date || null,
          created_by: (user as { id: string })?.id,
          status: 'pending'
        })
        .select(`
          *,
          category:task_categories(id, name, color),
          assignee:user_profiles!tasks_assignee_id_fkey(full_name),
          task_elements(element_id)
        `)
        .single()

      if (taskError) throw taskError

      // Link selected elements to the task
      if (selectedElementIds.length > 0) {
        const elementLinks = selectedElementIds.map(elementId => ({
          task_id: task.id,
          element_id: elementId
        }))

        const { error: linkError } = await supabase
          .from('task_elements')
          .insert(elementLinks)

        if (linkError) throw linkError

        // Automatically group the elements if there are multiple
        await autoGroupSelectedElements()
      }

      // Update local state
      addTask(task)
      
      // Check if this task should be added to Focus Mode
      if ((window as Window & { addToFocusModeAfterCreation?: boolean }).addToFocusModeAfterCreation) {
        addTaskToFocusMode(task.id)
        // Clear the flag
        delete (window as Window & { addToFocusModeAfterCreation?: boolean }).addToFocusModeAfterCreation
        // Show success message
        setTimeout(() => {
          success(`Task "${task.title}" created and added to Focus Mode!`)
        }, 100)
      }
      
      clearSelection()
      onTaskCreated?.()
      onClose()
    } catch (error) {
      console.error('Error creating task:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    if (!loading) {
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Task"
      size="md"
      closeOnOverlayClick={!loading}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-card-foreground)] mb-2">
            Task Title <span className="text-[var(--color-destructive)]">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Enter task title..."
            className="w-full px-3 py-2 bg-[var(--color-input)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent text-sm"
            disabled={loading}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-card-foreground)] mb-2">
            <FileText className="h-4 w-4 inline mr-1" />
            Description
            <button
              type="button"
              onClick={() => setIsDescriptionPreview(!isDescriptionPreview)}
              className="ml-2 text-xs px-2 py-1 bg-[var(--color-accent)] text-[var(--color-accent-foreground)] rounded hover:bg-[var(--color-accent-600)] transition-colors"
              disabled={loading}
            >
              {isDescriptionPreview ? (
                <><Edit3 className="h-3 w-3 inline mr-1" /> Edit</>
              ) : (
                <><Eye className="h-3 w-3 inline mr-1" /> Preview</>
              )}
            </button>
          </label>
          
          {isDescriptionPreview ? (
            <div 
              className="w-full min-h-[6rem] px-3 py-2 bg-[var(--color-input)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-sm cursor-pointer"
              onClick={() => setIsDescriptionPreview(false)}
            >
              {renderMarkdown(formData.description)}
            </div>
          ) : (
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the task... (supports markdown)"
              rows={3}
              className="w-full px-3 py-2 bg-[var(--color-input)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent text-sm resize-none"
              disabled={loading}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-card-foreground)] mb-2">
              <Flag className="h-4 w-4 inline mr-1" />
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
              className="w-full px-3 py-2 bg-[var(--color-input)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent text-sm"
              disabled={loading}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-card-foreground)] mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Due Date
            </label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              className="w-full px-3 py-2 bg-[var(--color-input)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent text-sm"
              disabled={loading}
            />
          </div>
        </div>

        {/* Category */}
        {categories.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-[var(--color-card-foreground)] mb-2">
              Category
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
              className="w-full px-3 py-2 bg-[var(--color-input)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent text-sm"
              disabled={loading}
            >
              <option value="">No Category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Selected Elements Info */}
        {selectedElementIds.length > 0 && (
          <div className="bg-[var(--color-accent)] p-3 rounded-[var(--radius-md)]">
            <p className="text-sm text-[var(--color-accent-foreground)]">
              This task will be linked to {selectedElementIds.length} whiteboard element{selectedElementIds.length !== 1 ? 's' : ''}.
              {selectedElementIds.length > 1 && (
                <span className="block mt-1 font-medium">
                  💡 Multiple elements will be automatically grouped together.
                </span>
              )}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-[var(--color-muted-foreground)] hover:text-[var(--color-card-foreground)] transition-colors duration-[var(--duration-fast)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !formData.title.trim()}
            className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-[var(--radius-md)] hover:bg-[var(--color-primary-600)] transition-colors duration-[var(--duration-fast)] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  )
}