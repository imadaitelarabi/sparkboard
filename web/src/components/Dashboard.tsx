'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Calendar, User, FolderOpen, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/store'
import { Database } from '@/types/database.types'
import AuthForm from './AuthForm'
import InputModal from './InputModal'
import ThemeToggle from './ThemeToggle'

type Tables = Database['public']['Tables']
type Task = Tables['tasks']['Row']

interface TaskWithDetails extends Task {
  project?: { name: string } | null
  category?: { name: string; color: string | null } | null
  assignee?: { full_name: string } | null
}

export default function Dashboard() {
  const supabase = createClient()
  const { projects, setProjects, user, setUser } = useAppStore()
  const [tasks, setTasks] = useState<TaskWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false)

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
          assignee:user_profiles!tasks_assignee_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false })

      if (tasksError) throw tasksError
      setTasks((tasksData || []) as unknown as TaskWithDetails[])

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, setUser, setProjects, setTasks])

  useEffect(() => {
    loadData()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        loadData()
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setProjects([])
        setTasks([])
      }
    })

    return () => subscription.unsubscribe()
  }, [loadData, supabase.auth, setUser, setProjects, setTasks])

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

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesProject = !filterProject || task.project_id === filterProject
    const matchesStatus = !filterStatus || task.status === filterStatus
    return matchesSearch && matchesProject && matchesStatus
  })

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">SparkBoard</h1>
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

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-52 bg-card border-r border-border min-h-screen p-5">
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
        <main className="flex-1 p-5">
          {/* Filters */}
          <div className="bg-card rounded-lg border border-border p-3 mb-5">
            <div className="flex flex-wrap gap-3">
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
            </div>
          </div>

          {/* Tasks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="bg-card rounded-lg border border-border p-3 hover:shadow-md transition-all duration-normal cursor-pointer group"
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
              </div>
            ))}
          </div>

          {filteredTasks.length === 0 && (
            <div className="text-center py-10">
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
    </div>
  )
}