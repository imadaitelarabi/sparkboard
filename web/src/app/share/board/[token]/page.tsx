'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import WhiteboardView from '@/components/WhiteboardView'
import AuthGate from '@/components/AuthGate'
import { Database } from '@/types/database.types'
import { Eye, Lock, AlertCircle } from 'lucide-react'

type Tables = Database['public']['Tables']
type Board = Tables['boards']['Row']
type BoardShare = Tables['board_shares']['Row']

interface SharedBoardData {
  board: Board
  share: BoardShare
  hasPassword: boolean
}

export default function SharedBoardPage() {
  const params = useParams()
  const router = useRouter()
  const token = decodeURIComponent(params.token as string)
  
  const [boardData, setBoardData] = useState<SharedBoardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [passwordRequired, setPasswordRequired] = useState(false)
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  const supabase = createClient()

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUser({ id: user.id, email: user.email })
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Error checking auth:', error)
      setUser(null)
    } finally {
      setAuthChecked(true)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (token && authChecked) {
      loadSharedBoard()
    }
  }, [token, authChecked])

  const loadSharedBoard = async (providedPassword?: string) => {
    try {
      setLoading(true)
      setError(null)

      // Find the board share by token
      const { data: shareData, error: shareError } = await supabase
        .from('board_shares')
        .select(`
          *,
          boards!board_shares_board_id_fkey(
            id,
            name,
            type,
            project_id,
            settings,
            created_at,
            updated_at
          )
        `)
        .eq('share_token', token)
        .eq('is_public', true)
        .single()

      if (shareError || !shareData) {
        setError('This board share link is invalid or has expired.')
        return
      }

      // Check if the share has expired
      if (shareData.expires_at && new Date(shareData.expires_at) < new Date()) {
        setError('This board share link has expired.')
        return
      }

      // Check if password is required
      if (shareData.password_hash && !providedPassword) {
        setPasswordRequired(true)
        return
      }

      // TODO: Verify password if provided
      if (shareData.password_hash && providedPassword) {
        // In a real implementation, you'd hash and compare the password
        // For now, we'll skip this step
      }

      setBoardData({
        board: (shareData as BoardShare & { boards: Board }).boards,
        share: shareData,
        hasPassword: !!shareData.password_hash
      })
    } catch (error) {
      console.error('Error loading shared board:', error)
      setError('Failed to load the shared board. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await loadSharedBoard(password)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading shared board...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Unable to Access Board
          </h1>
          <p className="text-muted-foreground mb-6">
            {error}
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Go to SparkBoard
          </button>
        </div>
      </div>
    )
  }

  if (passwordRequired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <Lock className="w-12 h-12 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Password Required
            </h1>
            <p className="text-muted-foreground">
              This board is password protected. Please enter the password to continue.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-input text-foreground"
                placeholder="Enter password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Verifying...' : 'Access Board'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (!boardData) {
    return null
  }

  // Check if admin access requires authentication
  if (boardData.share.access_level === 'admin' && !user) {
    return (
      <AuthGate
        resourceName={boardData.board.name}
        resourceType="board"
        message="Admin access to this board requires authentication. Please sign in or create an account to continue."
      />
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="SparkBoard Logo" className="h-12 w-36" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="w-4 h-4" />
              <span>
                Viewing &quot;{boardData.board.name}&quot; • {boardData.share.access_level} access
              </span>
            </div>
          </div>
          
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 text-primary hover:bg-secondary rounded-lg transition-colors"
          >
            Go to SparkBoard
          </button>
        </div>
      </div>

      {/* Whiteboard */}
      <div className="h-[calc(100vh-73px)]">
        <WhiteboardView 
          board={boardData.board} 
          accessLevel={boardData.share.access_level as 'view' | 'edit' | 'admin'} 
        />
      </div>
    </div>
  )
}