import { Observable } from './Observable';
import { Project, Statistics } from '@/lib/types';
import { CommandManager } from '../command/CommandManager';
import { TaskGroup } from '../composite/TaskGroup';

export interface TaskStoreEvent {
  type: 'PROJECT_CHANGED' | 'HISTORY_CHANGED' | 'STATS_CHANGED';
  data?: any;
}

export class TaskStore extends Observable<TaskStoreEvent> {
  private projects: Project[] = [];
  private isInitialized: boolean = false;

  constructor() {
    super();
  }

  isStoreInitialized(): boolean {
    return this.isInitialized;
  }

  initialize(projects: Project[]): void {
    if (this.isInitialized) {
      this.syncProjects(projects);
      return;
    }

    this.projects = projects.map(project => {
      const commandManager = new CommandManager();
      if (project.savedHistory && project.savedHistory.length > 0) {
        commandManager.importHistory(project.savedHistory);
      }
      return {
        ...project,
        commandManager
      };
    });
    this.isInitialized = true;
    this.notifyProjectChanged();
  }

  private syncProjects(loadedProjects: Project[]): void {
    this.projects = loadedProjects.map(loadedProject => {
      const existing = this.projects.find(p => p.id === loadedProject.id);
      return {
        ...loadedProject,
        commandManager: existing?.commandManager || new CommandManager()
      };
    });

    this.notifyProjectChanged();
  }

  getProjects(): Project[] {
    return this.projects;
  }

  getProject(id: string): Project | undefined {
    return this.projects.find((p) => p.id === id);
  }

  getCommandManager(projectId: string): CommandManager | undefined {
    const project = this.getProject(projectId);
    if (!project?.commandManager) {
      if (project) {
        project.commandManager = new CommandManager();
      }
    }
    return project?.commandManager;
  }

  getStatistics(): Statistics {
    let totalTasks = 0;
    let completedTasks = 0;

    this.projects.forEach((project) => {
      project.tasks.forEach((task) => {
        totalTasks += task.getTaskCount();
        completedTasks += task.getCompletedCount();
      });
    });

    const percentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return {
      totalTasks,
      completedTasks,
      percentage: Math.round(percentage),
    };
  }

  notifyProjectChanged(): void {
    this.notify({ type: 'PROJECT_CHANGED' });
    this.notifyStatsChanged();
  }

  notifyHistoryChanged(): void {
    this.notify({ type: 'HISTORY_CHANGED' });
  }

  notifyStatsChanged(): void {
    this.notify({
      type: 'STATS_CHANGED',
      data: this.getStatistics(),
    });
  }

  refresh(): void {
    this.notifyProjectChanged();
    this.notifyHistoryChanged();
  }
}

export const taskStore = new TaskStore();
