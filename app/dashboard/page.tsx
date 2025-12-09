/**
 * Dashboard Page - Main user dashboard (screenshot style)
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Project } from '@/lib/types';
import { Plus, FolderOpen, LogOut, User, PlusCircle, Trash2, CheckSquare, Menu, X } from 'lucide-react';
import { fetchUserProjects, createProject, deleteProject } from '@/lib/supabase/projects';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, signOut, loading: authLoading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      loadProjects();
    }
  }, [authLoading, user]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await fetchUserProjects();
      setProjects(data);
    } catch (err: any) {
      console.error('Failed to load projects:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      const newProject = await createProject(newProjectName.trim());
      setProjects([newProject, ...projects]);
      setNewProjectName('');
      setIsCreating(false);
    } catch (err: any) {
      console.error('Failed to create project:', err);
      alert('Failed to create project: ' + err.message);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      setProjects(projects.filter((p) => p.id !== projectId));
    } catch (err: any) {
      console.error('Failed to delete project:', err);
      alert('Failed to delete project: ' + err.message);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/landing');
  };

  // Calculate statistics
  const totalProjects = projects.length;
  const totalTasks = projects.reduce(
    (sum, project) =>
      sum + project.tasks.reduce((taskSum, task) => taskSum + task.getTaskCount(), 0),
    0
  );
  const completedTasks = projects.reduce(
    (sum, project) =>
      sum +
      project.tasks.reduce(
        (taskSum, task) => taskSum + task.getCompletedCount(),
        0
      ),
    0
  );
  const activeTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Filter projects based on search query
  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-card border border-border"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className={`
          fixed md:static inset-y-0 left-0 z-50
          w-72 border-r border-border p-8 bg-background
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}>
          {/* Close button for mobile */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden absolute top-4 right-4 p-2 rounded-lg hover:bg-card"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3 mb-12">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <CheckSquare className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">Todo Patterns</span>
          </div>

          <nav className="space-y-2">
            <div className="text-sm text-muted-foreground mb-3">Menu</div>
            <Link
              href="/dashboard"
              onClick={() => setIsSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-card text-sm font-medium"
            >
              <span className="text-lg">🎯</span>
              Dashboard
            </Link>

            {projects.length > 0 && (
              <>
                <div className="text-sm text-muted-foreground mb-3 mt-8">Projects</div>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/project/${project.id}`}
                      onClick={() => setIsSidebarOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-card text-sm w-full text-left transition-colors"
                    >
                      <FolderOpen className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{project.name}</span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </nav>

          <div className="mt-auto pt-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="w-full justify-start px-4 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
            <div className="flex items-center gap-2 mt-4">
              <ThemeToggle />
              <span className="text-sm text-muted-foreground">Toggle Theme</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">My Projects</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {user?.fullName || user?.email}
                </p>
              </div>
              <Button
                onClick={() => setIsCreating(true)}
                className="rounded-xl px-4 sm:px-6 h-10 sm:h-11 w-full sm:w-auto"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Quick Create
              </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="rounded-2xl border-border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="text-sm font-medium text-muted-foreground">
                    Total Projects
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FolderOpen className="w-3 h-3" />
                  </div>
                </div>
                <div className="text-3xl font-bold mb-2">{totalProjects}</div>
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-muted-foreground">
                    {totalProjects === 0 ? 'No projects yet' : totalProjects === 1 ? 'Active project' : 'Active projects'}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Total workspace projects
                </div>
              </Card>

              <Card className="rounded-2xl border-border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="text-sm font-medium text-muted-foreground">
                    Total Tasks
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 8 8">
                      <rect width="8" height="2" y="1" rx="1" />
                      <rect width="8" height="2" y="5" rx="1" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold mb-2">{totalTasks}</div>
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-muted-foreground">
                    {activeTasks} active {activeTasks === 1 ? 'task' : 'tasks'}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Across all projects
                </div>
              </Card>

              <Card className="rounded-2xl border-border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="text-sm font-medium text-muted-foreground">
                    Completed Tasks
                  </div>
                  <div className="flex items-center gap-1 text-xs text-green-500">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 8 8">
                      <path d="M0 4 L3 7 L8 0" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold mb-2">{completedTasks}</div>
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-muted-foreground">
                    {completedTasks} {completedTasks === 1 ? 'task' : 'tasks'} done
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Keep up the good work!
                </div>
              </Card>

              <Card className="rounded-2xl border-border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="text-sm font-medium text-muted-foreground">
                    Completion Rate
                  </div>
                  <div className="flex items-center gap-1 text-xs text-green-500">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" r="3" stroke="currentColor" strokeWidth="1" fill="none" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold mb-2">{completionRate}%</div>
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-muted-foreground">
                    Overall progress
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {completionRate >= 75 ? 'Excellent progress!' : completionRate >= 50 ? 'Good progress' : 'Keep going!'}
                </div>
              </Card>
            </div>

            {/* Search Bar */}
            {projects.length > 0 && (
              <div className="mb-6">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                />
              </div>
            )}

            {/* Create Project Dialog */}
            <Dialog open={isCreating} onOpenChange={setIsCreating}>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Enter a name for your new project to get started.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newProjectName.trim()) {
                        handleCreateProject();
                      }
                      if (e.key === 'Escape') {
                        setNewProjectName('');
                        setIsCreating(false);
                      }
                    }}
                    placeholder="Project name..."
                    className="w-full px-4 py-2 border border-border bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                    autoFocus
                  />
                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setNewProjectName('');
                        setIsCreating(false);
                      }}
                      className="rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateProject}
                      disabled={!newProjectName.trim()}
                      className="rounded-xl"
                    >
                      Create Project
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {projects.length > 0 && filteredProjects.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No projects found matching &ldquo;{searchQuery}&rdquo;</p>
              </div>
            )}

            {filteredProjects.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-8">
                {filteredProjects.map((project) => {
                  const projectTotalTasks = project.tasks.reduce(
                    (sum, task) => sum + task.getTaskCount(),
                    0
                  );
                  const projectCompletedTasks = project.tasks.reduce(
                    (sum, task) => sum + task.getCompletedCount(),
                    0
                  );
                  const projectProgress =
                    projectTotalTasks > 0
                      ? Math.round((projectCompletedTasks / projectTotalTasks) * 100)
                      : 0;

                  return (
                    <Card key={project.id} className="rounded-2xl border-border p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{project.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {projectTotalTasks} {projectTotalTasks === 1 ? 'task' : 'tasks'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-lg h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete project "${project.name}"?`)) {
                              handleDeleteProject(project.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {projectTotalTasks > 0 && (
                        <div className="mb-6">
                          <div className="flex justify-between text-sm mb-3">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">
                              {projectCompletedTasks} / {projectTotalTasks}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-500 rounded-full"
                              style={{ width: `${projectProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <Link href={`/project/${project.id}`}>
                        <Button className="w-full rounded-xl" variant="outline">
                          View Project
                        </Button>
                      </Link>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
