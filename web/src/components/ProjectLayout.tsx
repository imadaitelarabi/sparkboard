'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Plus, Settings, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/store'
import { Database } from '@/types/database.types'
import dynamic from 'next/dynamic'
import InputModal from './InputModal'

const WhiteboardView = dynamic(() => import('./WhiteboardView'), { 
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center">Loading whiteboard...</div>
})
import TaskBoardView from './TaskBoardView'

type Tables = Database['public']['Tables']
type Project = Tables['projects']['Row']
type Board = Tables['boards']['Row']

interface ProjectLayoutProps {
  projectId: string
}

export default function ProjectLayout({ projectId }: ProjectLayoutProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { 
    currentProject, 
    setCurrentProject, 
    boards, 
    setBoards, 
    currentBoard, 
    setCurrentBoard,
    user,
    setUser,
    setNavigationContext
  } = useAppStore()
  
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'whiteboard' | 'tasks'>('whiteboard')
  const [showCreateWhiteboardModal, setShowCreateWhiteboardModal] = useState(false)

  useEffect(() => {
    loadProject()
  }, [])

  // Handle URL parameters for navigation context
  useEffect(() => {
    const tab = searchParams.get('tab')
    const elements = searchParams.get('elements')
    const boardId = searchParams.get('board')
    
    if (tab === 'whiteboard') {
      setActiveTab('whiteboard')
    } else if (tab === 'tasks') {
      setActiveTab('tasks')
    }
    
    // Handle board parameter for task-to-whiteboard navigation
    if (boardId) {
      const targetBoard = boards.find(b => b.id === boardId)
      if (targetBoard) {
        setCurrentBoard(targetBoard)
      }
    }
    
    if (elements) {
      const elementIds = elements.split(',').filter(Boolean)
      if (elementIds.length > 0) {
        setNavigationContext({
          elementIds,
          fromTask: true
        })
      }
    }
  }, [searchParams, setNavigationContext, boards, setCurrentBoard])

  const loadProject = useCallback(async () => {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)

      if (!currentUser) {
        router.push('/')
        return
      }

      // Load project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (projectError) throw projectError
      setCurrentProject(project)

      // Load boards for this project
      const { data: boardsData, error: boardsError } = await supabase
        .from('boards')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })

      if (boardsError) throw boardsError
      setBoards(boardsData || [])

      // Set initial current board (first whiteboard)
      const whiteboards = boardsData?.filter(b => b.type === 'whiteboard') || []
      if (whiteboards.length > 0) {
        setCurrentBoard(whiteboards[0])
      }

    } catch (error) {
      console.error('Error loading project:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }, [projectId, router, supabase, setUser, setCurrentProject, setBoards, setCurrentBoard])

  async function createBoard(name: string, type: 'whiteboard' | 'tasks') {
    if (!currentProject || !user) return

    try {
      const { data, error } = await supabase
        .from('boards')
        .insert({
          project_id: currentProject.id,
          name,
          type
        })
        .select()
        .single()

      if (error) throw error

      const newBoards = [...boards, data]
      setBoards(newBoards)
      
      if (type === 'whiteboard') {
        setCurrentBoard(data)
      }
    } catch (error) {
      console.error('Error creating board:', error)
    }
  }

  async function createWhiteboard(name: string) {
    if (!name.trim()) return
    await createBoard(name.trim(), 'whiteboard')
  }

  function switchToTab(tab: 'whiteboard' | 'tasks', board?: Board) {
    // Clear navigation context when manually switching tabs
    setNavigationContext(null)
    
    // Update active tab
    setActiveTab(tab)
    
    // Set board if provided
    if (board) {
      setCurrentBoard(board)
    }
    
    // Update URL to remove query parameters including board
    router.replace(`/project/${projectId}`)
  }

  const whiteboards = boards.filter(b => b.type === 'whiteboard')
  const taskBoard = boards.find(b => b.type === 'tasks')

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-base text-muted-foreground">Loading project...</div>
      </div>
    )
  }

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-lg font-medium text-foreground mb-2">Project not found</h1>
          <button
            onClick={() => router.push('/')}
            className="text-primary hover:text-primary/80 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-5 py-3 flex-shrink-0 bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-accent rounded-md transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{currentProject.name}</h1>
              <p className="text-sm text-muted-foreground">{currentProject.description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-accent rounded-md transition-colors">
              <Users className="h-4 w-4 text-muted-foreground" />
            </button>
            <button className="p-2 hover:bg-accent rounded-md transition-colors">
              <Settings className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-5 mt-3">
          {/* Whiteboard tabs */}
          <div className="flex items-center gap-1">
            {whiteboards.map((board) => (
              <button
                key={board.id}
                onClick={() => switchToTab('whiteboard', board)}
                className={`px-2 py-1 rounded-md text-sm font-medium transition-colors ${
                  currentBoard?.id === board.id && activeTab === 'whiteboard'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                {board.name}
              </button>
            ))}
            <button
              onClick={() => setShowCreateWhiteboardModal(true)}
              className="p-1 hover:bg-accent rounded-md transition-colors"
              title="Add Whiteboard"
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Task board tab */}
          <div className="border-l border-border pl-5">
            <button
              onClick={() => switchToTab('tasks', taskBoard)}
              className={`px-2 py-1 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'tasks'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              Tasks
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'whiteboard' && currentBoard && (
          <WhiteboardView board={currentBoard} />
        )}
        {activeTab === 'tasks' && taskBoard && (
          <TaskBoardView board={taskBoard} project={currentProject} />
        )}
      </div>

      {/* Create Whiteboard Modal */}
      <InputModal
        isOpen={showCreateWhiteboardModal}
        onClose={() => setShowCreateWhiteboardModal(false)}
        onSubmit={(name) => {
          createWhiteboard(name)
          setShowCreateWhiteboardModal(false)
        }}
        title="Create New Whiteboard"
        placeholder="Enter whiteboard name..."
        submitText="Create Whiteboard"
      />
    </div>
  )
}