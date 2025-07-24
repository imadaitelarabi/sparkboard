'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Users, Mail, Trash2, Crown, Shield, User as UserIcon, Plus } from 'lucide-react'
import Modal from './Modal'
import { createClient } from '@/lib/supabase'
import { useAppStore } from '@/store'
import { Database } from '@/types/database.types'
import { useToast } from '@/hooks/useToast'
// Import only what's actually used - keeping the import for future use
// import { getProjectMembers, removeProjectMember, updateProjectMemberRole, inviteUserToProject, getUserProjectRole } from '@/utils/projectMembers'

type Tables = Database['public']['Tables']
type ProjectMember = Tables['project_members']['Row']

interface ProjectMemberWithProfile extends ProjectMember {
  user_profiles?: {
    full_name: string | null
    email: string | null
  } | null
}

interface ProjectMembersModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ProjectMembersModal({ isOpen, onClose }: ProjectMembersModalProps) {
  const supabase = createClient()
  const { success, error: showError } = useToast()
  const { currentProject, user } = useAppStore()
  
  const [loading, setLoading] = useState(false)
  const [members, setMembers] = useState<ProjectMemberWithProfile[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member')
  const [inviting, setInviting] = useState(false)

  const loadMembers = useCallback(async () => {
    if (!currentProject) return

    setLoading(true)
    try {
      // First get project members
      const { data: members, error: membersError } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('created_at', { ascending: true })

      if (membersError) throw membersError
      if (!members || members.length === 0) {
        setMembers([])
        return
      }

      // Then get user profiles for those members
      const userIds = members.map(m => m.user_id)
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds)

      if (profilesError) throw profilesError

      // Combine the data
      const profileMap = new Map()
      profiles?.forEach(profile => profileMap.set(profile.user_id, profile))

      const membersWithProfiles = members.map(member => ({
        ...member,
        user_profiles: profileMap.get(member.user_id) || null
      }))

      setMembers(membersWithProfiles)
    } catch (error) {
      console.error('Error loading project members:', error)
      showError('Failed to load project members')
    } finally {
      setLoading(false)
    }
  }, [currentProject, supabase, showError])

