-- =============================================
-- TODO PATTERNS - Database Schema
-- =============================================
-- This schema supports multi-user task management
-- with projects, tasks, subtasks, and invitations
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- STEP 1: CREATE ALL TABLES FIRST (without policies)
-- =============================================

-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PROJECT MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  invited_by UUID REFERENCES public.profiles(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(project_id, user_id)
);

-- TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- COMMAND HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.command_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- STEP 2: ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.command_history ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 3: CREATE POLICIES (now all tables exist)
-- =============================================

-- Policies for PROFILES
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for PROJECTS
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their projects"
  ON public.projects FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their projects"
  ON public.projects FOR DELETE
  USING (owner_id = auth.uid());

CREATE POLICY "Admins can view all projects"
  ON public.projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for PROJECT_MEMBERS
CREATE POLICY "Users can view project members"
  ON public.project_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can invite members"
  ON public.project_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can remove members"
  ON public.project_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND owner_id = auth.uid()
    )
  );

-- Policies for TASKS
CREATE POLICY "Users can view tasks in their projects"
  ON public.tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND (
        owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.project_members
          WHERE project_id = projects.id AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create tasks in their projects"
  ON public.tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND (
        owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.project_members
          WHERE project_id = projects.id AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can update tasks in their projects"
  ON public.tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND (
        owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.project_members
          WHERE project_id = projects.id AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can delete tasks in their projects"
  ON public.tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND (
        owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.project_members
          WHERE project_id = projects.id AND user_id = auth.uid()
        )
      )
    )
  );

-- Policies for COMMAND_HISTORY
CREATE POLICY "Users can view command history for their projects"
  ON public.command_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND (
        owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.project_members
          WHERE project_id = projects.id AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create command history"
  ON public.command_history FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- =============================================
-- STEP 4: FUNCTIONS & TRIGGERS
-- =============================================

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile automatically
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- STEP 5: INDEXES for performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON public.tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_command_history_project_id ON public.command_history(project_id);

-- =============================================
-- SUCCESS! Schema created
-- =============================================
-- Next step: Sign up in your app to create your first user
-- Then optionally run: UPDATE public.profiles SET role = 'admin' WHERE email = 'your-email@example.com';
