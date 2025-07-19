'use client'

import { useEffect, useState } from 'react'
import { Plus, MoreHorizontal, Calendar, User, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/store'
import { Database } from '@/types/database.types'

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
  const supabase = createClient()
  const { 
    tasks, 
    setTasks, 
    taskCategories, 
    setTaskCategories, 
    user 
  } = useAppStore()

  const [loading, setLoading] = useState(true)
  const [draggedTask, setDraggedTask] = useState<string | null>(null)

  useEffect(() => {
    loadTasksAndCategories()
  }, [project.id])

  async function loadTasksAndCategories() {
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
          assignee:user_profiles(full_name),
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
  }

  async function createTask(categoryId: string) {
    if (!user) return

    const title = prompt('Enter task title:')
    if (!title) return

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          project_id: project.id,
          category_id: categoryId,
          title,
          created_by: user.id,
          position: tasks.filter(t => t.category_id === categoryId).length
        })
        .select(`
          *,
          category:task_categories(id, name, color),
          assignee:user_profiles(full_name),
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

  async function createCategory() {
    const name = prompt('Enter category name:')
    if (!name) return

    try {
      const { data, error } = await supabase
        .from('task_categories')
        .insert({
          project_id: project.id,
          name,
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

  function getTasksByCategory(categoryId: string) {
    return tasks.filter(task => task.category_id === categoryId)
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading tasks...</div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-50 p-6 overflow-auto">
      <div className="flex gap-6 min-h-full">
        {taskCategories.map((category) => (
          <div
            key={category.id}
            className="flex-shrink-0 w-80 bg-white rounded-lg border border-gray-200"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, category.id)}
          >
            {/* Category Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <h3 className="font-semibold text-gray-900">{category.name}</h3>
                  <span className="text-sm text-gray-500">
                    {getTasksByCategory(category.id).length}
                  </span>
                </div>
                <button
                  onClick={() => createTask(category.id)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Add Task"
                >
                  <Plus className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Tasks */}
            <div className="p-4 space-y-3 min-h-32">
              {getTasksByCategory(category.id).map((task: TaskWithDetails) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => handleDragStart(task.id)}
                  className="bg-white border border-gray-200 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm leading-5">
                      {task.title}
                    </h4>
                    <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                      <MoreHorizontal className="h-3 w-3 text-gray-400" />
                    </button>
                  </div>

                  {task.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  {/* Task metadata */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      {task.assignee && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{task.assignee.full_name}</span>
                        </div>
                      )}
                      {task.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(task.due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Linked elements indicator */}
                    {task.task_elements && task.task_elements.length > 0 && (
                      <div className="flex items-center gap-1 text-blue-600">
                        <ExternalLink className="h-3 w-3" />
                        <span>{task.task_elements.length}</span>
                      </div>
                    )}
                  </div>

                  {/* Priority indicator */}
                  {task.priority && task.priority !== 'medium' && (
                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          task.priority === 'high'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  )}
                </div>
              ))}

              {getTasksByCategory(category.id).length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-sm">No tasks yet</div>
                  <button
                    onClick={() => createTask(category.id)}
                    className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                  >
                    Add the first task
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Add Category */}
        <div className="flex-shrink-0 w-80">
          <button
            onClick={createCategory}
            className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors flex items-center justify-center text-gray-600 hover:text-gray-700"
          >
            <div className="text-center">
              <Plus className="h-6 w-6 mx-auto mb-2" />
              <span className="text-sm font-medium">Add Category</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}