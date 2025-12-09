/**
 * Project Detail Page - Manage tasks for a specific project
 * Integrates Supabase with existing design patterns
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Project } from '@/lib/types';
import { SortableTaskItem } from '@/components/SortableTaskItem';
import { History } from '@/components/History';
import { MemberManagement } from '@/components/MemberManagement';
import { ThemeToggle } from '@/components/theme-toggle';
import { ArrowLeft, Plus, Loader, Edit2, Check, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Drag and Drop
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

// Supabase functions
import {
  fetchProject,
  createTask,
  updateTaskTitle,
  toggleTaskCompletion,
  deleteTask,
  saveCommandHistory,
  loadCommandHistory,
  reorderTasks,
} from '@/lib/supabase/tasks';
import { updateProject } from '@/lib/supabase/projects';
import { getUserProjectRole, type MemberRole } from '@/lib/supabase/members';

// Design Patterns
import { taskStore } from '@/patterns/observer/TaskStore';
import { useObserver } from '@/patterns/observer';
import {
  CreateTaskCommand,
  EditTaskCommand,
  ToggleStatusCommand,
} from '@/patterns/command';
import { TaskGroup } from '@/patterns/composite/TaskGroup';
import { Task } from '@/patterns/composite/Task';
import { TaskComponent } from '@/patterns/composite/TaskComponent';

export default function ProjectPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<MemberRole | 'owner' | null>(null);
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [editedProjectName, setEditedProjectName] = useState('');

  // PATTERN OBSERVER - Re-render when tasks change
  const [, forceUpdate] = useState(0);
  useObserver(taskStore, () => {
    const updatedProject = taskStore.getProject(projectId);
    if (updatedProject) {
      setProject({ ...updatedProject });
    }
    forceUpdate((n) => n + 1);
  });

  // Drag and Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load project from Supabase
  useEffect(() => {
    if (!authLoading && user && projectId) {
      loadProject();
    }
  }, [authLoading, user, projectId]);

  // Save command history when leaving
  useEffect(() => {
    return () => {
      if (project?.commandManager) {
        const history = project.commandManager.exportHistory();
        saveCommandHistory(projectId, history).catch(console.error);
      }
    };
  }, [projectId, project?.commandManager]);

  const loadProject = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await fetchProject(projectId);
      if (!data) {
        setError('Project not found');
        return;
      }

      // Load command history from Supabase
      const history = await loadCommandHistory(projectId);
      if (history.length > 0) {
        data.savedHistory = history;
      }

      // Get current user's role in this project
      if (user) {
        const role = await getUserProjectRole(projectId, user.id);
        setCurrentUserRole(role);
      }

      // Initialize taskStore with the project
      if (!taskStore.isStoreInitialized()) {
        taskStore.initialize([data]);
      } else {
        // Update existing project in store
        const currentProjects = taskStore.getProjects();
        const otherProjects = currentProjects.filter((p) => p.id !== projectId);
        taskStore.initialize([...otherProjects, data]);
      }

      const storeProject = taskStore.getProject(projectId);
      if (storeProject) {
        setProject(storeProject);
      }
    } catch (err: any) {
      console.error('Failed to load project:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // PATTERN COMMAND - Add new task
  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !project) return;

    try {
      // Create task in Supabase first to get the ID
      const newTask = await createTask(projectId, newTaskTitle.trim());

      // Create a TaskGroup for the new task (to allow subtasks)
      const newTaskGroup = new TaskGroup(newTask.id, newTask.title, newTask.completed, []);

      // Add directly to project tasks (no parent group needed)
      const commandManager = taskStore.getCommandManager(projectId);
      if (commandManager) {
        // We need to create a temporary parent to use CreateTaskCommand
        // Or we can directly add to the project
        project.tasks.push(newTaskGroup);
        taskStore.refresh();
      }

      setNewTaskTitle('');
      setIsAddingTask(false);
    } catch (err: any) {
      console.error('Failed to add task:', err);
      alert('Failed to add task: ' + err.message);
    }
  };

  // PATTERN COMMAND - Toggle task completion
  const handleToggleTask = async (taskId: string) => {
    if (!project) return;

    const task = findTaskById(project.tasks, taskId);
    if (!task) return;

    const commandManager = taskStore.getCommandManager(projectId);
    if (!commandManager) return;

    const newStatus = !task.completed;

    const command = new ToggleStatusCommand(
      task,
      () => {
        // onExecute: update Supabase
        toggleTaskCompletion(taskId, newStatus).catch(console.error);
        taskStore.refresh();
      },
      () => {
        // onUndo: revert in Supabase
        toggleTaskCompletion(taskId, !newStatus).catch(console.error);
        taskStore.refresh();
      }
    );

    commandManager.execute(command);
  };

  // PATTERN COMMAND - Edit task title
  const handleEditTask = async (taskId: string, newTitle: string) => {
    if (!project) return;

    const task = findTaskById(project.tasks, taskId);
    if (!task) return;

    const oldTitle = task.title;
    const commandManager = taskStore.getCommandManager(projectId);
    if (!commandManager) return;

    const command = new EditTaskCommand(
      task,
      newTitle,
      () => {
        // onExecute: update Supabase
        updateTaskTitle(taskId, newTitle).catch(console.error);
        taskStore.refresh();
      },
      () => {
        // onUndo: revert in Supabase
        updateTaskTitle(taskId, oldTitle).catch(console.error);
        taskStore.refresh();
      }
    );

    commandManager.execute(command);
  };

  // PATTERN COMMAND - Delete task
  const handleDeleteTask = async (taskId: string) => {
    if (!project) return;

    const task = findTaskById(project.tasks, taskId);
    if (!task) return;

    try {
      // Delete from Supabase
      await deleteTask(taskId);

      // Reload project from DB to ensure class instances are preserved
      await loadProject();
    } catch (err: any) {
      console.error('Failed to delete task:', err);
      alert('Failed to delete task: ' + err.message);
      // Reload project to restore state
      await loadProject();
    }
  };

  // PATTERN COMMAND - Add subtask
  const handleAddSubtask = async (parentId: string, title: string) => {
    if (!project) return;

    const parent = findTaskById(project.tasks, parentId);
    if (!parent || !('addChild' in parent)) return;

    try {
      // Create subtask in Supabase
      const newSubtask = await createTask(projectId, title, parentId);

      const commandManager = taskStore.getCommandManager(projectId);
      if (!commandManager) return;

      const command = new CreateTaskCommand(
        newSubtask,
        parent as TaskGroup,
        () => taskStore.refresh(),
        () => {
          deleteTask(newSubtask.id).catch(console.error);
          taskStore.refresh();
        }
      );

      commandManager.execute(command);
    } catch (err: any) {
      console.error('Failed to add subtask:', err);
      alert('Failed to add subtask: ' + err.message);
    }
  };

  // Helper: Find task by ID recursively
  const findTaskById = (
    tasks: TaskComponent[],
    taskId: string
  ): TaskComponent | null => {
    for (const task of tasks) {
      if (task.id === taskId) return task;
      if (task.children) {
        const found = findTaskById(task.children, taskId);
        if (found) return found;
      }
    }
    return null;
  };

  // Helper: Find parent of a task
  const findParentOfTask = (
    tasks: TaskComponent[],
    taskId: string
  ): TaskComponent | null => {
    for (const task of tasks) {
      if (task.children) {
        if (task.children.some((child) => child.id === taskId)) {
          return task;
        }
        const found = findParentOfTask(task.children, taskId);
        if (found) return found;
      }
    }
    return null;
  };

  // Handle drag end - Reorder tasks
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !project) return;

    const oldIndex = project.tasks.findIndex((task) => task.id === active.id);
    const newIndex = project.tasks.findIndex((task) => task.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder tasks locally
    const reorderedTasks = arrayMove(project.tasks, oldIndex, newIndex);

    // Update project state optimistically
    setProject({ ...project, tasks: reorderedTasks });

    // Update positions in Supabase
    try {
      const updates = reorderedTasks.map((task, index) => ({
        id: task.id,
        position: index,
      }));

      await reorderTasks(updates);
      taskStore.refresh();
    } catch (err: any) {
      console.error('Failed to reorder tasks:', err);
      // Revert on error
      await loadProject();
    }
  };

  // Handle reordering subtasks
  const handleReorderSubtasks = async (parentId: string, reorderedChildren: TaskComponent[]) => {
    if (!project) return;

    try {
      // Update positions in Supabase
      const updates = reorderedChildren.map((child, index) => ({
        id: child.id,
        position: index,
      }));

      await reorderTasks(updates);

      // Reload project from DB to ensure class instances are preserved
      await loadProject();
    } catch (err: any) {
      console.error('Failed to reorder subtasks:', err);
      // Reload project to restore state
      await loadProject();
    }
  };

  // Handle project name edit
  const handleEditProjectName = async () => {
    if (!editedProjectName.trim() || !project) return;

    try {
      await updateProject(projectId, { name: editedProjectName.trim() });
      setProject({ ...project, name: editedProjectName.trim() });
      setIsEditingProjectName(false);
    } catch (err: any) {
      console.error('Failed to update project name:', err);
      alert('Failed to update project name: ' + err.message);
    }
  };

  const startEditingProjectName = () => {
    if (!project) return;
    setEditedProjectName(project.name);
    setIsEditingProjectName(true);
  };

  const cancelEditingProjectName = () => {
    setIsEditingProjectName(false);
    setEditedProjectName('');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader className="w-8 h-8 text-foreground animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Link
            href="/dashboard"
            className="text-foreground hover:underline"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background transition-colors">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div className="flex-1">
                {isEditingProjectName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editedProjectName}
                      onChange={(e) => setEditedProjectName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditProjectName();
                        if (e.key === 'Escape') cancelEditingProjectName();
                      }}
                      className="text-3xl font-bold bg-background border border-border rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                      autoFocus
                    />
                    <Button
                      onClick={handleEditProjectName}
                      size="icon"
                      className="h-9 w-9 rounded-lg"
                      disabled={!editedProjectName.trim()}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={cancelEditingProjectName}
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold text-foreground">
                      {project.name}
                    </h1>
                    {(currentUserRole === 'owner' || currentUserRole === 'admin') && (
                      <Button
                        onClick={startEditingProjectName}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        title="Edit project name"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
                {project.description && !isEditingProjectName && (
                  <p className="text-muted-foreground mt-1">
                    {project.description}
                  </p>
                )}
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tasks Section */}
          <div className="lg:col-span-2">
            <Card className="rounded-2xl border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-foreground">
                  Tasks
                </h2>
                <Button
                  onClick={() => setIsAddingTask(true)}
                  className="flex items-center gap-2 rounded-xl"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Add Task</span>
                </Button>
              </div>

              {/* Add Task Form */}
              {isAddingTask && (
                <div className="mb-6 p-4 bg-secondary/50 rounded-xl border border-border">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTask();
                      if (e.key === 'Escape') {
                        setNewTaskTitle('');
                        setIsAddingTask(false);
                      }
                    }}
                    placeholder="Task title..."
                    className="w-full px-4 py-2 border border-border bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground mb-3"
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={handleAddTask}
                      className="rounded-xl"
                    >
                      Add
                    </Button>
                    <Button
                      onClick={() => {
                        setNewTaskTitle('');
                        setIsAddingTask(false);
                      }}
                      variant="outline"
                      className="rounded-xl"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Tasks List */}
              <div className="space-y-2">
                {project.tasks.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      No tasks yet. Add one to get started!
                    </p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={project.tasks.map((task) => task.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {project.tasks.map((task) => (
                        <SortableTaskItem
                          key={task.id}
                          task={task}
                          onToggle={handleToggleTask}
                          onDelete={handleDeleteTask}
                          onEdit={handleEditTask}
                          onAddSubtask={handleAddSubtask}
                          onReorderSubtasks={handleReorderSubtasks}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar - Members & History */}
          <div className="lg:col-span-1 space-y-6">
            {/* Member Management */}
            <MemberManagement
              projectId={projectId}
              currentUserRole={currentUserRole}
            />

            {/* History Section */}
            <History projectId={projectId} />
          </div>
        </div>
      </main>
    </div>
  );
}
