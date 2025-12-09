DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Owners can update their projects" ON public.projects;
DROP POLICY IF EXISTS "Owners can delete their projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can view all projects" ON public.projects;

DROP POLICY IF EXISTS "Users can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Users can view their memberships" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can invite members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can remove members" ON public.project_members;

DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks in their projects" ON public.tasks;
DROP POLICY IF EXISTS "Users can manage tasks in their projects" ON public.tasks;

DROP POLICY IF EXISTS "Users can view their command history" ON public.command_history;
DROP POLICY IF EXISTS "Users can create command history" ON public.command_history;


CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

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

CREATE POLICY "Users can view their memberships"
  ON public.project_members FOR SELECT
  USING (user_id = auth.uid());

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

CREATE POLICY "Users can view their command history"
  ON public.command_history FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create command history"
  ON public.command_history FOR INSERT
  WITH CHECK (user_id = auth.uid());

