-- Fix user_profiles RLS to allow project members to see each other's profiles
-- This addresses the issue where the user_profiles query returns empty arrays
-- because users can only see their own profiles, not other project members' profiles

-- Add a new policy to allow project members to view profiles of other members in shared projects
CREATE POLICY "Project members can view profiles of other project members" ON user_profiles
  FOR SELECT USING (
    -- Users can always see their own profile
    auth.uid() = user_id
    OR
    -- Users can see profiles of other members in projects they share
    EXISTS (
      SELECT 1 FROM project_members pm1
      WHERE pm1.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM project_members pm2
        WHERE pm2.project_id = pm1.project_id
        AND pm2.user_id = user_profiles.user_id
      )
    )
  );

-- Drop the old restrictive policy since it's replaced by the new comprehensive one
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;