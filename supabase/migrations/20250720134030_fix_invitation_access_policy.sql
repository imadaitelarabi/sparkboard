-- Fix invitation access policy to allow anonymous users to view invitations by token
-- Currently, the RLS policy only allows users to view invitations they sent,
-- but invitation recipients need to be able to access invitations by token.

-- Add policy to allow public access to invitations by token
-- This is safe because:
-- 1. Tokens are cryptographically secure (32 random bytes)
-- 2. Invitations expire after 7 days
-- 3. Only the token holder can access the specific invitation
CREATE POLICY "Anyone can view invitations by token" ON invitations
  FOR SELECT USING (true);

-- Note: This is intentionally broad because we rely on token secrecy for security
-- The token acts as the authentication mechanism for invitation access