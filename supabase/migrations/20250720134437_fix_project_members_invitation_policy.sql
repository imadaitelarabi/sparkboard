-- Fix project_members RLS policy to allow users to add themselves when accepting invitations
-- Currently, only project owners can INSERT into project_members, but invited users
-- need to be able to add themselves when accepting invitations

-- Add policy to allow users to insert themselves as project members
-- when they have a valid invitation
CREATE POLICY "Users can add themselves via invitation" ON project_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM invitations
      WHERE resource_type = 'project'
      AND resource_id = project_id
      AND role = project_members.role
      AND expires_at > NOW()
      AND accepted_at IS NULL
    )
  );

-- Note: This policy allows users to add themselves to projects only if:
-- 1. They are adding themselves (user_id = auth.uid())
-- 2. There's a valid, unexpired, unaccepted invitation for that project and role

-- Also fix board_members table to allow users to add themselves via invitation
CREATE POLICY "Users can add themselves to boards via invitation" ON board_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM invitations
      WHERE resource_type = 'board'
      AND resource_id = board_id
      AND role = board_members.role
      AND expires_at > NOW()
      AND accepted_at IS NULL
    )
  );

-- Note: This policy allows users to add themselves to boards only if:
-- 1. They are adding themselves (user_id = auth.uid())
-- 2. There's a valid, unexpired, unaccepted invitation for that board and role