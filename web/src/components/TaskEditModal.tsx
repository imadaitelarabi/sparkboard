'use client'

import { useState, useEffect } from 'react'
import { Calendar, User, Flag } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { Database } from '@/types/database.types'
import Modal from './Modal'

type Tables = Database['public']['Tables']
type Task = Tables['tasks']['Row']

interface TaskEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (task: Partial<Task>) => void
  task: Task | null
}

export default function TaskEditModal({ isOpen, onClose, onSave, task }: TaskEditModalProps) {
  const supabase = createClient()
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assigneeId, setAssigneeId] = useState<string | null>(null)
  const [priority, setPriority] = useState<string>('medium')
  const [loading, setLoading] = useState(false)
  const [userProfiles, setUserProfiles] = useState<Array<{ id: string; full_name: string }>>([])

  useEffect(() => {
    if (task) {
      setTitle(task.title || '')
      setDescription(task.description || '')
      setDueDate(task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '')
      setAssigneeId(task.assignee_id)
      setPriority(task.priority || 'medium')
    }
  }, [task])

  useEffect(() => {
    async function loadUserProfiles() {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('user_id, full_name')
          .order('full_name')
        
        if (error) throw error
        
        setUserProfiles(data?.map(profile => ({ 
          id: profile.user_id, 
          full_name: profile.full_name || 'Unknown User' 
        })) || [])
      } catch (error) {
        console.error('Error loading user profiles:', error)
        setUserProfiles([])
      }
    }

    if (isOpen) {
      loadUserProfiles()
    }
  }, [isOpen, supabase])

  if (!isOpen || !task) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
        assignee_id: assigneeId,
        priority
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Task"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-[var(--color-card-foreground)] mb-2">
              Title *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--color-input)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent text-sm placeholder:text-[var(--color-muted-foreground)]"
              placeholder="Enter task title"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-[var(--color-card-foreground)] mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-[var(--color-input)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent text-sm placeholder:text-[var(--color-muted-foreground)] resize-none"
              placeholder="Add a description (optional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-[var(--color-card-foreground)] mb-2">
                Due Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-[var(--color-muted-foreground)]" />
                <input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-[var(--color-input)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-[var(--color-card-foreground)] mb-2">
                Priority
              </label>
              <div className="relative">
                <Flag className="absolute left-2 top-2.5 h-4 w-4 text-[var(--color-muted-foreground)]" />
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-[var(--color-input)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent text-sm appearance-none cursor-pointer"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="assignee" className="block text-sm font-medium text-[var(--color-card-foreground)] mb-2">
              Assignee
            </label>
            <div className="relative">
              <User className="absolute left-2 top-2.5 h-4 w-4 text-[var(--color-muted-foreground)]" />
              <select
                id="assignee"
                value={assigneeId || ''}
                onChange={(e) => setAssigneeId(e.target.value || null)}
                className="w-full pl-8 pr-3 py-2 bg-[var(--color-input)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent text-sm appearance-none cursor-pointer"
              >
                <option value="">Unassigned</option>
                {userProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[var(--color-muted-foreground)] hover:text-[var(--color-card-foreground)] transition-colors duration-[var(--duration-fast)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-[var(--radius-md)] hover:bg-[var(--color-primary-600)] transition-colors duration-[var(--duration-fast)] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
    </Modal>
  )
}