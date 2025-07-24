-- Ensure all project owners are also members in project_members table
-- This migration adds project owners as members if they're not already present

-- Insert project owners as members for their own projects where they're missing
INSERT INTO project_members (project_id, user_id, role, created_at)
SELECT 
  p.id as project_id,
  p.owner_id as user_id,
  'owner' as role,
  NOW() as created_at
FROM projects p
LEFT JOIN project_members pm ON p.id = pm.project_id AND p.owner_id = pm.user_id
WHERE pm.user_id IS NULL -- Only insert where the owner is not already a member
  AND p.owner_id IS NOT NULL; -- Ensure we have a valid owner_id

-- Update existing project owner memberships to ensure they have 'owner' role
UPDATE project_members 
SET role = 'owner'
WHERE (project_id, user_id) IN (
  SELECT p.id, p.owner_id 
  FROM projects p
  WHERE p.owner_id IS NOT NULL
)
AND role != 'owner';