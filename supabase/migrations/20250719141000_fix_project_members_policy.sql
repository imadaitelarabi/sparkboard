-- Fix infinite recursion in project_members RLS policy
-- The issue was the SELECT policy was checking project_members table within itself

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view project members in accessible projects" ON project_members;

-- Create a simpler policy that avoids the recursion
-- Users can see project members if they are either:
-- 1. The project owner
-- 2. A member of that project (check user_id directly)
CREATE POLICY "Users can view project members in accessible projects" ON project_members
  FOR SELECT USING (
    -- User is the project owner
    EXISTS (
      SELECT 1 FROM projects 
      WHERE id = project_members.project_id AND owner_id = auth.uid()
    )
    OR
    -- User is a member of this project (check user_id directly)
    user_id = auth.uid()
  );