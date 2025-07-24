-- Add missing project members access for task assignment functionality
-- This migration adds the database objects that exist locally but are missing in production

-- Create a SECURITY DEFINER function to get user's project memberships safely
-- This function bypasses RLS to get the user's own project memberships without recursion
CREATE OR REPLACE FUNCTION get_user_project_memberships(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(project_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT pm.project_id 
  FROM project_members pm
  WHERE pm.user_id = user_uuid;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_project_memberships TO authenticated;

-- Add policy that allows project members to view other members in their shared projects
-- This is needed for the CreateTaskModal assignment dropdown to work

DROP POLICY IF EXISTS "Members can view all project members" ON project_members;
CREATE POLICY "Members can view all project members"
ON project_members FOR SELECT
USING (
  project_id IN (
    SELECT project_id FROM get_user_project_memberships(auth.uid())
  )
);

-- Ensure user_profiles can be viewed by project members for assignment purposes
-- This policy was likely working locally but missing the proper structure in production
DROP POLICY IF EXISTS "Users can view profiles of project members" ON user_profiles;

CREATE POLICY "Users can view profiles of project members"
ON user_profiles FOR SELECT
USING (
  auth.uid() = id OR
  -- Allow viewing profiles of users in projects you own
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE is_project_owner(p.id, auth.uid())
    AND EXISTS (
      SELECT 1 FROM get_user_project_memberships(user_profiles.id)
      WHERE project_id = p.id
    )
  ) OR
  -- Allow viewing profiles of users in projects you're a member of
  EXISTS (
    SELECT 1 FROM get_user_project_memberships(auth.uid()) gump1
    JOIN get_user_project_memberships(user_profiles.id) gump2
    ON gump1.project_id = gump2.project_id
  )
);