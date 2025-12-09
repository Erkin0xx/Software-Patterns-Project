-- ========================================
-- SCRIPT DE CORRECTION COMPLET
-- Exécutez ce script dans le SQL Editor de Supabase
-- ========================================

-- 1. Ajouter la colonne position si elle n'existe pas
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- 2. Initialiser les positions pour les tâches existantes
-- Root tasks (sans parent_id)
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

-- Subtasks (avec parent_id)
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

-- 3. Créer l'index pour les performances
CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(project_id, parent_id, position);

-- 4. Vérifier et recréer la fonction get_user_project_role si nécessaire
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

-- 5. Recréer les politiques RLS pour les tâches
-- DELETE les anciennes politiques
DROP POLICY IF EXISTS "Users can view tasks in their projects" ON tasks;
DROP POLICY IF EXISTS "Users can view tasks in owned and shared projects" ON tasks;
DROP POLICY IF EXISTS "Users can insert tasks in their projects" ON tasks;
DROP POLICY IF EXISTS "Editors and admins can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks in their projects" ON tasks;
DROP POLICY IF EXISTS "Editors and admins can update tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks in their projects" ON tasks;
DROP POLICY IF EXISTS "Editors and admins can delete tasks" ON tasks;

-- Politique SELECT - Permet de voir les tâches des projets possédés ou partagés
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

-- Politique INSERT - Permet d'insérer des tâches si owner ou editor/admin
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

-- Politique UPDATE - Permet de modifier des tâches si owner ou editor/admin
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

-- Politique DELETE - Permet de supprimer des tâches si owner ou editor/admin
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

-- ========================================
-- FIN DU SCRIPT
-- ========================================
-- Après avoir exécuté ce script:
-- 1. Rafraîchissez votre application (F5)
-- 2. Le drag and drop devrait fonctionner
-- 3. Vous devriez pouvoir supprimer les tâches
-- ========================================

