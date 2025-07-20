-- Add missing DELETE policy for invitations table
-- This allows users to delete invitations they created or have admin access to

-- Add DELETE policy for invitations
CREATE POLICY "Users can delete invitations they created or have admin access to" ON invitations
  FOR DELETE USING (
    invited_by = auth.uid() OR
    -- Can delete if they have admin access to the resource
    (
      resource_type = 'project' AND
      EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = invitations.resource_id
        AND (
          p.owner_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin')
          )
        )
      )
    ) OR
    (
      resource_type = 'board' AND
      EXISTS (
        SELECT 1 FROM boards b
        JOIN projects p ON b.project_id = p.id
        WHERE b.id = invitations.resource_id
        AND (
          p.owner_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('owner', 'admin')
          )
        )
      )
    )
  );