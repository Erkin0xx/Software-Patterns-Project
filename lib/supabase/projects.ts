/**
 * Supabase Projects API - CRUD operations for projects
 */

import { createClient } from './client';
import { Project } from '@/lib/types';
import { Task } from '@/patterns/composite/Task';
import { TaskGroup } from '@/patterns/composite/TaskGroup';

/**
 * Fetch all projects for the current user
 */
export async function fetchUserProjects(): Promise<Project[]> {
  const supabase = createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Fetch projects (RLS will filter to show owned + shared projects)
  const { data: projectsData, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (projectsError) {
    console.error('Error fetching projects:', projectsError);
    throw projectsError;
  }

  if (!projectsData || projectsData.length === 0) {
    return [];
  }

  // Fetch all tasks for these projects
  const projectIds = projectsData.map(p => p.id);
  const { data: tasksData, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .in('project_id', projectIds)
    .order('position', { ascending: true });

  if (tasksError) {
    console.error('Error fetching tasks:', tasksError);
    throw tasksError;
  }

  // Group tasks by project
  const tasksByProject = new Map<string, any[]>();
  (tasksData || []).forEach((task) => {
    if (!tasksByProject.has(task.project_id)) {
      tasksByProject.set(task.project_id, []);
    }
    tasksByProject.get(task.project_id)!.push(task);
  });

  // Convert to Project type with TaskComponent
  return projectsData.map((project: any) => {
    const projectTasks = tasksByProject.get(project.id) || [];

    // Group tasks by parent_id to build tree
    const tasksMap = new Map();
    const rootTasks: any[] = [];

    // First pass: create all task objects
    projectTasks.forEach((taskData: any) => {
      const task = taskData.parent_id
        ? new Task(taskData.id, taskData.title, taskData.completed)
        : new TaskGroup(taskData.id, taskData.title, taskData.completed, []);

      tasksMap.set(taskData.id, { task, data: taskData });

      if (!taskData.parent_id) {
        rootTasks.push({ task, data: taskData });
      }
    });

    // Second pass: build tree structure
    projectTasks.forEach((taskData: any) => {
      if (taskData.parent_id) {
        const parent = tasksMap.get(taskData.parent_id);
        const child = tasksMap.get(taskData.id);

        if (parent && child && 'addChild' in parent.task) {
          (parent.task as TaskGroup).addChild(child.task);
        }
      }
    });

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      ownerId: project.owner_id,
      tasks: rootTasks.map(({ task }) => task),
      createdAt: new Date(project.created_at),
      updatedAt: new Date(project.updated_at),
    };
  });
}

/**
 * Create a new project
 */
export async function createProject(name: string, description?: string): Promise<Project> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('projects')
    .insert({
      name,
      description,
      owner_id: user!.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating project:', error);
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    ownerId: data.owner_id,
    tasks: [],
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

/**
 * Delete a project
 */
export async function deleteProject(projectId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
}

/**
 * Update a project
 */
export async function updateProject(
  projectId: string,
  updates: { name?: string; description?: string }
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId);

  if (error) {
    console.error('Error updating project:', error);
    throw error;
  }
}
