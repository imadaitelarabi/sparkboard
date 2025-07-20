-- Update RLS policies to support board-level sharing and realtime access

-- Drop existing board policies to replace them
DROP POLICY IF EXISTS "Users can view boards in accessible projects" ON boards;
DROP POLICY IF EXISTS "Users can create boards in accessible projects" ON boards;
DROP POLICY IF EXISTS "Users can update boards in accessible projects" ON boards;

-- Drop existing element policies to replace them  
DROP POLICY IF EXISTS "Users can view elements in accessible boards" ON elements;
DROP POLICY IF EXISTS "Users can create elements in accessible boards" ON elements;
DROP POLICY IF EXISTS "Users can update elements in accessible boards" ON elements;
DROP POLICY IF EXISTS "Users can delete elements in accessible boards" ON elements;

-- New board policies with sharing support
CREATE POLICY "Users can view boards via project or board access" ON boards
  FOR SELECT USING (
    -- Original project-based access
    EXISTS (
      SELECT 1 FROM projects 
      WHERE id = boards.project_id AND (
        owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM project_members 
          WHERE project_id = projects.id AND user_id = auth.uid()
        )
      )
    )
    OR
    -- New: Board-level access via board_members
    EXISTS (
      SELECT 1 FROM board_members 
      WHERE board_id = boards.id AND user_id = auth.uid()
    )
    OR
    -- New: Public board access via board_shares
    EXISTS (
      SELECT 1 FROM board_shares 
      WHERE board_id = boards.id AND is_public = true
      AND (expires_at IS NULL OR expires_at > NOW())
    )
  );

CREATE POLICY "Users can create boards in accessible projects" ON boards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE id = boards.project_id AND (
        owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM project_members 
          WHERE project_id = projects.id AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can update boards they have admin access to" ON boards
  FOR UPDATE USING (
    -- Project-based admin access
    EXISTS (
      SELECT 1 FROM projects 
      WHERE id = boards.project_id AND (
        owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM project_members 
          WHERE project_id = projects.id AND user_id = auth.uid() AND role IN ('owner', 'admin')
        )
      )
    )
    OR
    -- Board-level admin access
    EXISTS (
      SELECT 1 FROM board_members 
      WHERE board_id = boards.id AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- New element policies with sharing and realtime support
CREATE POLICY "Users can view elements via board access" ON elements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = elements.board_id AND (
        -- Project-based access
        EXISTS (
          SELECT 1 FROM projects p
          WHERE p.id = b.project_id AND (
            p.owner_id = auth.uid() OR 
            EXISTS (
              SELECT 1 FROM project_members pm
              WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
            )
          )
        )
        OR
        -- Board-level access via board_members
        EXISTS (
          SELECT 1 FROM board_members bm
          WHERE bm.board_id = b.id AND bm.user_id = auth.uid()
        )
        OR
        -- Public board access via board_shares
        EXISTS (
          SELECT 1 FROM board_shares bs
          WHERE bs.board_id = b.id AND bs.is_public = true
          AND (bs.expires_at IS NULL OR bs.expires_at > NOW())
        )
      )
    )
  );

CREATE POLICY "Users can create elements in editable boards" ON elements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = elements.board_id AND (
        -- Project-based access (all members can create)
        EXISTS (
          SELECT 1 FROM projects p
          WHERE p.id = b.project_id AND (
            p.owner_id = auth.uid() OR 
            EXISTS (
              SELECT 1 FROM project_members pm
              WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
            )
          )
        )
        OR
        -- Board-level edit access
        EXISTS (
          SELECT 1 FROM board_members bm
          WHERE bm.board_id = b.id AND bm.user_id = auth.uid() AND bm.role IN ('editor', 'admin')
        )
        OR
        -- Public board with edit access
        EXISTS (
          SELECT 1 FROM board_shares bs
          WHERE bs.board_id = b.id AND bs.is_public = true 
          AND bs.access_level IN ('edit', 'admin')
          AND (bs.expires_at IS NULL OR bs.expires_at > NOW())
        )
      )
    )
  );

