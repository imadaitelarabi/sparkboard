-- Fix infinite recursion in board policies by breaking circular dependencies
-- Root cause: boards -> board_members -> boards and boards -> board_shares -> boards circular references

-- Step 1: Drop all problematic policies
DROP POLICY IF EXISTS "Users can view boards via project or board access" ON boards;
DROP POLICY IF EXISTS "Users can update boards they have admin access to" ON boards;
DROP POLICY IF EXISTS "Users can create boards in accessible projects" ON boards;
DROP POLICY IF EXISTS "Realtime: Users can subscribe to boards they have access to" ON elements;

-- Step 2: Fix board_members policies to avoid referencing boards table
DROP POLICY IF EXISTS "Users can view board members for accessible boards" ON board_members;
CREATE POLICY "Users can view their own board memberships" ON board_members
  FOR SELECT USING (user_id = auth.uid());

-- Step 3: Disable RLS on board_shares since public shares should be globally accessible
ALTER TABLE board_shares DISABLE ROW LEVEL SECURITY;

-- Step 4: Create simple, non-recursive board policies
CREATE POLICY "Users can create boards in accessible projects" ON boards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE id = boards.project_id AND owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_id = boards.project_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view boards via project or board access" ON boards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE id = boards.project_id AND owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_id = boards.project_id AND user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM board_members 
      WHERE board_id = boards.id AND user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM board_shares 
      WHERE board_id = boards.id AND is_public = true
      AND (expires_at IS NULL OR expires_at > NOW())
    )
  );

CREATE POLICY "Users can update boards they have admin access to" ON boards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE id = boards.project_id AND owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_id = boards.project_id AND user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM board_members 
      WHERE board_id = boards.id AND user_id = auth.uid() AND role = 'admin'
    )
  );