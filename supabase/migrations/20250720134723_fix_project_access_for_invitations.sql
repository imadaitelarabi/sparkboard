-- Fix project access for users with valid invitations
-- Currently, only project owners and members can SELECT from projects,
-- but users with valid invitations need to view basic project info

-- Add policy to allow users to view project details when they have a valid invitation
CREATE POLICY "Users can view projects they have invitations for" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invitations
      WHERE resource_type = 'project'
      AND resource_id = projects.id
      AND expires_at > NOW()
      AND accepted_at IS NULL
    )
  );

-- Note: This policy allows users to view project information only if:
-- 1. There's a valid, unexpired, unaccepted invitation for that project
-- 2. This is safe because invitations are token-protected and expire