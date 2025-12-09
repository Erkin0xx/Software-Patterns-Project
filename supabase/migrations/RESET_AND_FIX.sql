
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;


WITH ranked_root_tasks AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) - 1 AS new_position
  FROM tasks
  WHERE parent_id IS NULL
)
UPDATE tasks
SET position = ranked_root_tasks.new_position
FROM ranked_root_tasks
WHERE tasks.id = ranked_root_tasks.id;


WITH ranked_subtasks AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY parent_id ORDER BY created_at) - 1 AS new_position
  FROM tasks
  WHERE parent_id IS NOT NULL
)
UPDATE tasks
SET position = ranked_subtasks.new_position
FROM ranked_subtasks
WHERE tasks.id = ranked_subtasks.id;

-CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(project_id, parent_id, position);

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

DROP POLICY IF EXISTS "Users can view tasks in their projects" ON tasks;
DROP POLICY IF EXISTS "Users can view tasks in owned and shared projects" ON tasks;
DROP POLICY IF EXISTS "Users can insert tasks in their projects" ON tasks;
DROP POLICY IF EXISTS "Editors and admins can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks in their projects" ON tasks;
DROP POLICY IF EXISTS "Editors and admins can update tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks in their projects" ON tasks;
DROP POLICY IF EXISTS "Editors and admins can delete tasks" ON tasks;

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


