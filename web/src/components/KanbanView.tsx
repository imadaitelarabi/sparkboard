'use client'

import { useState } from 'react'
import { Plus, MoreHorizontal, Calendar, User, ExternalLink, Edit, Trash2 } from 'lucide-react'
import { Database } from '@/types/database.types'

type Tables = Database['public']['Tables']
type Task = Tables['tasks']['Row']
type TaskCategory = Tables['task_categories']['Row']

export interface TaskWithDetails extends Task {
  category?: TaskCategory
  assignee?: { full_name: string }
  task_elements?: { element_id: string }[]
  project?: { name: string; id: string }
}

export interface KanbanColumn {
  id: string
  name: string
  color?: string
  tasks: TaskWithDetails[]
}

interface KanbanViewProps {
  columns: KanbanColumn[]
  onTaskClick?: (task: TaskWithDetails) => void
  onTaskDrop?: (taskId: string, columnId: string) => void
  onTaskEdit?: (task: TaskWithDetails) => void
  onTaskDelete?: (taskId: string) => void
  onCreateTask?: (columnId: string) => void
  showCreateTask?: boolean
  showActions?: boolean
  compact?: boolean
}

export default function KanbanView({
  columns,
  onTaskClick,
  onTaskDrop,
  onTaskEdit,
  onTaskDelete,
  onCreateTask,
  showCreateTask = false,
  showActions = false,
  compact = false
}: KanbanViewProps) {
  const [draggedTask, setDraggedTask] = useState<string | null>(null)
  const [taskMenuOpen, setTaskMenuOpen] = useState<string | null>(null)

  function handleDragStart(taskId: string) {
    setDraggedTask(taskId)
    // Set data for external drop targets
    const dragEvent = new CustomEvent('taskDragStart', { detail: { taskId } })
    window.dispatchEvent(dragEvent)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function handleDrop(e: React.DragEvent, columnId: string) {
    e.preventDefault()
    if (draggedTask && onTaskDrop) {
      onTaskDrop(draggedTask, columnId)
      setDraggedTask(null)
    }
  }

  function handleTaskClick(task: TaskWithDetails, e: React.MouseEvent) {
    // Only trigger click if not clicking on action buttons
    if (!(e.target as HTMLElement).closest('button, [data-action-menu]')) {
      onTaskClick?.(task)
    }
  }

  const columnWidth = compact ? 'w-60' : 'w-72'
  const cardPadding = compact ? 'p-2' : 'p-3'
  const headerPadding = compact ? 'p-2' : 'p-3'

  return (
    <div className="h-full bg-background overflow-x-auto overflow-y-hidden">
      <div className="flex gap-5 h-full p-5 min-w-fit">
        {columns.map((column) => (
          <div
            key={column.id}
            className={`flex-shrink-0 ${columnWidth} bg-card rounded-lg border border-border flex flex-col h-full`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div className={`${headerPadding} border-b border-border`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: column.color || 'var(--color-primary-500)' }}
                  />
                  <h3 className="font-medium text-foreground text-sm">{column.name}</h3>
                  <span className="text-xs text-muted-foreground">
                    {column.tasks.length}
                  </span>
                </div>
                {showCreateTask && onCreateTask && (
                  <button
                    onClick={() => onCreateTask(column.id)}
                    className="p-1 hover:bg-accent rounded transition-colors"
                    title="Add Task"
                  >
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>

            {/* Tasks */}
            <div className={`${cardPadding} space-y-2 flex-1 overflow-y-auto`}>
              {column.tasks.map((task) => {
                const hasLinkedElements = task.task_elements && task.task_elements.length > 0
                
                return (
                  <div
                    key={task.id}
                    draggable={!!onTaskDrop}
                    onDragStart={(e) => {
                      handleDragStart(task.id)
                      // Set drag data for better browser support
                      e.dataTransfer.setData('text/plain', task.id)
                      e.dataTransfer.effectAllowed = 'copy'
                    }}
                    onDragEnd={() => {
                      setDraggedTask(null)
                      // Dispatch drag end event for external listeners
                      window.dispatchEvent(new Event('taskDragEnd'))
                    }}
                    onClick={(e) => handleTaskClick(task, e)}
                    className={`bg-background border border-border rounded-md ${compact ? 'p-1.5' : 'p-2'} transition-all duration-normal ${
                      hasLinkedElements && onTaskClick
                        ? 'cursor-pointer hover:shadow-md hover:border-primary/50' 
                        : onTaskDrop
                        ? 'cursor-grab active:cursor-grabbing hover:shadow-sm'
                        : 'hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h4 className={`font-medium text-foreground ${compact ? 'text-xs' : 'text-xs'} leading-4`}>
                        {task.title}
                      </h4>
                      
                      {showActions && (onTaskEdit || onTaskDelete) && (
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
                              {onTaskEdit && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onTaskEdit(task)
                                    setTaskMenuOpen(null)
                                  }}
                                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent flex items-center gap-2 transition-colors"
                                >
                                  <Edit className="h-3 w-3" />
                                  Edit
                                </button>
                              )}
                              {onTaskDelete && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onTaskDelete(task.id)
                                    setTaskMenuOpen(null)
                                  }}
                                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent text-destructive flex items-center gap-2 transition-colors"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {task.description && (
                      <p className={`text-xs text-muted-foreground ${compact ? 'mb-1' : 'mb-2'} line-clamp-2`}>
                        {task.description}
                      </p>
                    )}

                    {/* Task metadata */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {task.assignee && (
                          <div className="flex items-center gap-1">
                            <User className="h-2 w-2" />
                            <span className="truncate max-w-20">{task.assignee.full_name}</span>
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

                    {/* Project name (for global view) */}
                    {task.project && (
                      <div className="mt-1 text-xs text-muted-foreground/70 truncate">
                        {task.project.name}
                      </div>
                    )}

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

              {column.tasks.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <div className="text-xs">No tasks</div>
                  {showCreateTask && onCreateTask && (
                    <button
                      onClick={() => onCreateTask(column.id)}
                      className="text-xs text-primary hover:text-primary/80 mt-1 transition-colors"
                    >
                      Add a task
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}