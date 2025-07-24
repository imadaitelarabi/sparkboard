-- Final fix for infinite recursion in project_members RLS policies
-- This migration removes the remaining recursive policy that causes infinite loops

-- Drop the problematic recursive policy that queries project_members from within project_members RLS
DROP POLICY IF EXISTS "Project members can view all members in their projects" ON project_members;

-- Drop and recreate the user_profiles policy to fix column reference issue
DROP POLICY IF EXISTS "Users can view profiles of project members" ON user_profiles;

-- Create a corrected user_profiles policy that doesn't cause recursion
CREATE POLICY "Users can view profiles of project members"
ON user_profiles FOR SELECT
USING (
  auth.uid() = id OR
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE is_project_owner(p.id, auth.uid())
    AND EXISTS (
      SELECT 1 FROM project_members pm 
      WHERE pm.project_id = p.id AND pm.user_id = user_profiles.id
    )
  ) OR
  EXISTS (
    SELECT 1 FROM project_members pm1
    JOIN project_members pm2 ON pm1.project_id = pm2.project_id
    WHERE pm1.user_id = auth.uid() AND pm2.user_id = user_profiles.id
  )
);

-- Ensure we have clean, non-recursive policies for project_members
-- (These should already exist from the previous migration, but we'll ensure they're correct)

-- Drop any potentially problematic policies and recreate them cleanly
DROP POLICY IF EXISTS "Users can view project members for owned projects" ON project_members;
DROP POLICY IF EXISTS "Users can view project members for projects they belong to" ON project_members;
DROP POLICY IF EXISTS "Project owners can manage project members" ON project_members;

-- Create final, clean policies that use SECURITY DEFINER functions
CREATE POLICY "Users can view project members for owned projects"
ON project_members FOR SELECT
USING (is_project_owner(project_id, auth.uid()));

CREATE POLICY "Users can view project members for projects they belong to"
ON project_members FOR SELECT
USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Project owners can manage project members"
ON project_members FOR ALL
USING (is_project_owner(project_id, auth.uid()));