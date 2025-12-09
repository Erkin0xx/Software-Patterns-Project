-- Migration: Add position column to tasks table for drag and drop ordering

-- Add position column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Initialize positions for existing tasks
-- Root tasks (tasks without parent_id)
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

-- Subtasks (tasks with parent_id)
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

-- Create index for faster ordering queries
CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(project_id, parent_id, position);
