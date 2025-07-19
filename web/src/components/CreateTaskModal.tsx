'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Calendar, Flag, FileText } from 'lucide-react'
import Modal from './Modal'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/store'
import { Database } from '@/types/database.types'

type Tables = Database['public']['Tables']
type TaskCategory = Tables['task_categories']['Row']

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onTaskCreated?: () => void
}

export default function CreateTaskModal({ isOpen, onClose, onTaskCreated }: CreateTaskModalProps) {
  const supabase = createClient()
  const { 
    currentProject, 
    selectedElementIds, 
    clearSelection, 
    addTask,
    user 
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

  useEffect(() => {
    if (isOpen && currentProject) {
      loadCategories()
      // Reset form when opening
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        category_id: '',
        due_date: ''
      })
    }
  }, [isOpen, currentProject, loadCategories])

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
      }

      // Update local state
      addTask(task)
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
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe the task..."
            rows={3}
            className="w-full px-3 py-2 bg-[var(--color-input)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent text-sm resize-none"
            disabled={loading}
          />
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