'use client'

import React, { useState, useEffect } from 'react'
import { Link, Users, Mail, Clock, Trash2, Eye, Edit, Shield } from 'lucide-react'
import Modal from './Modal'
import { createClient } from '@/lib/supabase'
import { Database } from '@/types/database.types'

type Tables = Database['public']['Tables']
type Board = Tables['boards']['Row']
type BoardShare = Tables['board_shares']['Row']
type BoardMember = Tables['board_members']['Row']

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  board: Board
}

type AccessLevel = 'view' | 'edit' | 'admin'

export default function ShareModal({ isOpen, onClose, board }: ShareModalProps) {
  const [publicShares, setPublicShares] = useState<BoardShare[]>([])
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [newShareLevel, setNewShareLevel] = useState<AccessLevel>('view')
  const [shareExpiry, setShareExpiry] = useState<string>('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor' | 'admin'>('viewer')
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  const supabase = createClient()

  // Load existing shares and members
  useEffect(() => {
    if (isOpen) {
      loadShareData()
    }
  }, [isOpen, board.id])

  const loadShareData = async () => {
    setIsLoading(true)
    try {
      // Load public shares
      const { data: shares } = await supabase
        .from('board_shares')
        .select('*')
        .eq('board_id', board.id)

      if (shares) setPublicShares(shares)

      // Load board members
      const { data: members } = await supabase
        .from('board_members')
        .select(`
          *,
          user_profiles!inner(email, full_name)
        `)
        .eq('board_id', board.id)

      if (members) setBoardMembers(members as BoardMember[])
    } catch (error) {
      console.error('Error loading share data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createPublicShare = async () => {
    setIsLoading(true)
    try {
      const shareData: {
        board_id: string
        access_level: string
        is_public: boolean
        shared_by: string
        expires_at?: string
      } = {
        board_id: board.id,
        access_level: newShareLevel,
        is_public: true,
        shared_by: (await supabase.auth.getUser()).data.user?.id || ''
      }

      if (shareExpiry) {
        shareData.expires_at = new Date(shareExpiry).toISOString()
      }

      const { data, error } = await supabase
        .from('board_shares')
        .insert(shareData)
        .select()
        .single()

      if (error) throw error

      if (data) {
        setPublicShares(prev => [...prev, data])
        setNewShareLevel('view')
        setShareExpiry('')
      }
    } catch (error) {
      console.error('Error creating share:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteShare = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('board_shares')
        .delete()
        .eq('id', shareId)

      if (error) throw error

      setPublicShares(prev => prev.filter(share => share.id !== shareId))
    } catch (error) {
      console.error('Error deleting share:', error)
    }
  }

  const sendInvitation = async () => {
    if (!inviteEmail) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('invitations')
        .insert({
          email: inviteEmail,
          resource_type: 'board',
          resource_id: board.id,
          role: inviteRole,
          invited_by: (await supabase.auth.getUser()).data.user?.id || ''
        })
        .select()
        .single()

      if (error) throw error

      // TODO: Send email invitation via Edge Function
      console.log('Invitation created:', data)
      setInviteEmail('')
      alert('Invitation sent successfully!')
    } catch (error) {
      console.error('Error sending invitation:', error)
      alert('Failed to send invitation')
    } finally {
      setIsLoading(false)
    }
  }

  const copyShareLink = async (shareToken: string) => {
    const encodedToken = encodeURIComponent(shareToken)
    const link = `${window.location.origin}/share/board/${encodedToken}`
    await navigator.clipboard.writeText(link)
    setCopiedLink(shareToken)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  const getAccessLevelIcon = (level: string) => {
    switch (level) {
      case 'view': return <Eye className="w-4 h-4" />
      case 'edit': return <Edit className="w-4 h-4" />
      case 'admin': return <Shield className="w-4 h-4" />
      default: return <Eye className="w-4 h-4" />
    }
  }

  const formatExpiry = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Share "${board.name}"`} size="lg">
      <div className="space-y-6">
        {/* Create Public Share Link */}
        <div className="border border-purple-200 dark:border-purple-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-4 flex items-center gap-2">
            <Link className="w-5 h-5" />
            Create Share Link
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Access Level
              </label>
              <select
                value={newShareLevel}
                onChange={(e) => setNewShareLevel(e.target.value as AccessLevel)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
              >
                <option value="view">View Only</option>
                <option value="edit">Can Edit</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expires (Optional)
              </label>
              <input
                type="datetime-local"
                value={shareExpiry}
                onChange={(e) => setShareExpiry(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={createPublicShare}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                Create Link
              </button>
            </div>
          </div>
        </div>

        {/* Existing Public Shares */}
        {publicShares.length > 0 && (
          <div className="border border-purple-200 dark:border-purple-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-4">
              Active Share Links
            </h3>
            
            <div className="space-y-3">
              {publicShares.map((share) => (
                <div key={share.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    {getAccessLevelIcon(share.access_level)}
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {share.access_level} access
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        Expires: {formatExpiry(share.expires_at)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyShareLink(share.share_token)}
                      className="px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-md hover:bg-purple-200 dark:hover:bg-purple-800"
                    >
                      {copiedLink === share.share_token ? 'Copied!' : 'Copy Link'}
                    </button>
                    <button
                      onClick={() => deleteShare(share.id)}
                      className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-md"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invite by Email */}
        <div className="border border-purple-200 dark:border-purple-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Invite by Email
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'viewer' | 'editor' | 'admin')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={sendInvitation}
                disabled={isLoading || !inviteEmail}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                Send Invite
              </button>
            </div>
          </div>
        </div>

        {/* Current Board Members */}
        {boardMembers.length > 0 && (
          <div className="border border-purple-200 dark:border-purple-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Board Members
            </h3>
            
            <div className="space-y-3">
              {boardMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    {getAccessLevelIcon(member.role)}
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {(member as BoardMember & { user_profiles?: { full_name?: string; email?: string } }).user_profiles?.full_name || 'Unknown User'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {(member as BoardMember & { user_profiles?: { full_name?: string; email?: string } }).user_profiles?.email} • {member.role}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}