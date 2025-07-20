'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Link, Users, Mail, Clock, Trash2, Eye, Edit, Shield, Send, Check, Globe, Lock, ChevronDown } from 'lucide-react'
import Modal from './Modal'
import { createClient } from '@/lib/supabase'
import { Database } from '@/types/database.types'

type Tables = Database['public']['Tables']
type Board = Tables['boards']['Row']
type Project = Tables['projects']['Row']
type BoardShare = Tables['board_shares']['Row']
type BoardMember = Tables['board_members']['Row']
type Invitation = Tables['invitations']['Row']

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  project: Project
  boards: Board[]
  currentBoard?: Board
}

type AccessLevel = 'view' | 'edit' | 'admin'
type ShareType = 'project' | 'board'

export default function ShareModal({ isOpen, onClose, project, boards, currentBoard }: ShareModalProps) {
  const [shareType, setShareType] = useState<ShareType>('board')
  const [selectedBoards, setSelectedBoards] = useState<string[]>(currentBoard ? [currentBoard.id] : [])
  const [publicShares, setPublicShares] = useState<BoardShare[]>([])
  const [projectInvitations, setProjectInvitations] = useState<Invitation[]>([])
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [newShareLevel, setNewShareLevel] = useState<AccessLevel>('view')
  const [shareExpiry, setShareExpiry] = useState<string>('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor' | 'admin'>('viewer')
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [emailSending, setEmailSending] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState(false)

  const supabase = createClient()

  // Function needs to be defined before it's used in useEffect
  const loadShareData = useCallback(async () => {
    setIsLoading(true)
    try {
      if (shareType === 'board' && selectedBoards.length > 0) {
        // Load public shares for selected boards
        const { data: shares } = await supabase
          .from('board_shares')
          .select('*')
          .in('board_id', selectedBoards)

        if (shares) setPublicShares(shares)

        // Load board members for selected boards with user info
        const { data: members, error } = await supabase
          .from('board_members')
          .select('*')
          .in('board_id', selectedBoards)

        if (error) {
          console.error('Error loading board members:', error)
          setBoardMembers([])
        } else if (members) {
          // Get user profiles for the members
          const userIds = members.map(m => m.user_id).filter(Boolean)
          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from('user_profiles')
              .select('user_id, email, full_name')
              .in('user_id', userIds)

            const profileMap = new Map()
            profiles?.forEach(profile => profileMap.set(profile.user_id, profile))

            const membersWithProfiles = members.map(member => ({
              ...member,
              profile: profileMap.get(member.user_id)
            }))
            setBoardMembers(membersWithProfiles as any)
          } else {
            setBoardMembers(members)
          }
        }
      } else if (shareType === 'project') {
        // Load project invitations
        const { data: invitations } = await supabase
          .from('invitations')
          .select('*')
          .eq('resource_type', 'project')
          .eq('resource_id', project.id)

        if (invitations) setProjectInvitations(invitations)
        setPublicShares([])
        setBoardMembers([])
      }
    } catch (error) {
      console.error('Error loading share data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [shareType, selectedBoards, supabase, project.id])

  // Load existing shares and members
  useEffect(() => {
    if (isOpen) {
      setShareType('board')
      setSelectedBoards(currentBoard ? [currentBoard.id] : [])
      setProjectInvitations([])
      setPublicShares([])
      setBoardMembers([])
    }
  }, [isOpen, currentBoard])

  // Load share data when share type or selected boards change
  useEffect(() => {
    if (isOpen && ((shareType === 'board' && selectedBoards.length > 0) || shareType === 'project')) {
      loadShareData()
    }
  }, [isOpen, shareType, selectedBoards, loadShareData])


  const createPublicShare = async () => {
    setIsLoading(true)
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error('User not authenticated')

      if (shareType === 'project') {
        // Create project invitation
        const inviteData = {
          email: inviteEmail || 'public',
          resource_type: 'project' as const,
          resource_id: project.id,
          role: newShareLevel === 'view' ? 'member' : newShareLevel === 'edit' ? 'admin' : 'admin',
          invited_by: user.id,
          ...(shareExpiry && { expires_at: new Date(shareExpiry).toISOString() })
        }

        const { data, error } = await supabase
          .from('invitations')
          .insert(inviteData)
          .select()
          .single()

        if (error) throw error
        console.log('Project share created:', data)
        
        // Update the project invitations state to show the new invitation
        setProjectInvitations(prev => [...prev, data])
      } else {
        // Create board shares for selected boards
        const sharePromises = selectedBoards.map(boardId => {
          const shareData = {
            board_id: boardId,
            access_level: newShareLevel,
            is_public: true,
            shared_by: user.id,
            expires_at: shareExpiry ? new Date(shareExpiry).toISOString() : null
          }

          return supabase
            .from('board_shares')
            .insert(shareData)
            .select()
            .single()
        })

        const results = await Promise.all(sharePromises)
        const newShares = results.map(r => r.data).filter((data): data is BoardShare => data !== null)
        setPublicShares(prev => [...prev, ...newShares])
      }

      setNewShareLevel('view')
      setShareExpiry('')
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

    setEmailSending(true)
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error('User not authenticated')

      // Create invitation record
      const invitationData = {
        email: inviteEmail,
        resource_type: shareType,
        resource_id: shareType === 'project' ? project.id : selectedBoards[0],
        role: inviteRole,
        invited_by: user.id
      }

      const { data: invitation, error: inviteError } = await supabase
        .from('invitations')
        .insert(invitationData)
        .select()
        .single()

      if (inviteError) throw inviteError

      // Send email via Resend
      const emailResponse = await fetch('/api/send-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId: invitation.id,
          recipientEmail: inviteEmail,
          inviterName: user.user_metadata?.full_name || user.email,
          resourceName: shareType === 'project' ? project.name : selectedBoards.map(id => boards.find(b => b.id === id)?.name).join(', '),
          resourceType: shareType,
          inviteUrl: `${window.location.origin}/invite/${invitation.token}`
        })
      })

      if (!emailResponse.ok) {
        const errorData = await emailResponse.text()
        throw new Error(`Email sending failed: ${errorData}`)
      }

      setEmailSuccess(true)
      setInviteEmail('')
      setTimeout(() => setEmailSuccess(false), 3000)
    } catch (error) {
      console.error('Error sending invitation:', error)
      alert('Failed to send invitation: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setEmailSending(false)
    }
  }

  const copyShareLink = async (shareToken: string) => {
    const encodedToken = encodeURIComponent(shareToken)
    const link = `${window.location.origin}/share/board/${encodedToken}`
    await navigator.clipboard.writeText(link)
    setCopiedLink(shareToken)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  const copyProjectInviteLink = async (inviteToken: string) => {
    const encodedToken = encodeURIComponent(inviteToken)
    const link = `${window.location.origin}/invite/${encodedToken}`
    await navigator.clipboard.writeText(link)
    setCopiedLink(inviteToken)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  const deleteProjectInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId)

      if (error) throw error

      setProjectInvitations(prev => prev.filter(invitation => invitation.id !== invitationId))
    } catch (error) {
      console.error('Error deleting project invitation:', error)
    }
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
    <Modal isOpen={isOpen} onClose={onClose} title={`Share ${shareType === 'project' ? `"${project.name}"` : 'Boards'}`} size="lg">
      <div className="p-6 space-y-6">
        {/* Share Type Selection */}
        <div className="flex items-center gap-4 p-4 bg-[var(--color-accent)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <input
              type="radio"
              id="share-project"
              name="shareType"
              value="project"
              checked={shareType === 'project'}
              onChange={(e) => setShareType(e.target.value as ShareType)}
              className="w-4 h-4 text-[var(--color-primary-500)] border-[var(--color-border)] focus:ring-[var(--color-ring)]"
            />
            <label htmlFor="share-project" className="text-sm font-medium text-[var(--color-accent-foreground)] flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Share entire project
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="radio"
              id="share-boards"
              name="shareType"
              value="board"
              checked={shareType === 'board'}
              onChange={(e) => setShareType(e.target.value as ShareType)}
              className="w-4 h-4 text-[var(--color-primary-500)] border-[var(--color-border)] focus:ring-[var(--color-ring)]"
            />
            <label htmlFor="share-boards" className="text-sm font-medium text-[var(--color-accent-foreground)] flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Share specific boards
            </label>
          </div>
        </div>

        {/* Board Selection (when sharing boards) */}
        {shareType === 'board' && (
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4">
            <h3 className="text-base font-semibold text-[var(--color-card-foreground)] mb-3 flex items-center gap-2">
              <ChevronDown className="w-4 h-4" />
              Select Boards to Share
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {boards.map((board) => (
                <label key={board.id} className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] hover:bg-[var(--color-muted)] transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedBoards.includes(board.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedBoards(prev => [...prev, board.id])
                      } else {
                        setSelectedBoards(prev => prev.filter(id => id !== board.id))
                      }
                    }}
                    className="w-4 h-4 text-[var(--color-primary-500)] border-[var(--color-border)] rounded focus:ring-[var(--color-ring)]"
                  />
                  <div>
                    <div className="font-medium text-[var(--color-card-foreground)]">{board.name}</div>
                    <div className="text-xs text-[var(--color-muted-foreground)] capitalize">{board.type}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
        {/* Create Public Share Link */}
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4">
          <h3 className="text-base font-semibold text-[var(--color-card-foreground)] mb-4 flex items-center gap-2">
            <Link className="w-4 h-4" />
            Create Share Link
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-muted-foreground)] mb-2">
                Access Level
              </label>
              <select
                value={newShareLevel}
                onChange={(e) => setNewShareLevel(e.target.value as AccessLevel)}
                className="w-full px-3 py-2 bg-[var(--color-input)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-card-foreground)] focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent"
              >
                <option value="view">View Only</option>
                <option value="edit">Can Edit</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--color-muted-foreground)] mb-2">
                Expires (Optional)
              </label>
              <input
                type="datetime-local"
                value={shareExpiry}
                onChange={(e) => setShareExpiry(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--color-input)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-card-foreground)] focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={createPublicShare}
                disabled={isLoading || (shareType === 'board' && selectedBoards.length === 0)}
                className="w-full px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-[var(--radius-md)] hover:bg-[var(--color-primary-600)] disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors duration-[var(--duration-fast)]"
              >
                {isLoading ? 'Creating...' : 'Create Link'}
              </button>
            </div>
          </div>
        </div>

        {/* Existing Public Shares */}
        {publicShares.length > 0 && (
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4">
            <h3 className="text-base font-semibold text-[var(--color-card-foreground)] mb-4">
              Active Board Share Links
            </h3>
            
            <div className="space-y-3">
              {publicShares.map((share) => (
                <div key={share.id} className="flex items-center justify-between bg-[var(--color-muted)] rounded-[var(--radius-lg)] p-3">
                  <div className="flex items-center gap-3">
                    {getAccessLevelIcon(share.access_level)}
                    <div>
                      <div className="font-medium text-[var(--color-card-foreground)]">
                        {share.access_level} access
                      </div>
                      <div className="text-sm text-[var(--color-muted-foreground)] flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        Expires: {formatExpiry(share.expires_at)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyShareLink(share.share_token)}
                      className="px-3 py-1 text-sm bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-[var(--radius-md)] hover:bg-[var(--color-primary-600)] transition-colors duration-[var(--duration-fast)]"
                    >
                      {copiedLink === share.share_token ? 'Copied!' : 'Copy Link'}
                    </button>
                    <button
                      onClick={() => deleteShare(share.id)}
                      className="p-2 text-[var(--color-destructive-500)] hover:bg-[var(--color-destructive-100)] rounded-[var(--radius-md)] transition-colors duration-[var(--duration-fast)]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Project Invitations */}
        {projectInvitations.length > 0 && (
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4">
            <h3 className="text-base font-semibold text-[var(--color-card-foreground)] mb-4">
              Active Project Invitations
            </h3>
            
            <div className="space-y-3">
              {projectInvitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between bg-[var(--color-muted)] rounded-[var(--radius-lg)] p-3">
                  <div className="flex items-center gap-3">
                    {getAccessLevelIcon(invitation.role)}
                    <div>
                      <div className="font-medium text-[var(--color-card-foreground)]">
                        {invitation.email === 'public' ? 'Public Link' : invitation.email} - {invitation.role} access
                      </div>
                      <div className="text-sm text-[var(--color-muted-foreground)] flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        Expires: {formatExpiry(invitation.expires_at)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyProjectInviteLink(invitation.token)}
                      className="px-3 py-1 text-sm bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-[var(--radius-md)] hover:bg-[var(--color-primary-600)] transition-colors duration-[var(--duration-fast)]"
                    >
                      {copiedLink === invitation.token ? 'Copied!' : 'Copy Link'}
                    </button>
                    <button
                      onClick={() => deleteProjectInvitation(invitation.id)}
                      className="p-2 text-[var(--color-destructive-500)] hover:bg-[var(--color-destructive-100)] rounded-[var(--radius-md)] transition-colors duration-[var(--duration-fast)]"
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
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4">
          <h3 className="text-base font-semibold text-[var(--color-card-foreground)] mb-4 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Invite by Email
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-muted-foreground)] mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-2 bg-[var(--color-input)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-card-foreground)] focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--color-muted-foreground)] mb-2">
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'viewer' | 'editor' | 'admin')}
                className="w-full px-3 py-2 bg-[var(--color-input)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-card-foreground)] focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={sendInvitation}
                disabled={emailSending || !inviteEmail || (shareType === 'board' && selectedBoards.length === 0)}
                className="w-full px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-[var(--radius-md)] hover:bg-[var(--color-primary-600)] disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors duration-[var(--duration-fast)] flex items-center justify-center gap-2"
              >
                {emailSending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : emailSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    Sent!
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Invite
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Current Board Members */}
        {boardMembers.length > 0 && (
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4">
            <h3 className="text-base font-semibold text-[var(--color-card-foreground)] mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" />
              {shareType === 'project' ? 'Project' : 'Board'} Members
            </h3>
            
            <div className="space-y-3">
              {boardMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between bg-[var(--color-muted)] rounded-[var(--radius-lg)] p-3">
                  <div className="flex items-center gap-3">
                    {getAccessLevelIcon(member.role)}
                    <div>
                      <div className="font-medium text-[var(--color-card-foreground)]">
                        {member.profile?.full_name || member.profile?.email || 'Unknown User'}
                      </div>
                      <div className="text-sm text-[var(--color-muted-foreground)]">
                        {member.profile?.email} • {member.role}
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