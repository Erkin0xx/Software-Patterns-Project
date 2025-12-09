-- =============================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- =============================================
-- Run this in Supabase SQL Editor to fix the recursion issues

-- 1. DROP ALL EXISTING POLICIES FIRST
-- PROFILES policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- PROJECTS policies
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Owners can update their projects" ON public.projects;
DROP POLICY IF EXISTS "Owners can delete their projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can view all projects" ON public.projects;

-- PROJECT_MEMBERS policies
DROP POLICY IF EXISTS "Users can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Users can view their memberships" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can invite members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can remove members" ON public.project_members;

-- TASKS policies
DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks in their projects" ON public.tasks;
DROP POLICY IF EXISTS "Users can manage tasks in their projects" ON public.tasks;

-- COMMAND_HISTORY policies
DROP POLICY IF EXISTS "Users can view their command history" ON public.command_history;
DROP POLICY IF EXISTS "Users can create command history" ON public.command_history;

-- 2. RECREATE SIMPLE POLICIES (no cross-table dependencies)

-- === PROFILES ===
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- === PROJECTS ===
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their projects"
  ON public.projects FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their projects"
  ON public.projects FOR DELETE
  USING (owner_id = auth.uid());

-- === PROJECT_MEMBERS ===
CREATE POLICY "Users can view their memberships"
  ON public.project_members FOR SELECT
  USING (user_id = auth.uid());

-- === TASKS ===
CREATE POLICY "Users can view tasks in their projects"
  ON public.tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = tasks.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage tasks in their projects"
  ON public.tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = tasks.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- === COMMAND_HISTORY ===
CREATE POLICY "Users can view their command history"
  ON public.command_history FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create command history"
  ON public.command_history FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Done! Admin features and project sharing are disabled for now to avoid recursion.
