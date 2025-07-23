'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Search, Calendar, User, FolderOpen, LayoutGrid, Columns3, ExternalLink, Target, Settings, Clock, RotateCcw } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/store'
import { saveDashboardFilters, loadDashboardFilters, defaultDashboardFilters } from '@/utils/dashboardFilters'
import { getFocusMode, toggleFocusMode, addMultipleTasksToFocusMode, addTaskToFocusMode, removeTaskFromFocusMode, manualResetFocusMode, getTimeUntilReset, formatTimeUntilReset, type FocusMode } from '@/utils/focusMode'
import { updateTaskWithSync } from '@/utils/taskSync'
import { useToast } from '@/hooks/useToast'
import AuthForm from './AuthForm'
import InputModal from './InputModal'
import KanbanView, { type KanbanColumn, type TaskWithDetails } from './KanbanView'
import NoLinkedElementsModal from './NoLinkedElementsModal'
import FocusModeSettings from './FocusModeSettings'


// Using TaskWithDetails and KanbanColumn from KanbanView component

export default function Dashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { warning, error } = useToast()
  const { projects, setProjects, user, setUser } = useAppStore()
  const [tasks, setTasks] = useState<TaskWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false)
  const [showNoLinkedElementsModal, setShowNoLinkedElementsModal] = useState(false)

  // Load initial filter values from localStorage or use defaults
  const initialFilters = typeof window !== 'undefined' ? loadDashboardFilters() : null
  const [searchTerm, setSearchTerm] = useState(initialFilters?.searchTerm ?? defaultDashboardFilters.searchTerm)
  const [filterProject, setFilterProject] = useState(initialFilters?.filterProject ?? defaultDashboardFilters.filterProject)
  const [filterStatus, setFilterStatus] = useState(initialFilters?.filterStatus ?? defaultDashboardFilters.filterStatus)
  const [viewMode, setViewMode] = useState<'kanban' | 'grid'>(initialFilters?.viewMode ?? defaultDashboardFilters.viewMode)
  const [groupBy, setGroupBy] = useState<'project' | 'priority' | 'status'>(initialFilters?.groupBy ?? defaultDashboardFilters.groupBy)

  // Focus Mode state
  const [focusMode, setFocusMode] = useState<FocusMode | null>(
    typeof window !== 'undefined' ? getFocusMode() : null
  )
  const isFocusModeActive = focusMode?.isActive ?? false
  const [isAddingTasksToFocus, setIsAddingTasksToFocus] = useState(false)
  const [pendingFocusTasks, setPendingFocusTasks] = useState<string[]>([])
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [isDragOverFocusCard, setIsDragOverFocusCard] = useState(false)
  const [focusSearchTerm, setFocusSearchTerm] = useState('')
  const [showFocusSettings, setShowFocusSettings] = useState(false)
  const [timeUntilReset, setTimeUntilReset] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)

      if (!currentUser) {
        // Redirect to login or show auth component
        return
      }

      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (projectsError) throw projectsError
      setProjects(projectsData || [])

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, setUser, setProjects])

  // Separate function to load tasks with server-side filtering
  const loadTasks = useCallback(async () => {
    try {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          project:projects(id, name),
          category:task_categories(*),
          assignee:user_profiles!tasks_assignee_id_fkey(full_name),
          task_elements(element_id)
        `)

      // Server-side search filtering
      if (searchTerm.trim()) {
        query = query.ilike('title', `%${searchTerm.trim()}%`)
      }

      // Server-side project filtering
      if (filterProject) {
        query = query.eq('project_id', filterProject)
      }

      // Server-side status filtering
      if (filterStatus) {
        query = query.eq('status', filterStatus)
      }

      query = query.order('created_at', { ascending: false })

      const { data: tasksData, error: tasksError } = await query

      if (tasksError) throw tasksError
      setTasks((tasksData || []) as unknown as TaskWithDetails[])

    } catch (error) {
      console.error('Error loading tasks:', error)
    }
  }, [supabase, searchTerm, filterProject, filterStatus, groupBy])

  // Separate function to load Focus Mode tasks with server-side filtering
  const loadFocusModeFilteredTasks = useCallback(async () => {
    if (!focusMode?.isActive || !focusMode?.tasks.length) return

    try {
      // Get Focus Mode task IDs
      const focusTaskIds = focusMode.tasks.map(ft => ft.id)
      
      let query = supabase
        .from('tasks')
        .select(`
          *,
          project:projects(id, name),
          category:task_categories(*),
          assignee:user_profiles!tasks_assignee_id_fkey(full_name),
          task_elements(element_id)
        `)
        .in('id', focusTaskIds) // Only get tasks that are in Focus Mode

      // Server-side search filtering for Focus Mode
      if (focusSearchTerm.trim()) {
        query = query.ilike('title', `%${focusSearchTerm.trim()}%`)
      }

      query = query.order('created_at', { ascending: false })

      const { data: tasksData, error: tasksError } = await query

      if (tasksError) throw tasksError
      setTasks((tasksData || []) as unknown as TaskWithDetails[])

    } catch (error) {
      console.error('Error loading Focus Mode tasks:', error)
    }
  }, [supabase, focusMode, focusSearchTerm])

  useEffect(() => {
    loadData()
    if (!isFocusModeActive || isAddingTasksToFocus) {
      loadTasks()
    } else {
      loadFocusModeFilteredTasks()
    }

    // Check for immediate redirect if user is already authenticated
    const checkAuthAndRedirect = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      const redirectUrl = searchParams.get('redirect')
      
      if (currentUser && redirectUrl) {
        try {
          const decodedUrl = decodeURIComponent(redirectUrl)
          router.push(decodedUrl)
          return
        } catch (error) {
          console.error('Error redirecting authenticated user:', error)
        }
      }
    }
    
    checkAuthAndRedirect()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        loadData()
        if (!isFocusModeActive || isAddingTasksToFocus) {
          loadTasks()
        } else {
          loadFocusModeFilteredTasks()
        }
        
        // Handle redirect after successful authentication
        const redirectUrl = searchParams.get('redirect')
        if (redirectUrl) {
          try {
            // Decode and redirect back to the original URL
            const decodedUrl = decodeURIComponent(redirectUrl)
            router.push(decodedUrl)
            return
          } catch (error) {
            console.error('Error redirecting after auth:', error)
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setProjects([])
        setTasks([])
      }
    })

    return () => subscription.unsubscribe()
  }, [loadData, loadTasks, loadFocusModeFilteredTasks, isFocusModeActive, isAddingTasksToFocus, supabase.auth, setUser, setProjects, setTasks, searchParams, router])

  // Load tasks when filters change (for normal mode or add tasks mode)
  useEffect(() => {
    if (user && (!isFocusModeActive || isAddingTasksToFocus)) { // Load tasks if not in Focus Mode OR if adding tasks to focus
      loadTasks()
    }
  }, [searchTerm, filterProject, filterStatus, loadTasks, user, isFocusModeActive, isAddingTasksToFocus])

  // Load Focus Mode tasks when Focus Mode search changes
  useEffect(() => {
    if (user && isFocusModeActive) { // Only load Focus Mode tasks if user is authenticated and in Focus Mode
      loadFocusModeFilteredTasks()
    }
  }, [focusSearchTerm, loadFocusModeFilteredTasks, user, isFocusModeActive])

  // Save filters to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      saveDashboardFilters({
        searchTerm,
        filterProject,
        filterStatus,
        viewMode,
        groupBy
      })
    }
  }, [searchTerm, filterProject, filterStatus, viewMode, groupBy])

  // Listen for drag events from KanbanView
  useEffect(() => {
    const handleTaskDragStart = (e: CustomEvent) => {
      setDraggedTaskId(e.detail.taskId)
    }

    const handleTaskDragEnd = () => {
      setDraggedTaskId(null)
      setIsDragOverFocusCard(false)
    }

    window.addEventListener('taskDragStart', handleTaskDragStart as EventListener)
    window.addEventListener('taskDragEnd', handleTaskDragEnd)

    return () => {
      window.removeEventListener('taskDragStart', handleTaskDragStart as EventListener)
      window.removeEventListener('taskDragEnd', handleTaskDragEnd)
    }
  }, [])

  async function createProject(projectName: string) {
    if (!user || !projectName.trim()) return

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: projectName.trim(),
          owner_id: (user as { id: string }).id
        })
        .select()
        .single()

      if (error) throw error
      
      setProjects([data, ...projects])
    } catch (error) {
      console.error('Error creating project:', error)
    }
  }

  function handleToggleFocusMode() {
    const updatedFocusMode = toggleFocusMode()
    setFocusMode(updatedFocusMode)
    // Reset adding state when toggling focus mode
    setIsAddingTasksToFocus(false)
  }

  function handleManualReset() {
    const updatedFocusMode = manualResetFocusMode()
    setFocusMode(updatedFocusMode)
    // Reload tasks since focus mode was reset
    if (isFocusModeActive) {
      loadFocusModeFilteredTasks()
    }
  }

  function handleSettingsUpdate(updatedFocusMode: FocusMode) {
    setFocusMode(updatedFocusMode)
  }

  // Update countdown timer every minute
  useEffect(() => {
    if (!focusMode || !focusMode.settings.autoReset) {
      setTimeUntilReset(null)
      return
    }

    const updateTimer = () => {
      const timeMs = getTimeUntilReset(focusMode)
      if (timeMs && timeMs > 0) {
        setTimeUntilReset(formatTimeUntilReset(timeMs))
      } else {
        setTimeUntilReset(null)
      }
    }

    updateTimer() // Initial update
    const interval = setInterval(updateTimer, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [focusMode])

  function handleAddTasksToFocus() {
    setIsAddingTasksToFocus(true)
    // Load all tasks when entering add tasks mode
    loadTasks()
  }

  function handleCancelAddingTasks() {
    setIsAddingTasksToFocus(false)
    setPendingFocusTasks([])
  }

  function handleTaskDragToFocus(taskId: string) {
    setPendingFocusTasks(prev => {
      if (prev.includes(taskId)) {
        return prev // Already added
      }
      return [...prev, taskId]
    })
  }

  function handleRemoveFromPending(taskId: string) {
    setPendingFocusTasks(prev => prev.filter(id => id !== taskId))
  }

  function handleConfirmAddTasks() {
    if (pendingFocusTasks.length > 0) {
      // Add tasks to focus mode using utility function
      const updatedFocusMode = addMultipleTasksToFocusMode(pendingFocusTasks)
      setFocusMode(updatedFocusMode)
    }
    
    // Reset states
    setPendingFocusTasks([])
    setIsAddingTasksToFocus(false)
  }

  // Handle task updates in Focus Mode kanban (status, priority, or project changes)
  async function handleFocusModeTaskDrop(taskId: string, columnId: string) {
    try {
      // Determine what to update based on groupBy mode
      const updateOptions: Parameters<typeof updateTaskWithSync>[0] = {
        taskId,
        supabase
      }

      switch (groupBy) {
        case 'status':
          // Map column IDs to status values
          const statusMap: Record<string, string> = {
            'pending': 'pending',
            'in_progress': 'in_progress', 
            'completed': 'completed'
          }
          const newStatus = statusMap[columnId]
          if (newStatus) {
            updateOptions.status = newStatus
          }
          break
          
        case 'priority':
          // Map column IDs to priority values
          const priorityMap: Record<string, string> = {
            'high': 'high',
            'medium': 'medium',
            'low': 'low'
          }
          const newPriority = priorityMap[columnId]
          if (newPriority) {
            updateOptions.priority = newPriority
          }
          break
          
        case 'project':
          // Map column IDs to project IDs (columnId is already project_id)
          if (columnId !== 'unassigned') {
            updateOptions.projectId = columnId
          } else {
            updateOptions.projectId = null
          }
          break
      }

      // Use unified update function that syncs status and category
      const result = await updateTaskWithSync(updateOptions)

      // Update local state with the fields that were actually updated
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, ...result.updatedFields } : task
        )
      )

      // Reload tasks to ensure UI reflects all changes including category sync
      await loadTasks()

    } catch (err) {
      console.error('Error updating task:', err)
      error('Failed to update task')
    }
  }

  // Handle task removal from Focus Mode
  function handleRemoveFromFocusMode(taskId: string) {
    const updatedFocusMode = removeTaskFromFocusMode(taskId)
    setFocusMode(updatedFocusMode)
  }

  // Handle creating new tasks directly in Focus Mode
  async function handleCreateTaskInFocusMode(columnId: string) {
    // Determine task properties based on groupBy mode and columnId
    const taskProperties: Record<string, string | null> = {}
    
    switch (groupBy) {
      case 'status':
        const statusMap: Record<string, string> = {
          'pending': 'pending',
          'in_progress': 'in_progress',
          'completed': 'completed'
        }
        taskProperties.status = statusMap[columnId] || 'pending'
        break
        
      case 'priority':
        const priorityMap: Record<string, string> = {
          'high': 'high',
          'medium': 'medium',
          'low': 'low'
        }
        taskProperties.priority = priorityMap[columnId] || 'medium'
        taskProperties.status = 'pending' // Default status
        break
        
      case 'project':
        if (columnId !== 'unassigned') {
          taskProperties.project_id = columnId
        }
        taskProperties.status = 'pending' // Default status
        break
        
      default:
        taskProperties.status = 'pending'
    }
    
    // For now, we'll create a simple task - this could be enhanced with a modal later
    const taskTitle = prompt('Enter task title:')
    if (!taskTitle?.trim()) return

    // Determine project - use from taskProperties if set, otherwise use default
    let projectId = taskProperties.project_id
    if (!projectId) {
      const defaultProject = projects[0]
      if (!defaultProject) {
        warning('Please create a project first')
        return
      }
      projectId = defaultProject.id
    }

    try {
      // Create task in database
      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert({
          title: taskTitle.trim(),
          status: taskProperties.status || 'pending',
          priority: taskProperties.priority || null,
          project_id: projectId,
          created_at: new Date().toISOString()
        })
        .select(`
          *,
          project:projects(id, name),
          category:task_categories(*),
          assignee:user_profiles!tasks_assignee_id_fkey(full_name),
          task_elements(element_id)
        `)
        .single()

      if (error) throw error

      // Add to local tasks state
      setTasks(prevTasks => [...prevTasks, newTask as TaskWithDetails])

      // Add to Focus Mode
      const updatedFocusMode = addTaskToFocusMode(newTask.id)
      setFocusMode(updatedFocusMode)

    } catch (err) {
      console.error('Error creating task:', err)
      error('Failed to create task. Please try again.')
    }
  }

  // Get tasks that are in focus mode
  const focusModeTasks = focusMode?.tasks 
    ? tasks.filter(task => focusMode.tasks.some(ft => ft.id === task.id))
    : []

  // Sort tasks based on selected groupBy option
  function sortFocusTasks(tasks: TaskWithDetails[]): TaskWithDetails[] {
    return [...tasks].sort((a, b) => {
      switch (groupBy) {
        case 'priority':
          const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 }
          const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3
          const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3
          if (aPriority !== bPriority) return aPriority - bPriority
          break
        case 'project':
          const aProject = a.project?.name || 'Unassigned'
          const bProject = b.project?.name || 'Unassigned'
          if (aProject !== bProject) return aProject.localeCompare(bProject)
          break
        case 'status':
          // For status, we don't sort since they're already grouped by status
          break
      }
      // Secondary sort by title
      return a.title.localeCompare(b.title)
    })
  }

  // Focus Mode kanban columns - dynamic based on groupBy selection
  function getFocusModeColumns(): KanbanColumn[] {
    switch (groupBy) {
      case 'status':
        return [
          {
            id: 'pending',
            name: 'To Do',
            color: 'var(--color-secondary-500)',
            tasks: sortFocusTasks(focusModeTasks.filter(task => task.status === 'pending'))
          },
          {
            id: 'in_progress',
            name: 'In Progress',
            color: 'var(--color-primary-500)',
            tasks: sortFocusTasks(focusModeTasks.filter(task => task.status === 'in_progress'))
          },
          {
            id: 'completed',
            name: 'Done',
            color: 'var(--color-accent-500)',
            tasks: sortFocusTasks(focusModeTasks.filter(task => task.status === 'completed'))
          }
        ]
      
      case 'priority':
        return [
          {
            id: 'high',
            name: 'High Priority',
            color: 'var(--color-destructive-500)',
            tasks: sortFocusTasks(focusModeTasks.filter(task => task.priority === 'high'))
          },
          {
            id: 'medium',
            name: 'Medium Priority',
            color: 'var(--color-primary-500)',
            tasks: sortFocusTasks(focusModeTasks.filter(task => task.priority === 'medium' || !task.priority))
          },
          {
            id: 'low',
            name: 'Low Priority',
            color: 'var(--color-accent-500)',
            tasks: sortFocusTasks(focusModeTasks.filter(task => task.priority === 'low'))
          }
        ]
      
      case 'project':
        // Group by project - dynamic columns based on projects in focus mode
        const projectMap = new Map<string, KanbanColumn>()
        
        focusModeTasks.forEach(task => {
          const projectId = task.project_id || 'unassigned'
          const projectName = task.project?.name || 'Unassigned'
          
          if (!projectMap.has(projectId)) {
            projectMap.set(projectId, {
              id: projectId,
              name: projectName,
              color: 'var(--color-primary-500)',
              tasks: []
            })
          }
          
          projectMap.get(projectId)!.tasks.push(task)
        })
        
        // Sort tasks within each project column
        const columns = Array.from(projectMap.values())
        columns.forEach(column => {
          column.tasks = sortFocusTasks(column.tasks)
        })
        
        return columns

      default:
        // Default to status grouping
        return [
          {
            id: 'pending',
            name: 'To Do',
            color: 'var(--color-secondary-500)',
            tasks: sortFocusTasks(focusModeTasks.filter(task => task.status === 'pending'))
          },
          {
            id: 'in_progress',
            name: 'In Progress',
            color: 'var(--color-primary-500)',
            tasks: sortFocusTasks(focusModeTasks.filter(task => task.status === 'in_progress'))
          },
          {
            id: 'completed',
            name: 'Done',
            color: 'var(--color-accent-500)',
            tasks: sortFocusTasks(focusModeTasks.filter(task => task.status === 'completed'))
          }
        ]
    }
  }

  // Get kanban columns for Add Tasks view - always grouped by project
  function getAddTasksKanbanColumns(): KanbanColumn[] {
    const projectMap = new Map()
    
    // Get IDs of tasks already in Focus Mode
    const existingFocusTaskIds = new Set(focusMode?.tasks.map(ft => ft.id) || [])
    
    // Filter out tasks that are already in Focus Mode
    // Only show tasks with 'pending' (todo) or 'in_progress' status
    const availableTasksForFocus = filteredTasks.filter(task => 
      !existingFocusTaskIds.has(task.id) && 
      (task.status === 'pending' || task.status === 'in_progress')
    )
    
    // Add tasks to their project groups
    availableTasksForFocus.forEach(task => {
      const projectId = task.project_id || 'unassigned'
      const projectName = task.project?.name || 'Unassigned'
      
      if (!projectMap.has(projectId)) {
        projectMap.set(projectId, {
          id: projectId,
          name: projectName,
          color: 'var(--color-primary-500)',
          tasks: []
        })
      }
      projectMap.get(projectId).tasks.push(task)
    })
    
    return Array.from(projectMap.values())
  }
  
  // Check if all tasks are already in Focus Mode
  function areAllTasksInFocusMode(): boolean {
    // Only consider tasks with 'pending' or 'in_progress' status
    const eligibleTasks = filteredTasks.filter(task => 
      task.status === 'pending' || task.status === 'in_progress'
    )
    if (eligibleTasks.length === 0) return false
    const existingFocusTaskIds = new Set(focusMode?.tasks.map(ft => ft.id) || [])
    return eligibleTasks.every(task => existingFocusTaskIds.has(task.id))
  }
  
  // Get count of available tasks for Focus Mode
  function getAvailableTasksCount(): number {
    const existingFocusTaskIds = new Set(focusMode?.tasks.map(ft => ft.id) || [])
    return filteredTasks.filter(task => 
      !existingFocusTaskIds.has(task.id) && 
      (task.status === 'pending' || task.status === 'in_progress')
    ).length
  }

  // Tasks are now filtered server-side, so we use them directly
  const filteredTasks = tasks

  // Group tasks for kanban view
  function getKanbanColumns() {
    switch (groupBy) {
      case 'status':
        return [
          {
            id: 'pending',
            name: 'To Do',
            color: '#6b7280',
            tasks: filteredTasks.filter(task => task.status === 'pending')
          },
          {
            id: 'in_progress', 
            name: 'In Progress',
            color: '#f97316',
            tasks: filteredTasks.filter(task => task.status === 'in_progress')
          },
          {
            id: 'completed',
            name: 'Done',
            color: '#22c55e',
            tasks: filteredTasks.filter(task => task.status === 'completed')
          }
        ]
      case 'priority':
        return [
          {
            id: 'high',
            name: 'High Priority',
            color: '#ef4444',
            tasks: filteredTasks.filter(task => task.priority === 'high')
          },
          {
            id: 'medium',
            name: 'Medium Priority', 
            color: '#f97316',
            tasks: filteredTasks.filter(task => task.priority === 'medium' || !task.priority)
          },
          {
            id: 'low',
            name: 'Low Priority',
            color: '#22c55e',
            tasks: filteredTasks.filter(task => task.priority === 'low')
          }
        ]
      case 'project':
        // Group by project
        const projectMap = new Map()
        
        // Add tasks to their project groups
        filteredTasks.forEach(task => {
          const projectId = task.project_id || 'unassigned'
          const projectName = task.project?.name || 'Unassigned'
          
          if (!projectMap.has(projectId)) {
            projectMap.set(projectId, {
              id: projectId,
              name: projectName,
              color: '#6366f1',
              tasks: []
            })
          }
          projectMap.get(projectId).tasks.push(task)
        })
        
        return Array.from(projectMap.values())
      default:
        return []
    }
  }

  // Handle task click for navigation to whiteboard
  async function handleTaskClick(task: TaskWithDetails) {
    // Only navigate if task has linked elements
    if (task.task_elements && task.task_elements.length > 0) {
      const elementIds = task.task_elements.map((te: { element_id: string }) => te.element_id)
      
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
            // Navigate to the specific whiteboard with element selection
            const searchParams = new URLSearchParams()
            searchParams.set('tab', 'whiteboard')
            searchParams.set('elements', elementIds.join(','))
            searchParams.set('board', boardId)
            
            router.push(`/project/${task.project_id}?${searchParams.toString()}`)
          }
        }
      } catch (error) {
        console.error('Error finding board for elements:', error)
      }
    } else {
      // Show modal for tasks without linked elements
      setShowNoLinkedElementsModal(true)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-base text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <AuthForm onSuccess={loadData} />
  }

  return (
    <div className="h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="bg-card border-b border-border px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="SparkBoard Logo" className="h-16 w-48" />
            </div>
            <p className="text-muted-foreground text-sm">Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateProjectModal(true)}
              className="bg-primary text-primary-foreground px-3 py-2 rounded-lg hover:bg-primary/90 flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Project
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-full">
        {/* Sidebar */}
        <aside className="w-52 bg-card border-r border-border h-full p-5 overflow-y-auto">
          <h2 className="text-base font-semibold text-foreground mb-3">Projects</h2>
          <div className="space-y-1">
            {projects.map((project) => (
              <a
                key={project.id}
                href={`/project/${project.id}`}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors group"
              >
                <FolderOpen className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground" />
                <span className="text-foreground text-sm">{project.name}</span>
              </a>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 py-5 overflow-y-auto flex flex-col">
          {/* Focus Mode Header - shown when active */}
          {isFocusModeActive && (
            <div className="mb-4 mx-5 bg-card rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Target className="h-6 w-6 text-[var(--color-primary)]" />
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Focus Mode</h2>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-[var(--color-primary)] rounded-full"></span>
                        {focusMode?.tasks.length || 0} tasks
                      </span>
                      {timeUntilReset && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Resets in {timeUntilReset}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {focusModeTasks.length > 0 && (
                    <button
                      onClick={handleAddTasksToFocus}
                      className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-600)] text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
                    >
                      <Plus className="h-4 w-4" />
                      Add Tasks
                    </button>
                  )}
                  <button
                    onClick={handleManualReset}
                    className="bg-transparent border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-card-foreground)] hover:bg-[var(--color-accent)] px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm"
                    title="Reset Focus Mode"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </button>
                  <button
                    onClick={() => setShowFocusSettings(true)}
                    className="bg-transparent border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-card-foreground)] hover:bg-[var(--color-accent)] px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm"
                    title="Focus Mode Settings"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="mx-5 bg-card rounded-lg border border-border p-3 mb-5">
            <div className="flex flex-wrap gap-3 items-center">
              {!isFocusModeActive || isAddingTasksToFocus ? (
                /* Normal Mode OR Add Tasks Mode: Full filters */
                <>
                  <div className="flex-1 min-w-52">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search tasks..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                  
                  <select
                    value={filterProject}
                    onChange={(e) => setFilterProject(e.target.value)}
                    className="px-2 py-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-transparent text-sm"
                  >
                    <option value="">All Projects</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                  
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-2 py-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-transparent text-sm"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Done</option>
                  </select>

                  {/* Group By Filter (for Kanban view) */}
                  {viewMode === 'kanban' && !isAddingTasksToFocus && (
                    <select
                      value={groupBy}
                      onChange={(e) => setGroupBy(e.target.value as 'project' | 'priority' | 'status')}
                      className="px-2 py-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-transparent text-sm"
                    >
                      <option value="status">Group by Status</option>
                      <option value="project">Group by Project</option>
                      <option value="priority">Group by Priority</option>
                    </select>
                  )}
                </>
              ) : (
                /* Focus Mode: Search and grouping */
                <>
                  <div className="flex-1 min-w-52">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search focused tasks..."
                        value={focusSearchTerm}
                        onChange={(e) => setFocusSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Group by:</span>
                    <select
                      value={groupBy}
                      onChange={(e) => setGroupBy(e.target.value as 'project' | 'priority' | 'status')}
                      className="px-2 py-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-transparent text-sm"
                    >
                      <option value="status">Status</option>
                      <option value="priority">Priority</option>
                      <option value="project">Project</option>
                    </select>
                  </div>
                </>
              )}

              {/* View Toggle - Only show in normal mode */}
              {!isFocusModeActive && (
                <div className="flex bg-muted rounded-md p-1">
                  <button
                    onClick={() => setViewMode('kanban')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-sm text-xs font-medium transition-colors ${
                      viewMode === 'kanban'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Columns3 className="h-3 w-3" />
                    Kanban
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-sm text-xs font-medium transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <LayoutGrid className="h-3 w-3" />
                    Grid
                  </button>
                </div>
              )}

              {/* Focus Mode Toggle */}
              <button
                onClick={handleToggleFocusMode}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm font-medium ${
                  isFocusModeActive
                    ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-[var(--color-primary)] hover:bg-[var(--color-primary-600)]'
                    : 'bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground'
                }`}
                title={isFocusModeActive ? 'Exit Focus Mode' : 'Enter Focus Mode'}
              >
                <Target className="h-4 w-4" />
                <span>{isFocusModeActive ? 'Exit Focus' : 'Focus Mode'}</span>
                {isFocusModeActive && focusMode && (
                  <span className="bg-[var(--color-primary-600)] text-white text-xs px-1.5 py-0.5 rounded-full">
                    {focusMode.tasks.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Task Views */}
          {isFocusModeActive ? (
            /* Focus Mode Views */
            isAddingTasksToFocus ? (
              /* Add Tasks to Focus Mode View */
              <div className="flex-1 relative">
                {/* Show normal kanban grouped by project for selection */}
                <div className="h-full">
                  {areAllTasksInFocusMode() ? (
                    /* Empty state - all tasks are already in Focus Mode */
                    <div className="flex flex-col items-center justify-center h-full text-center bg-[var(--color-muted)] rounded-lg border-2 border-dashed border-[var(--color-border)] mx-5">
                      <div className="max-w-md">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--color-accent)] flex items-center justify-center">
                          <Target className="h-10 w-10 text-[var(--color-accent-foreground)]" />
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--color-card-foreground)] mb-2">
                          All tasks are in Focus Mode!
                        </h3>
                        <p className="text-[var(--color-muted-foreground)] mb-6">
                          {filteredTasks.length > 0 
                            ? `All ${filteredTasks.length} filtered tasks are already added to your Focus Mode. Try adjusting your filters or create new tasks to add more.`
                            : 'No tasks match your current filters. Try adjusting your search or filter criteria.'
                          }
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <button
                            onClick={handleCancelAddingTasks}
                            className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-lg hover:bg-[var(--color-primary-600)] transition-colors"
                          >
                            Back to Focus Mode
                          </button>
                          <button
                            onClick={() => {
                              setSearchTerm('')
                              setFilterProject('')
                              setFilterStatus('')
                            }}
                            className="px-4 py-2 bg-transparent border border-[var(--color-border)] text-[var(--color-card-foreground)] rounded-lg hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)] transition-colors"
                          >
                            Clear Filters
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <KanbanView
                      columns={getAddTasksKanbanColumns()}
                      onTaskClick={() => {}} // Disable task click during selection
                      onTaskDrop={() => {}} // Enable dragging but don't handle drops within kanban
                      compact={true}
                    />
                  )}
                </div>
                
                {/* Floating Focus Card */}
                <div 
                  className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-20"
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'copy'
                    setIsDragOverFocusCard(true)
                  }}
                  onDragLeave={() => {
                    setIsDragOverFocusCard(false)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    setIsDragOverFocusCard(false)
                    if (draggedTaskId) {
                      handleTaskDragToFocus(draggedTaskId)
                    }
                  }}
                >
                  <div className={`bg-[var(--color-primary)] border-2 border-[var(--color-primary-600)] rounded-lg p-4 shadow-lg transition-all duration-200 ${
                    pendingFocusTasks.length > 0 ? 'scale-105 shadow-xl' : ''
                  } ${isDragOverFocusCard ? 'scale-110 shadow-2xl ring-4 ring-white/50' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-white" />
                        <span className="text-white font-medium">Focus Mode</span>
                        {pendingFocusTasks.length > 0 && (
                          <span className="bg-white text-[var(--color-primary-600)] text-sm font-bold px-2 py-1 rounded-full">
                            {pendingFocusTasks.length}
                          </span>
                        )}
                      </div>
                      
                      {pendingFocusTasks.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleConfirmAddTasks}
                            className="bg-white text-[var(--color-primary-600)] hover:bg-[var(--color-primary-50)] px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                          >
                            Add Tasks ({pendingFocusTasks.length})
                          </button>
                          <button
                            onClick={() => setPendingFocusTasks([])}
                            className="bg-transparent border border-white text-white hover:bg-white hover:text-[var(--color-primary-600)] px-3 py-2 rounded-lg transition-colors text-sm"
                          >
                            Clear
                          </button>
                          <button
                            onClick={handleCancelAddingTasks}
                            className="bg-transparent border border-white text-white hover:bg-white hover:text-[var(--color-primary-600)] px-3 py-2 rounded-lg transition-colors text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="text-white text-sm opacity-75">
                            {getAvailableTasksCount() > 0 ? `Drag ${getAvailableTasksCount()} available tasks here` : 'No tasks available to add'}
                          </div>
                          <button
                            onClick={handleCancelAddingTasks}
                            className="bg-transparent border border-white text-white hover:bg-white hover:text-[var(--color-primary-600)] px-3 py-2 rounded-lg transition-colors text-sm ml-4"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Preview of pending tasks */}
                    {pendingFocusTasks.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/20">
                        <div className="text-white text-xs mb-2">Selected tasks:</div>
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {pendingFocusTasks.slice(0, 3).map(taskId => {
                            const task = tasks.find(t => t.id === taskId)
                            return task ? (
                              <div 
                                key={taskId}
                                className="bg-white/20 text-white px-2 py-1 rounded text-xs flex items-center gap-1"
                              >
                                <span className="truncate max-w-20">{task.title}</span>
                                <button
                                  onClick={() => handleRemoveFromPending(taskId)}
                                  className="hover:bg-white/20 rounded-full p-0.5"
                                >
                                  <span className="text-xs">×</span>
                                </button>
                              </div>
                            ) : null
                          })}
                          {pendingFocusTasks.length > 3 && (
                            <div className="bg-white/20 text-white px-2 py-1 rounded text-xs">
                              +{pendingFocusTasks.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : focusModeTasks.length === 0 ? (
              /* Focus Mode Empty State */
              <div className="flex items-center justify-center flex-1">
                <div className="text-center max-w-md">
                  <div className="mb-6">
                    <div className="w-16 h-16 bg-[var(--color-primary-100)] rounded-full flex items-center justify-center mx-auto mb-4">
                      <Target className="h-8 w-8 text-[var(--color-primary-600)]" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Focus Mode is Empty</h3>
                    <p className="text-muted-foreground mb-6">
                      Add tasks from your projects to create a focused workspace where you can concentrate on what matters most.
                    </p>
                  </div>
                  
                  <button
                    onClick={handleAddTasksToFocus}
                    className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-600)] text-[var(--color-primary-foreground)] px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
                  >
                    <Plus className="h-4 w-4" />
                    Add Tasks to Focus Mode
                  </button>
                  
                  <p className="text-xs text-muted-foreground mt-4">
                    Tip: You can drag tasks from any project into your focus mode
                  </p>
                </div>
              </div>
            ) : (
              /* Focus Mode Kanban */
              <div className="flex-1">
                <KanbanView
                  columns={getFocusModeColumns()}
                  onTaskClick={handleTaskClick}
                  onTaskDrop={(taskId, columnId) => {
                    handleFocusModeTaskDrop(taskId, columnId)
                  }}
                  onTaskDelete={handleRemoveFromFocusMode}
                  onCreateTask={handleCreateTaskInFocusMode}
                  showCreateTask={true}
                  showActions={true}
                  compact={true}
                />
              </div>
            )
          ) : (
            /* Normal Dashboard Views */
            <>
              {viewMode === 'grid' ? (
                /* Tasks Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => handleTaskClick(task)}
                      className={`bg-card rounded-lg border border-border p-3 hover:shadow-md transition-all duration-normal group ${
                        task.task_elements && task.task_elements.length > 0 
                          ? 'cursor-pointer hover:border-primary/50' 
                          : 'cursor-default'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-foreground line-clamp-2 text-sm">{task.title}</h3>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            task.status === 'completed'
                              ? 'bg-success-100 text-success-800'
                              : task.status === 'in_progress'
                              ? 'bg-warning-100 text-warning-800'
                              : 'bg-secondary text-secondary-foreground'
                          }`}
                        >
                          {task.status === 'completed' ? 'Done' : 
                           task.status === 'in_progress' ? 'In Progress' : 'To Do'}
                        </span>
                      </div>
                      
                      {task.description && (
                        <p className="text-muted-foreground text-xs mb-2 line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{task.assignee?.full_name || 'Unassigned'}</span>
                        </div>
                        {task.due_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(task.due_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-1 text-xs text-muted-foreground/70">
                        {task.project?.name}
                      </div>
                      
                      {/* Linked elements indicator */}
                      {task.task_elements && task.task_elements.length > 0 && (
                        <div className="mt-2 flex items-center gap-1 text-primary text-xs">
                          <ExternalLink className="h-3 w-3" />
                          <span>View on whiteboard ({task.task_elements.length} linked)</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* Kanban View */
                <div className="flex-1 overflow-hidden">
                  <KanbanView
                    columns={getKanbanColumns()}
                    onTaskClick={handleTaskClick}
                    compact={true}
                  />
                </div>
              )}

              {filteredTasks.length === 0 && (
                <div className="flex items-center justify-center flex-1">
                  <div className="text-center">
                    <div className="text-muted-foreground mb-3">
                      <FolderOpen className="h-10 w-10 mx-auto" />
                    </div>
                    <h3 className="text-base font-medium text-foreground mb-2">No tasks found</h3>
                    <p className="text-muted-foreground text-sm">
                      {tasks.length === 0 
                        ? "Create a project and start adding tasks to see them here."
                        : "Try adjusting your search or filters."
                      }
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Create Project Modal */}
      <InputModal
        isOpen={showCreateProjectModal}
        onClose={() => setShowCreateProjectModal(false)}
        onSubmit={createProject}
        title="Create New Project"
        placeholder="Enter project name..."
        submitText="Create Project"
      />

      {/* No Linked Elements Modal */}
      <NoLinkedElementsModal
        isOpen={showNoLinkedElementsModal}
        onClose={() => setShowNoLinkedElementsModal(false)}
      />

      {/* Focus Mode Settings Modal */}
      {focusMode && (
        <FocusModeSettings
          isOpen={showFocusSettings}
          onClose={() => setShowFocusSettings(false)}
          focusMode={focusMode}
          onSettingsUpdate={handleSettingsUpdate}
        />
      )}
    </div>
  )
}