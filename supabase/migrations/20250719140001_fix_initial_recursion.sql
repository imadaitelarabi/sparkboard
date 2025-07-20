-- Fix the complete circular dependency using SECURITY DEFINER functions
-- CIRCULAR DEPENDENCY: projects <-> project_members
-- Solution: Use functions that bypass RLS to break the cycle

-- STEP 1: Create SECURITY DEFINER functions that bypass RLS
CREATE OR REPLACE FUNCTION is_project_owner(project_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects 
    WHERE id = project_uuid AND owner_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_project_member(project_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_id = project_uuid AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 2: Replace the circular policies with simple ones
DROP POLICY "Users can view own or member projects" ON projects;
DROP POLICY "Users can view project members in accessible projects" ON project_members;

-- Simple projects policies - no recursion
CREATE POLICY "project_owner_access" ON projects
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "project_member_access" ON projects
  FOR SELECT USING (is_project_member(id, auth.uid()));

-- Simple project_members policies - no recursion
CREATE POLICY "member_self_view" ON project_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "owner_view_members" ON project_members
  FOR SELECT USING (is_project_owner(project_id, auth.uid()));