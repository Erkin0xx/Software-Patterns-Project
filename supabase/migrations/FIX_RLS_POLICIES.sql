-- ========================================
-- FIX RLS POLICIES - SCRIPT COMPLET
-- Exécutez ce script dans le SQL Editor de Supabase
-- ========================================

-- 1. SUPPRIMER TOUTES LES POLITIQUES EXISTANTES SUR LA TABLE TASKS
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'tasks') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON tasks';
    END LOOP;
END $$;

-- 2. VÉRIFIER QUE LA COLONNE POSITION EXISTE
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'position'
    ) THEN
        ALTER TABLE tasks ADD COLUMN position INTEGER DEFAULT 0;
        RAISE NOTICE 'Colonne position ajoutée';
    ELSE
        RAISE NOTICE 'Colonne position existe déjà';
    END IF;
END $$;

-- 3. CRÉER LES NOUVELLES POLITIQUES RLS SIMPLIFIÉES

-- SELECT: Tout le monde peut voir les tâches des projets où ils sont membres ou propriétaires
CREATE POLICY "allow_select_tasks"
ON tasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = tasks.project_id
    AND projects.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = tasks.project_id
    AND project_members.user_id = auth.uid()
  )
);

-- INSERT: Les propriétaires, admins et editors peuvent ajouter des tâches
CREATE POLICY "allow_insert_tasks"
ON tasks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = tasks.project_id
    AND projects.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = tasks.project_id
    AND project_members.user_id = auth.uid()
    AND project_members.role IN ('admin', 'editor')
  )
);

-- UPDATE: Les propriétaires, admins et editors peuvent modifier des tâches
CREATE POLICY "allow_update_tasks"
ON tasks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = tasks.project_id
    AND projects.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = tasks.project_id
    AND project_members.user_id = auth.uid()
    AND project_members.role IN ('admin', 'editor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = tasks.project_id
    AND projects.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = tasks.project_id
    AND project_members.user_id = auth.uid()
    AND project_members.role IN ('admin', 'editor')
  )
);

-- DELETE: Les propriétaires, admins et editors peuvent supprimer des tâches
CREATE POLICY "allow_delete_tasks"
ON tasks
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = tasks.project_id
    AND projects.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = tasks.project_id
    AND project_members.user_id = auth.uid()
    AND project_members.role IN ('admin', 'editor')
  )
);

-- 4. INITIALISER LES POSITIONS SI NÉCESSAIRE
UPDATE tasks SET position = 0 WHERE position IS NULL;

-- 5. VÉRIFICATION FINALE
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VÉRIFICATION:';
    RAISE NOTICE 'Nombre de politiques créées: %', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'tasks');
    RAISE NOTICE 'Colonne position existe: %', (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'position'));
    RAISE NOTICE '========================================';
END $$;
