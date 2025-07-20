-- Create board sharing tables for public/private sharing and permissions

-- Board-level sharing with public links and tokens
CREATE TABLE board_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_level TEXT NOT NULL CHECK (access_level IN ('view', 'edit', 'admin')),
  share_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'base64url'),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_public BOOLEAN DEFAULT false,
  password_hash TEXT, -- Optional password protection
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User-specific board access (invited users)
CREATE TABLE board_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'editor', 'admin')),
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(board_id, user_id)
);

-- Invitation tracking for email-based invitations
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('project', 'board')),
  resource_id UUID NOT NULL,
  role TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'base64url'),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_board_shares_board_id ON board_shares(board_id);
CREATE INDEX idx_board_shares_token ON board_shares(share_token);
CREATE INDEX idx_board_shares_public ON board_shares(is_public) WHERE is_public = true;
CREATE INDEX idx_board_members_board_id ON board_members(board_id);
CREATE INDEX idx_board_members_user_id ON board_members(user_id);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_resource ON invitations(resource_type, resource_id);

-- Enable RLS on new tables
ALTER TABLE board_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for board_shares
CREATE POLICY "Users can view shares for boards they have access to" ON board_shares
  FOR SELECT USING (
    -- Can view if they have project access
    EXISTS (
      SELECT 1 FROM boards b
      JOIN projects p ON b.project_id = p.id
      WHERE b.id = board_shares.board_id
      AND (
        p.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        )
      )
    )
    OR
    -- Can view if they have board member access
    EXISTS (
      SELECT 1 FROM board_members bm
      WHERE bm.board_id = board_shares.board_id AND bm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create shares for boards they admin" ON board_shares
  FOR INSERT WITH CHECK (
    -- Can create if they have project access (owner or admin)
    EXISTS (
      SELECT 1 FROM boards b
      JOIN projects p ON b.project_id = p.id
      WHERE b.id = board_id
      AND (
        p.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin')
        )
      )
    )
    OR
    -- Can create if they are board admin
    EXISTS (
      SELECT 1 FROM board_members bm
      WHERE bm.board_id = board_shares.board_id AND bm.user_id = auth.uid() AND bm.role = 'admin'
    )
  );

CREATE POLICY "Users can update shares they created or admin" ON board_shares
  FOR UPDATE USING (
    shared_by = auth.uid() OR
    -- Can update if they have admin access to the board
    EXISTS (
      SELECT 1 FROM boards b
      JOIN projects p ON b.project_id = p.id
      WHERE b.id = board_id
      AND (
        p.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin')
        )
      )
    )
  );

CREATE POLICY "Users can delete shares they created or admin" ON board_shares
  FOR DELETE USING (
    shared_by = auth.uid() OR
    -- Can delete if they have admin access to the board
    EXISTS (
      SELECT 1 FROM boards b
      JOIN projects p ON b.project_id = p.id
      WHERE b.id = board_id
      AND (
        p.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin')
        )
      )
    )
  );

-- RLS Policies for board_members
CREATE POLICY "Users can view board members for accessible boards" ON board_members
  FOR SELECT USING (
    -- Can view if they have project access
    EXISTS (
      SELECT 1 FROM boards b
      JOIN projects p ON b.project_id = p.id
      WHERE b.id = board_members.board_id
      AND (
        p.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        )
      )
    )
    OR
    -- Can view if they are the user being referenced
    user_id = auth.uid()
  );

CREATE POLICY "Users can create board members for boards they admin" ON board_members
  FOR INSERT WITH CHECK (
    -- Can create if they have project admin access
    EXISTS (
      SELECT 1 FROM boards b
      JOIN projects p ON b.project_id = p.id
      WHERE b.id = board_id
      AND (
        p.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin')
        )
      )
    )
  );

-- RLS Policies for invitations
CREATE POLICY "Users can view invitations they sent" ON invitations
  FOR SELECT USING (invited_by = auth.uid());

CREATE POLICY "Users can create invitations for resources they admin" ON invitations
  FOR INSERT WITH CHECK (invited_by = auth.uid());

-- Function to automatically clean up expired shares and invitations
CREATE OR REPLACE FUNCTION cleanup_expired_shares()
RETURNS void AS $$
BEGIN
  -- Remove expired board shares
  DELETE FROM board_shares 
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  
  -- Remove expired invitations
  DELETE FROM invitations 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_board_shares_updated_at
  BEFORE UPDATE ON board_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_board_members_updated_at
  BEFORE UPDATE ON board_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();