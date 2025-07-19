'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Calendar, User, FolderOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/store'
import { Database } from '@/types/database.types'

type Tables = Database['public']['Tables']
type Project = Tables['projects']['Row']
type Task = Tables['tasks']['Row']
type TaskCategory = Tables['task_categories']['Row']

export default function Dashboard() {
  const supabase = createClient()
  const { projects, setProjects, tasks, setTasks, user, setUser } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    loadData()
  }, [loadData])

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

      // Load tasks across all projects
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects(name),
          category:task_categories(name, color),
          assignee:user_profiles(full_name)
        `)
        .order('created_at', { ascending: false })

      if (tasksError) throw tasksError
      setTasks(tasksData || [])

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, setUser, setProjects, setTasks])

  async function createProject() {
    if (!user) return
    
    const projectName = prompt('Enter project name:')
    if (!projectName) return

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: projectName,
          owner_id: user.id
        })
        .select()
        .single()

      if (error) throw error
      
      setProjects([data, ...projects])
    } catch (error) {
      console.error('Error creating project:', error)
    }
  }

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesProject = !filterProject || task.project_id === filterProject
    const matchesStatus = !filterStatus || task.status === filterStatus
    return matchesSearch && matchesProject && matchesStatus
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome to SparkBoard</h1>
          <p className="text-gray-600 mb-6">Please sign in to continue</p>
          <button 
            onClick={() => supabase.auth.signInWithOAuth({ provider: 'github' })}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Sign in with GitHub
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SparkBoard</h1>
            <p className="text-gray-600">Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={createProject}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Project
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-gray-600 hover:text-gray-900"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Projects</h2>
          <div className="space-y-2">
            {projects.map((project) => (
              <a
                key={project.id}
                href={`/project/${project.id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FolderOpen className="h-5 w-5 text-gray-400" />
                <span className="text-gray-700">{project.name}</span>
              </a>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Filters */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="pending">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Done</option>
              </select>
            </div>
          </div>

          {/* Tasks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 line-clamp-2">{task.title}</h3>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      task.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : task.status === 'in_progress'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {task.status === 'completed' ? 'Done' : 
                     task.status === 'in_progress' ? 'In Progress' : 'To Do'}
                  </span>
                </div>
                
                {task.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{task.description}</p>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{task.assignee?.full_name || 'Unassigned'}</span>
                  </div>
                  {task.due_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(task.due_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div className="mt-2 text-xs text-gray-400">
                  {task.project?.name}
                </div>
              </div>
            ))}
          </div>

          {filteredTasks.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <FolderOpen className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
              <p className="text-gray-600">
                {tasks.length === 0 
                  ? "Create a project and start adding tasks to see them here."
                  : "Try adjusting your search or filters."
                }
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}