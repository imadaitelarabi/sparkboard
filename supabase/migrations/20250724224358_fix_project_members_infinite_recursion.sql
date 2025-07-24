-- Fix infinite recursion in project_members RLS policies
-- This migration resolves the circular dependency that was causing infinite recursion

-- First, drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view project members for projects they belong to" ON project_members;
DROP POLICY IF EXISTS "Users can view profiles of project members" ON user_profiles;

-- Create clean, non-recursive RLS policies for project_members using existing functions
CREATE POLICY "Users can view project members for owned projects"
ON project_members FOR SELECT
USING (is_project_owner(project_id, auth.uid()));

CREATE POLICY "Users can view project members for projects they belong to"
ON project_members FOR SELECT
USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Project owners can manage project members"
ON project_members FOR ALL
USING (is_project_owner(project_id, auth.uid()));

-- Create a simplified policy for user_profiles that doesn't cause recursion
-- This policy allows users to view profiles of people in their projects without creating circular dependencies
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