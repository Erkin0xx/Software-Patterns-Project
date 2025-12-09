-- Migration: Add project members functionality
-- This enables project sharing with role-based permissions

-- Create project_members table
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'editor', 'admin')),
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure a user can only be added once per project
  UNIQUE(project_id, user_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);

-- Enable RLS
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view members of projects they belong to (defined after function)
-- This will be created after the function definition to avoid circular dependencies

-- Policy: Only admins can add members
DROP POLICY IF EXISTS "Admins can add members" ON project_members;
CREATE POLICY "Admins can add members"
  ON project_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_id AND owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = project_members.project_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- Policy: Only admins can update member roles
DROP POLICY IF EXISTS "Admins can update member roles" ON project_members;
CREATE POLICY "Admins can update member roles"
  ON project_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_id AND owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'admin'
    )
  );

-- Policy: Only admins can remove members
DROP POLICY IF EXISTS "Admins can remove members" ON project_members;
CREATE POLICY "Admins can remove members"
  ON project_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_id AND owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'admin'
    )
  );

-- Update projects RLS policies to include shared projects
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can view own and shared projects" ON projects;

CREATE POLICY "Users can view own and shared projects"
  ON projects
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR
    id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Only owner and admins can update projects
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Owners and admins can update projects" ON projects;

CREATE POLICY "Owners and admins can update projects"
  ON projects
  FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = projects.id
        AND user_id = auth.uid()
        AND role IN ('admin', 'editor')
    )
  );

-- Policy: Only owner can delete projects
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
DROP POLICY IF EXISTS "Only owners can delete projects" ON projects;

CREATE POLICY "Only owners can delete projects"
  ON projects
  FOR DELETE
  USING (owner_id = auth.uid());

-- Update tasks RLS to respect project member permissions
DROP POLICY IF EXISTS "Users can view tasks in their projects" ON tasks;
DROP POLICY IF EXISTS "Users can view tasks in owned and shared projects" ON tasks;

CREATE POLICY "Users can view tasks in owned and shared projects"
  ON tasks
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert tasks in their projects" ON tasks;
DROP POLICY IF EXISTS "Editors and admins can insert tasks" ON tasks;

CREATE POLICY "Editors and admins can insert tasks"
  ON tasks
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "Users can update tasks in their projects" ON tasks;
DROP POLICY IF EXISTS "Editors and admins can update tasks" ON tasks;

CREATE POLICY "Editors and admins can update tasks"
  ON tasks
  FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "Users can delete tasks in their projects" ON tasks;
DROP POLICY IF EXISTS "Editors and admins can delete tasks" ON tasks;

CREATE POLICY "Editors and admins can delete tasks"
  ON tasks
  FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
    )
  );

-- Function to get user role in a project
CREATE OR REPLACE FUNCTION get_user_project_role(p_project_id UUID, p_user_id UUID)
RETURNS TEXT AS $$
BEGIN
  -- Check if user is owner
  IF EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND owner_id = p_user_id) THEN
    RETURN 'owner';
  END IF;

  -- Check if user is a member
  RETURN (
    SELECT role FROM project_members
    WHERE project_id = p_project_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_project_members_updated_at ON project_members;
CREATE TRIGGER update_project_members_updated_at
  BEFORE UPDATE ON project_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Now create the project_members SELECT policy using the SECURITY DEFINER function
-- This avoids circular dependency with the projects table
DROP POLICY IF EXISTS "Users can view project members" ON project_members;
CREATE POLICY "Users can view project members"
  ON project_members
  FOR SELECT
  USING (
    -- Use SECURITY DEFINER function to check role (bypasses RLS, avoids infinite recursion)
    get_user_project_role(project_id, auth.uid()) IS NOT NULL
  );
