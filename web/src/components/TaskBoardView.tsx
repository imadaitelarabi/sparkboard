'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, MoreHorizontal, Calendar, User, ExternalLink, Edit, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/store'
import { useRouter } from 'next/navigation'
import { Database } from '@/types/database.types'
import InputModal from './InputModal'
import ConfirmationModal from './ConfirmationModal'
import TaskEditModal from './TaskEditModal'

type Tables = Database['public']['Tables']
type Board = Tables['boards']['Row']
type Project = Tables['projects']['Row']
type Task = Tables['tasks']['Row']
type TaskCategory = Tables['task_categories']['Row']

interface TaskBoardViewProps {
  board: Board
  project: Project
}

interface TaskWithDetails extends Task {
  category?: TaskCategory
  assignee?: { full_name: string }
  task_elements?: { element_id: string }[]
}

export default function TaskBoardView({ board, project }: TaskBoardViewProps) {
  const router = useRouter()
  const supabase = createClient()
  const { 
    tasks, 
    setTasks, 
    taskCategories, 
    setTaskCategories, 
    user,
    setNavigationContext
  } = useAppStore()

  const [loading, setLoading] = useState(true)
  const [draggedTask, setDraggedTask] = useState<string | null>(null)
  const [showCreateTaskModal, setShowCreateTaskModal] = useState<string | null>(null)
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<TaskWithDetails | null>(null)
  const [taskMenuOpen, setTaskMenuOpen] = useState<string | null>(null)

  const loadTasksAndCategories = useCallback(async () => {
    try {
      // Load task categories for this project
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('task_categories')
        .select('*')
        .eq('project_id', project.id)
        .order('position', { ascending: true })

      if (categoriesError) throw categoriesError
      setTaskCategories(categoriesData || [])

      // Load tasks for this project
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          category:task_categories(id, name, color),
          assignee:user_profiles!tasks_assignee_id_fkey(full_name),
          task_elements(element_id)
        `)
        .eq('project_id', project.id)
        .order('position', { ascending: true })

      if (tasksError) throw tasksError
      setTasks(tasksData || [])

    } catch (error) {
      console.error('Error loading tasks and categories:', error)
    } finally {
      setLoading(false)
    }
  }, [project.id, supabase, setTaskCategories, setTasks])

  useEffect(() => {
    loadTasksAndCategories()
  }, [project.id, loadTasksAndCategories])

  // Close task menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (taskMenuOpen && !(e.target as HTMLElement).closest('[data-action-menu]')) {
        setTaskMenuOpen(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [taskMenuOpen])

  async function createTask(categoryId: string, title: string) {
    if (!user || !title.trim()) return

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          project_id: project.id,
          category_id: categoryId,
          title: title.trim(),
          created_by: (user as { id: string }).id,
          position: tasks.filter(t => t.category_id === categoryId).length
        })
        .select(`
          *,
          category:task_categories(id, name, color),
          assignee:user_profiles!tasks_assignee_id_fkey(full_name),
          task_elements(element_id)
        `)
        .single()

      if (error) throw error
      setTasks([...tasks, data])
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  async function updateTaskCategory(taskId: string, newCategoryId: string) {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ category_id: newCategoryId })
        .eq('id', taskId)

      if (error) throw error

      // Update local state
      setTasks(tasks.map(task => 
        task.id === taskId 
          ? { ...task, category_id: newCategoryId }
          : task
      ))
    } catch (error) {
      console.error('Error updating task category:', error)
    }
  }

  async function createCategory(name: string) {
    if (!name.trim()) return

    try {
      const { data, error } = await supabase
        .from('task_categories')
        .insert({
          project_id: project.id,
          name: name.trim(),
          position: taskCategories.length
        })
        .select()
        .single()

      if (error) throw error
      setTaskCategories([...taskCategories, data])
    } catch (error) {
      console.error('Error creating category:', error)
    }
  }

  function handleDragStart(taskId: string) {
    setDraggedTask(taskId)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function handleDrop(e: React.DragEvent, categoryId: string) {
    e.preventDefault()
    if (draggedTask) {
      updateTaskCategory(draggedTask, categoryId)
      setDraggedTask(null)
    }
  }

  async function updateTask(taskId: string, updates: Partial<Task>) {
    try {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)

      if (error) throw error

      // Update local state
      setTasks(tasks.map(task => 
        task.id === taskId 
          ? { ...task, ...updates }
          : task
      ))
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  async function deleteTask(taskId: string) {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error

      // Update local state
      setTasks(tasks.filter(task => task.id !== taskId))
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  function getTasksByCategory(categoryId: string) {
    return tasks.filter(task => task.category_id === categoryId)
  }

  async function handleTaskClick(task: TaskWithDetails) {
    // Only navigate if task has linked elements
    if (task.task_elements && task.task_elements.length > 0) {
      const elementIds = task.task_elements.map(te => te.element_id)
      
      try {
        // Query to find which board contains these elements
        const { data: elementsData, error: elementsError } = await supabase
          .from('elements')
          .select('board_id')
          .in('id', elementIds)
          .limit(1)

        if (elementsError) throw elementsError

        if (elementsData && elementsData.length > 0) {
          const boardId = elementsData[0].board_id
          
          // Find the whiteboard that contains these elements
          const { data: boardData, error: boardError } = await supabase
            .from('boards')
            .select('*')
            .eq('id', boardId)
            .eq('type', 'whiteboard')
            .single()

          if (boardError) throw boardError

          if (boardData) {
            // Set navigation context for whiteboard to pick up
            setNavigationContext({
              elementIds,
              fromTask: true
            })
            
            // Navigate to the specific whiteboard with element selection
            const searchParams = new URLSearchParams()
            searchParams.set('tab', 'whiteboard')
            searchParams.set('elements', elementIds.join(','))
            searchParams.set('board', boardId)
            
            router.push(`/project/${project.id}?${searchParams.toString()}`)
          }
        }
      } catch (error) {
        console.error('Error finding board for elements:', error)
      }
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-base text-muted-foreground">Loading tasks...</div>
      </div>
    )
  }

  return (
    <div className="h-full bg-background p-5 overflow-auto">
      <div className="flex gap-5 min-h-full">
        {taskCategories.map((category) => (
          <div
            key={category.id}
            className="flex-shrink-0 w-72 bg-card rounded-lg border border-border"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, category.id)}
          >
            {/* Category Header */}
            <div className="p-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: category.color || '#6366f1' }}
                  />
                  <h3 className="font-medium text-foreground text-sm">{category.name}</h3>
                  <span className="text-xs text-muted-foreground">
                    {getTasksByCategory(category.id).length}
                  </span>
                </div>
                <button
                  onClick={() => setShowCreateTaskModal(category.id)}
                  className="p-1 hover:bg-accent rounded transition-colors"
                  title="Add Task"
                >
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Tasks */}
            <div className="p-3 space-y-2 min-h-28">
              {getTasksByCategory(category.id).map((task: TaskWithDetails) => {
                const hasLinkedElements = task.task_elements && task.task_elements.length > 0
                
                return (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => handleDragStart(task.id)}
                  onClick={(e) => {
                    // Only navigate if clicking the task card itself, not the action button
                    if (!(e.target as HTMLElement).closest('button, [data-action-menu]')) {
                      handleTaskClick(task)
                    }
                  }}
                  className={`bg-background border border-border rounded-md p-2 transition-all duration-normal ${
                    hasLinkedElements 
                      ? 'cursor-pointer hover:shadow-md hover:border-primary/50' 
                      : 'cursor-grab active:cursor-grabbing hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-medium text-foreground text-xs leading-4">
                      {task.title}
                    </h4>
                    <div className="relative" data-action-menu>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setTaskMenuOpen(taskMenuOpen === task.id ? null : task.id)
                        }}
                        className="p-0.5 hover:bg-accent rounded transition-colors"
                      >
                        <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                      </button>
                      
                      {taskMenuOpen === task.id && (
                        <div className="absolute right-0 mt-1 w-32 bg-card border border-border rounded-md shadow-lg z-10 animate-in fade-in slide-in-from-top-1 duration-fast">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingTask(task)
                              setTaskMenuOpen(null)
                            }}
                            className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent flex items-center gap-2 transition-colors"
                          >
                            <Edit className="h-3 w-3" />
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowDeleteConfirm(task.id)
                              setTaskMenuOpen(null)
                            }}
                            className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent text-destructive flex items-center gap-2 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {task.description && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  {/* Task metadata */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      {task.assignee && (
                        <div className="flex items-center gap-1">
                          <User className="h-2 w-2" />
                          <span>{task.assignee.full_name}</span>
                        </div>
                      )}
                      {task.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-2 w-2" />
                          <span>{new Date(task.due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Linked elements indicator */}
                    {task.task_elements && task.task_elements.length > 0 && (
                      <div className="flex items-center gap-1 text-primary" title="Click to view linked elements on whiteboard">
                        <ExternalLink className="h-2 w-2" />
                        <span>{task.task_elements.length}</span>
                      </div>
                    )}
                  </div>

                  {/* Priority indicator */}
                  {task.priority && task.priority !== 'medium' && (
                    <div className="mt-1">
                      <span
                        className={`inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium ${
                          task.priority === 'high'
                            ? 'bg-destructive-100 text-destructive-800'
                            : 'bg-warning-100 text-warning-800'
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  )}
                </div>
                )
              })}

              {getTasksByCategory(category.id).length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <div className="text-xs">No tasks yet</div>
                  <button
                    onClick={() => setShowCreateTaskModal(category.id)}
                    className="text-xs text-primary hover:text-primary/80 mt-1 transition-colors"
                  >
                    Add the first task
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Add Category */}
        <div className="flex-shrink-0 w-72">
          <button
            onClick={() => setShowCreateCategoryModal(true)}
            className="w-full h-28 border-2 border-dashed border-border rounded-lg hover:border-muted-foreground transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <div className="text-center">
              <Plus className="h-5 w-5 mx-auto mb-1" />
              <span className="text-sm font-medium">Add Category</span>
            </div>
          </button>
        </div>
      </div>

      {/* Create Task Modal */}
      <InputModal
        isOpen={!!showCreateTaskModal}
        onClose={() => setShowCreateTaskModal(null)}
        onSubmit={(title) => {
          if (showCreateTaskModal) {
            createTask(showCreateTaskModal, title)
          }
          setShowCreateTaskModal(null)
        }}
        title="Create New Task"
        placeholder="Enter task title..."
        submitText="Create Task"
      />

      {/* Create Category Modal */}
      <InputModal
        isOpen={showCreateCategoryModal}
        onClose={() => setShowCreateCategoryModal(false)}
        onSubmit={(name) => {
          createCategory(name)
          setShowCreateCategoryModal(false)
        }}
        title="Create New Category"
        placeholder="Enter category name..."
        submitText="Create Category"
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => {
          if (showDeleteConfirm) {
            deleteTask(showDeleteConfirm)
          }
          setShowDeleteConfirm(null)
        }}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
        destructive={true}
      />

      {/* Edit Task Modal */}
      <TaskEditModal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        onSave={(updates) => {
          if (editingTask) {
            updateTask(editingTask.id, updates)
          }
          setEditingTask(null)
        }}
        task={editingTask}
      />
    </div>
  )
}