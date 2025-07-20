-- Add board_members invitation policy that was previously created directly with psql
-- This policy allows users to add themselves to boards when they have valid invitations

-- Drop the policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Users can add themselves to boards via invitation" ON board_members;

-- Create the policy to allow users to add themselves to boards via invitation
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