CREATE POLICY "Users can update elements in editable boards" ON elements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = elements.board_id AND (
        -- Project-based access (all members can edit)
        EXISTS (
          SELECT 1 FROM projects p
          WHERE p.id = b.project_id AND (
            p.owner_id = auth.uid() OR 
            EXISTS (
              SELECT 1 FROM project_members pm
              WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
            )
          )
        )
        OR
        -- Board-level edit access
        EXISTS (
          SELECT 1 FROM board_members bm
          WHERE bm.board_id = b.id AND bm.user_id = auth.uid() AND bm.role IN ('editor', 'admin')
        )
        OR
        -- Public board with edit access
        EXISTS (
          SELECT 1 FROM board_shares bs
          WHERE bs.board_id = b.id AND bs.is_public = true 
          AND bs.access_level IN ('edit', 'admin')
          AND (bs.expires_at IS NULL OR bs.expires_at > NOW())
        )
      )
    )
  );

CREATE POLICY "Users can delete elements in editable boards" ON elements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = elements.board_id AND (
        -- Project-based access (all members can delete)
        EXISTS (
          SELECT 1 FROM projects p
          WHERE p.id = b.project_id AND (
            p.owner_id = auth.uid() OR 
            EXISTS (
              SELECT 1 FROM project_members pm
              WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
            )
          )
        )
        OR
        -- Board-level edit access
        EXISTS (
          SELECT 1 FROM board_members bm
          WHERE bm.board_id = b.id AND bm.user_id = auth.uid() AND bm.role IN ('editor', 'admin')
        )
        OR
        -- Public board with edit access
        EXISTS (
          SELECT 1 FROM board_shares bs
          WHERE bs.board_id = b.id AND bs.is_public = true 
          AND bs.access_level IN ('edit', 'admin')
          AND (bs.expires_at IS NULL OR bs.expires_at > NOW())
        )
      )
    )
  );

-- Create realtime-specific policies for elements table
CREATE POLICY "Realtime: Users can subscribe to boards they have access to" ON elements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = elements.board_id AND (
        -- Project-based access
        EXISTS (
          SELECT 1 FROM projects p
          WHERE p.id = b.project_id AND (
            p.owner_id = auth.uid() OR 
            EXISTS (
              SELECT 1 FROM project_members pm
              WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
            )
          )
        )
        OR
        -- Board-level access
        EXISTS (
          SELECT 1 FROM board_members bm
          WHERE bm.board_id = b.id AND bm.user_id = auth.uid()
        )
        OR
        -- Public board access
        EXISTS (
          SELECT 1 FROM board_shares bs
          WHERE bs.board_id = b.id AND bs.is_public = true
          AND (bs.expires_at IS NULL OR bs.expires_at > NOW())
        )
      )
    )
  );

-- Create helper function to check if user can access board (useful for realtime)
CREATE OR REPLACE FUNCTION user_has_board_access(board_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM boards b
    WHERE b.id = board_uuid AND (
      -- Project-based access
      EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = b.project_id AND (
          p.owner_id = user_uuid OR 
          EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = p.id AND pm.user_id = user_uuid
          )
        )
      )
      OR
      -- Board-level access
      EXISTS (
        SELECT 1 FROM board_members bm
        WHERE bm.board_id = b.id AND bm.user_id = user_uuid
      )
      OR
      -- Public board access (when user_uuid is provided, check for authenticated access)
      (user_uuid IS NULL AND EXISTS (
        SELECT 1 FROM board_shares bs
        WHERE bs.board_id = b.id AND bs.is_public = true
        AND (bs.expires_at IS NULL OR bs.expires_at > NOW())
      ))
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check edit permissions
CREATE OR REPLACE FUNCTION user_can_edit_board(board_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM boards b
    WHERE b.id = board_uuid AND (
      -- Project-based access (all members can edit)
      EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = b.project_id AND (
          p.owner_id = user_uuid OR 
          EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = p.id AND pm.user_id = user_uuid
          )
        )
      )
      OR
      -- Board-level edit access
      EXISTS (
        SELECT 1 FROM board_members bm
        WHERE bm.board_id = b.id AND bm.user_id = user_uuid AND bm.role IN ('editor', 'admin')
      )
      OR
      -- Public board with edit access
      EXISTS (
        SELECT 1 FROM board_shares bs
        WHERE bs.board_id = b.id AND bs.is_public = true 
        AND bs.access_level IN ('edit', 'admin')
        AND (bs.expires_at IS NULL OR bs.expires_at > NOW())
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;