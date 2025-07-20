'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Database } from '@/types/database.types'
import { Mail, CheckCircle, AlertCircle, UserPlus } from 'lucide-react'

type Tables = Database['public']['Tables']
type Invitation = Tables['invitations']['Row']

interface InvitationData extends Invitation {
  project?: {
    name: string
  }
  board?: {
    name: string
  }
}

export default function InvitationPage() {
  const params = useParams()
  const router = useRouter()
  const token = decodeURIComponent(params.token as string)
  
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)

  const supabase = createClient()

  useEffect(() => {
    checkAuth()
    if (token) {
      loadInvitation()
    }
  }, [token])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) {
      setUser({ id: user.id, email: user.email })
    } else {
      setUser(null)
    }
  }

  const loadInvitation = async () => {
    try {
      setLoading(true)
      setError(null)

      // Find the invitation by token
      const { data: inviteData, error: inviteError } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .maybeSingle()

      if (inviteError || !inviteData) {
        setError('This invitation is invalid or has expired.')
        return
      }

      // Check if the invitation has expired
      if (inviteData.expires_at && new Date(inviteData.expires_at) < new Date()) {
        setError('This invitation has expired.')
        return
      }

      // Check if already accepted
      if (inviteData.accepted_at) {
        setAccepted(true)
      }

      // Load resource details based on type
      let resourceData = {}
      if (inviteData.resource_type === 'project') {
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('name')
          .eq('id', inviteData.resource_id)
          .single()
        
        if (projectError) {
          console.error('Error loading project:', projectError)
          setError('The project for this invitation could not be found.')
          return
        }
        resourceData = { project }
      } else if (inviteData.resource_type === 'board') {
        const { data: board, error: boardError } = await supabase
          .from('boards')
          .select('name')
          .eq('id', inviteData.resource_id)
          .single()
        
        if (boardError) {
          console.error('Error loading board:', boardError)
          setError('The board for this invitation could not be found.')
          return
        }
        resourceData = { board }
      }

      setInvitation({ ...inviteData, ...resourceData })
    } catch (error) {
      console.error('Error loading invitation:', error)
      setError('Failed to load the invitation. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const acceptInvitation = async () => {
    if (!user) {
      // Redirect to login
      const redirectUrl = encodeURIComponent(window.location.href)
      router.push(`/?redirect=${redirectUrl}`)
      return
    }

    if (!invitation) return

    setAccepting(true)
    try {
      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('token', token)

      if (updateError) throw updateError

      // Add user to the appropriate table based on resource type
      if (invitation.resource_type === 'project') {
        const { error: memberError } = await supabase
          .from('project_members')
          .insert({
            project_id: invitation.resource_id,
            user_id: user.id,
            role: invitation.role
          })

        if (memberError && !memberError.message.includes('duplicate')) {
          throw memberError
        }
      } else if (invitation.resource_type === 'board') {
        const { error: memberError } = await supabase
          .from('board_members')
          .insert({
            board_id: invitation.resource_id,
            user_id: user.id,
            role: invitation.role,
            invited_by: invitation.invited_by
          })

        if (memberError && !memberError.message.includes('duplicate')) {
          throw memberError
        }
      }

      setAccepted(true)
    } catch (error) {
      console.error('Error accepting invitation:', error)
      setError('Failed to accept the invitation. Please try again.')
    } finally {
      setAccepting(false)
    }
  }

  const getResourceName = () => {
    if (invitation?.resource_type === 'project') {
      return invitation.project?.name || 'Unknown Project'
    } else if (invitation?.resource_type === 'board') {
      return invitation.board?.name || 'Unknown Board'
    }
    return 'Unknown Resource'
  }

  const getResourceType = () => {
    return invitation?.resource_type === 'project' ? 'project' : 'board'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-purple-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Invalid Invitation
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error}
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Go to SparkBoard
          </button>
        </div>
      </div>
    )
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-purple-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Invitation Accepted!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You now have access to &quot;{getResourceName()}&quot;.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Go to SparkBoard
          </button>
        </div>
      </div>
    )
  }

  if (!invitation) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-purple-900 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <Mail className="w-12 h-12 text-purple-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            You&apos;re Invited!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            You&apos;ve been invited to join the {getResourceType()} &quot;{getResourceName()}&quot; as a{' '}
            <span className="font-medium text-purple-600">{invitation.role}</span>.
          </p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <UserPlus className="w-5 h-5 text-purple-600" />
            <div>
              <div className="font-medium text-purple-900 dark:text-purple-100">
                {getResourceName()}
              </div>
              <div className="text-sm text-purple-600 dark:text-purple-400">
                Role: {invitation.role}
              </div>
            </div>
          </div>
        </div>

        {!user ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              You need to sign in to accept this invitation.
            </p>
            <button
              onClick={() => {
                const redirectUrl = encodeURIComponent(window.location.href)
                router.push(`/?redirect=${redirectUrl}`)
              }}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Sign In to Accept
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Signed in as: {user.email}
            </div>
            <button
              onClick={acceptInvitation}
              disabled={accepting}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {accepting ? 'Accepting...' : 'Accept Invitation'}
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
          >
            Go to SparkBoard
          </button>
        </div>
      </div>
    </div>
  )
}