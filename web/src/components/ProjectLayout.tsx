'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Settings, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/store'
import { Database } from '@/types/database.types'
import dynamic from 'next/dynamic'

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
  const supabase = createClient()
  const { 
    currentProject, 
    setCurrentProject, 
    boards, 
    setBoards, 
    currentBoard, 
    setCurrentBoard,
    user,
    setUser
  } = useAppStore()
  
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'whiteboard' | 'tasks'>('whiteboard')

  useEffect(() => {
    loadProject()
  }, [loadProject])

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

  async function createWhiteboard() {
    const name = prompt('Enter whiteboard name:')
    if (!name) return
    await createBoard(name, 'whiteboard')
  }

  const whiteboards = boards.filter(b => b.type === 'whiteboard')
  const taskBoard = boards.find(b => b.type === 'tasks')

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading project...</div>
      </div>
    )
  }

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Project not found</h1>
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{currentProject.name}</h1>
              <p className="text-sm text-gray-600">{currentProject.description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Users className="h-5 w-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 mt-4">
          {/* Whiteboard tabs */}
          <div className="flex items-center gap-2">
            {whiteboards.map((board) => (
              <button
                key={board.id}
                onClick={() => {
                  setCurrentBoard(board)
                  setActiveTab('whiteboard')
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentBoard?.id === board.id && activeTab === 'whiteboard'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {board.name}
              </button>
            ))}
            <button
              onClick={createWhiteboard}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Add Whiteboard"
            >
              <Plus className="h-4 w-4 text-gray-600" />
            </button>
          </div>

          {/* Task board tab */}
          <div className="border-l border-gray-200 pl-6">
            <button
              onClick={() => {
                setActiveTab('tasks')
                if (taskBoard) setCurrentBoard(taskBoard)
              }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'tasks'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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
    </div>
  )
}