  useEffect(() => {
    if (isOpen && currentProject) {
      loadMembers()
    }
  }, [isOpen, currentProject, loadMembers])

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentProject || !user || !inviteEmail.trim()) return

    setInviting(true)
    try {
      // Create invitation
      const { error } = await supabase
        .from('invitations')
        .insert({
          email: inviteEmail.trim().toLowerCase(),
          resource_type: 'project',
          resource_id: currentProject.id,
          role: inviteRole,
          invited_by: (user as { id: string }).id
        })
        .select()
        .single()

      if (error) throw error

      success(`Invitation sent to ${inviteEmail}`)
      setInviteEmail('')
      setInviteRole('member')
    } catch (error: unknown) {
      console.error('Error inviting member:', error)
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        showError('User is already invited or a member of this project')
      } else {
        showError('Failed to send invitation')
      }
    } finally {
      setInviting(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!currentProject || !user) return

    const member = members.find(m => m.id === memberId)
    if (!member) return

    // Prevent removing the project owner
    if (member.role === 'owner') {
      showError('Cannot remove the project owner')
      return
    }

    // Prevent non-owners from removing other members
    const currentUserMember = members.find(m => m.user_id === (user as { id: string }).id)
    if (currentUserMember?.role !== 'owner') {
      showError('Only project owners can remove members')
      return
    }

    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      success('Member removed from project')
      loadMembers()
    } catch (error) {
      console.error('Error removing member:', error)
      showError('Failed to remove member')
    }
  }

  const handleChangeRole = async (memberId: string, newRole: 'member' | 'admin') => {
    if (!currentProject || !user) return

    const member = members.find(m => m.id === memberId)
    if (!member) return

    // Prevent changing the project owner's role
    if (member.role === 'owner') {
      showError('Cannot change the project owner\'s role')
      return
    }

    // Prevent non-owners from changing roles
    const currentUserMember = members.find(m => m.user_id === (user as { id: string }).id)
    if (currentUserMember?.role !== 'owner') {
      showError('Only project owners can change member roles')
      return
    }

    try {
      const { error } = await supabase
        .from('project_members')
        .update({ role: newRole })
        .eq('id', memberId)

      if (error) throw error

      success('Member role updated')
      loadMembers()
    } catch (error) {
      console.error('Error changing member role:', error)
      showError('Failed to update member role')
    }
  }

  const getRoleIcon = (role: string | null) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />
      default:
        return <UserIcon className="h-4 w-4 text-[var(--color-muted-foreground)]" />
    }
  }

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'owner':
        return 'Owner'
      case 'admin':
        return 'Admin'
      default:
        return 'Member'
    }
  }

  const canManageMembers = () => {
    if (!user) return false
    const currentUserMember = members.find(m => m.user_id === (user as { id: string }).id)
    return currentUserMember?.role === 'owner'
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Project Members"
      size="md"
    >
      <div className="p-6">
        {/* Invite New Member Section */}
        {canManageMembers() && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-[var(--color-card-foreground)] mb-3 flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Invite New Member
            </h3>
            <form onSubmit={handleInviteMember} className="space-y-3">
              <div>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email address..."
                  className="w-full px-3 py-2 bg-[var(--color-input)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent text-sm"
                  disabled={inviting}
                  required
                />
              </div>
              <div className="flex gap-3">
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
                  className="px-3 py-2 bg-[var(--color-input)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--color-ring)] focus:border-transparent text-sm"
                  disabled={inviting}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail.trim()}
                  className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-[var(--radius-md)] hover:bg-[var(--color-primary-600)] transition-colors duration-[var(--duration-fast)] disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {inviting ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Members List */}
        <div>
          <h3 className="text-sm font-medium text-[var(--color-card-foreground)] mb-3 flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Current Members ({members.length})
          </h3>
          
          {loading ? (
            <div className="text-center py-8 text-[var(--color-muted-foreground)]">
              Loading members...
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-muted-foreground)]">
              No members found
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-[var(--color-accent)] rounded-[var(--radius-md)]"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-[var(--color-primary-foreground)] text-sm font-medium">
                      {(member.user_profiles?.full_name || member.user_profiles?.email || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-[var(--color-card-foreground)]">
                        {member.user_profiles?.full_name || 'Unknown User'}
                      </div>
                      <div className="text-sm text-[var(--color-muted-foreground)]">
                        {member.user_profiles?.email}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* Role Badge */}
                    <div className="flex items-center space-x-1 px-2 py-1 bg-[var(--color-background)] rounded-[var(--radius-sm)] border border-[var(--color-border)]">
                      {getRoleIcon(member.role)}
                      <span className="text-xs font-medium">
                        {getRoleLabel(member.role)}
                      </span>
                    </div>
                    
                    {/* Actions */}
                    {canManageMembers() && member.role !== 'owner' && (
                      <div className="flex items-center space-x-1">
                        {/* Role Change Dropdown */}
                        <select
                          value={member.role || 'member'}
                          onChange={(e) => handleChangeRole(member.id, e.target.value as 'member' | 'admin')}
                          className="text-xs px-2 py-1 bg-[var(--color-input)] border border-[var(--color-border)] rounded-[var(--radius-sm)] focus:ring-1 focus:ring-[var(--color-ring)] focus:border-transparent"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                        
                        {/* Remove Button */}
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-1 text-[var(--color-destructive)] hover:bg-[var(--color-destructive)] hover:text-[var(--color-destructive-foreground)] rounded-[var(--radius-sm)] transition-colors duration-[var(--duration-fast)]"
                          title="Remove member"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t border-[var(--color-border)] mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-[var(--radius-md)] hover:bg-[var(--color-primary-600)] transition-colors duration-[var(--duration-fast)] font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}