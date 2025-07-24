-- Fix project_members RLS to allow project members to see other members for assignment functionality
-- This addresses the issue where getProjectMembersForAssignment returns empty array

-- Add a new policy that allows project members to see all members in the same project
CREATE POLICY "Project members can view all members in their projects" ON project_members
  FOR SELECT USING (
    -- User is a member of the same project
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
    )
  );