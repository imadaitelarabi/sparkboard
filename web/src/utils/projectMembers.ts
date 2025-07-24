import { createClient } from '@/lib/supabase'
import { Database } from '@/types/database.types'

type Tables = Database['public']['Tables']
type ProjectMember = Tables['project_members']['Row']

interface ProjectMemberWithProfile extends ProjectMember {
  user_profiles?: {
    full_name: string | null
    email: string | null
  } | null
}

/**
 * Get all members of a project with their profiles
 */
export async function getProjectMembers(projectId: string): Promise<ProjectMemberWithProfile[]> {
  const supabase = createClient()

  try {
    // First get project members
    const { data: members, error: membersError } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (membersError) throw membersError
    if (!members || members.length === 0) return []

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

    return members.map(member => ({
      ...member,
      user_profiles: profileMap.get(member.user_id) || null
    }))
  } catch (error) {
    console.error('Error fetching project members:', error)
    return []
  }
}

/**
 * Get project members in a format suitable for task assignment dropdowns
 */
export async function getProjectMembersForAssignment(
  projectId: string, 
  currentUserId?: string,
  currentUserEmail?: string
): Promise<Array<{ id: string; full_name: string }>> {
  const supabase = createClient()

  try {
    // Get project members
    const { data: members, error: membersError } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', projectId)

    if (membersError) throw membersError
    if (!members || members.length === 0) return []

    // Get user profiles for display names
    const userIds = members.map(m => m.user_id)
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, email')
      .in('user_id', userIds)

    if (profilesError) throw profilesError

    // Create a simple map of profiles
    const profileMap = new Map()
    profiles?.forEach(profile => profileMap.set(profile.user_id, profile))

    // Create result with simple logic
    const result = userIds.map(userId => {
      const profile = profileMap.get(userId)
      const isCurrentUser = currentUserId && userId === currentUserId
      
      // Simple priority: profile full_name -> profile email -> current user email -> "Project Member"
      let displayName = 'Project Member'
      
      if (profile?.full_name?.trim()) {
        displayName = profile.full_name.trim()
      } else if (profile?.email) {
        displayName = profile.email
      } else if (isCurrentUser && currentUserEmail) {
        displayName = currentUserEmail
      }
      
      return {
        id: userId,
        full_name: displayName
      }
    })

    return result.sort((a, b) => a.full_name.localeCompare(b.full_name))
  } catch (error) {
    console.error('Error fetching project members for assignment:', error)
    return []
  }
}

/**
 * Check if a user is a member of a project and return their role
 */
export async function getUserProjectRole(projectId: string, userId: string): Promise<string | null> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single()

    if (error) throw error
    return data?.role || null
  } catch (error) {
    console.error('Error fetching user project role:', error)
    return null
  }
}

/**
 * Add a user to a project
 */
export async function addProjectMember(
  projectId: string, 
  userId: string, 
  role: 'member' | 'admin' = 'member'
): Promise<boolean> {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: userId,
        role
      })

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error adding project member:', error)
    return false
  }
}

/**
 * Remove a user from a project
 */
export async function removeProjectMember(memberId: string): Promise<boolean> {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('id', memberId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error removing project member:', error)
    return false
  }
}

/**
 * Update a project member's role
 */
export async function updateProjectMemberRole(
  memberId: string, 
  newRole: 'member' | 'admin'
): Promise<boolean> {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('project_members')
      .update({ role: newRole })
      .eq('id', memberId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error updating project member role:', error)
    return false
  }
}

/**
 * Send an invitation to join a project
 */
export async function inviteUserToProject(
  projectId: string,
  email: string,
  role: 'member' | 'admin',
  invitedBy: string
): Promise<boolean> {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('invitations')
      .insert({
        email: email.toLowerCase().trim(),
        resource_type: 'project',
        resource_id: projectId,
        role,
        invited_by: invitedBy
      })

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error sending project invitation:', error)
    return false
  }
}

/**
 * Check if user can manage members (is owner or admin)
 */
export async function canManageProjectMembers(projectId: string, userId: string): Promise<boolean> {
  const role = await getUserProjectRole(projectId, userId)
  return role === 'owner' || role === 'admin'
}

/**
 * Get the member count for a project
 */
export async function getProjectMemberCount(projectId: string): Promise<number> {
  const supabase = createClient()

  try {
    const { count, error } = await supabase
      .from('project_members')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)

    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('Error fetching project member count:', error)
    return 0
  }
}