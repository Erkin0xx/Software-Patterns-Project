// Supabase Tasks API - CRUD operations for tasks

import { createClient } from './client';
import { Project } from '@/lib/types';
import { Task } from '@/patterns/composite/Task';
import { TaskGroup } from '@/patterns/composite/TaskGroup';
import { TaskComponent } from '@/patterns/composite/TaskComponent';

// Fetch project with all tasks, building Composite pattern tree structure
export async function fetchProject(projectId: string): Promise<Project | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      tasks (*)
    `)
    .eq('id', projectId)
    .single();

  if (error) {
    console.error('Error fetching project:', error);
    return null;
  }

  // Build task tree from flat database structure
  const tasksMap = new Map();
  const rootTasks: any[] = [];

  // First pass: create Task or TaskGroup instances
  data.tasks.forEach((taskData: any) => {
    const task = taskData.parent_id
      ? new Task(taskData.id, taskData.title, taskData.completed)
      : new TaskGroup(taskData.id, taskData.title, taskData.completed, []);

    tasksMap.set(taskData.id, { task, data: taskData });

    if (!taskData.parent_id) {
      rootTasks.push({ task, data: taskData });
    }
  });

  // Second pass: build parent-child relationships
  data.tasks.forEach((taskData: any) => {
    if (taskData.parent_id) {
      const parent = tasksMap.get(taskData.parent_id);
      const child = tasksMap.get(taskData.id);

      if (parent && child && 'addChild' in parent.task) {
        (parent.task as TaskGroup).addChild(child.task);
      }
    }
  });

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    ownerId: data.owner_id,
    tasks: rootTasks.map(({ task }) => task),
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

// Create task - returns Task for subtasks, TaskGroup for root tasks
export async function createTask(
  projectId: string,
  title: string,
  parentId?: string
): Promise<TaskComponent> {
  const supabase = createClient();

  // Calculate next position for ordering
  let query = supabase
    .from('tasks')
    .select('position')
    .eq('project_id', projectId);

  if (parentId) {
    query = query.eq('parent_id', parentId);
  } else {
    query = query.is('parent_id', null);
  }

  const { data: existingTasks } = await query
    .order('position', { ascending: false })
    .limit(1);

  const nextPosition = existingTasks && existingTasks.length > 0
    ? (existingTasks[0].position || 0) + 1
    : 0;

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      project_id: projectId,
      title,
      parent_id: parentId || null,
      completed: false,
      position: nextPosition,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating task:', error);
    throw error;
  }

  if (parentId) {
    return new Task(data.id, data.title, data.completed);
  } else {
    return new TaskGroup(data.id, data.title, data.completed, []);
  }
}

export async function updateTaskTitle(taskId: string, title: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('tasks')
    .update({ title })
    .eq('id', taskId);

  if (error) {
    console.error('Error updating task title:', error);
    throw error;
  }
}

export async function toggleTaskCompletion(taskId: string, completed: boolean): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('tasks')
    .update({ completed })
    .eq('id', taskId);

  if (error) {
    console.error('Error toggling task completion:', error);
    throw error;
  }
}

// Delete task - cascades to children via DB foreign key constraint
export async function deleteTask(taskId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
}

// Save command history for undo/redo functionality (Command pattern)
export async function saveCommandHistory(
  projectId: string,
  history: Array<{ description: string; timestamp: string }>
): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  await supabase
    .from('command_history')
    .delete()
    .eq('project_id', projectId);

  if (history.length > 0) {
    const entries = history.map((cmd) => ({
      project_id: projectId,
      user_id: user!.id,
      command_type: cmd.description,
      command_data: { timestamp: cmd.timestamp },
    }));

    const { error } = await supabase
      .from('command_history')
      .insert(entries);

    if (error) {
      console.error('Error saving command history:', error);
      throw error;
    }
  }
}

export async function loadCommandHistory(
  projectId: string
): Promise<Array<{ description: string; timestamp: string }>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('command_history')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading command history:', error);
    return [];
  }

  return data.map((entry) => ({
    description: entry.command_type,
    timestamp: entry.command_data?.timestamp || new Date().toISOString(),
  }));
}

// Update task position for drag & drop reordering
export async function updateTaskPosition(taskId: string, position: number): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('tasks')
    .update({ position })
    .eq('id', taskId);

  if (error) {
    console.error('Error updating task position:', error);
    throw error;
  }
}

// Batch update positions for multiple tasks
export async function reorderTasks(updates: Array<{ id: string; position: number }>): Promise<void> {
  const supabase = createClient();

  const updatePromises = updates.map(({ id, position }) =>
    supabase.from('tasks').update({ position }).eq('id', id)
  );

  const results = await Promise.all(updatePromises);

  const errors = results.filter((result) => result.error);
  if (errors.length > 0) {
    console.error('Error reordering tasks:', errors);
    throw new Error('Failed to reorder tasks');
  }
}
