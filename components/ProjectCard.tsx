/**
 * Composant ProjectCard - Affiche une carte de projet
 */

'use client';

import { Project } from '@/lib/types';
import { Folder, Trash2, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface ProjectCardProps {
  project: Project;
  onDelete: (projectId: string) => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  // Calculate statistic (pattern COMPOSITE)
  const totalTasks = project.tasks.reduce(
    (sum, task) => sum + task.getTaskCount(),
    0
  );
  const completedTasks = project.tasks.reduce(
    (sum, task) => sum + task.getCompletedCount(),
    0
  );
  const percentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Folder className="w-6 h-6 text-primary dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {project.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'}
            </p>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete project "${project.name}"?`)) {
              onDelete(project.id);
            }
          }}
          className="text-gray-400 dark:text-gray-500 hover:text-danger dark:hover:text-red-400 transition-colors p-2"
          title="Delete project"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Progress */}
      {totalTasks > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Progress</span>
            <span>
              {completedTasks} / {totalTasks}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary to-success h-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* View Project Link */}
      <Link
        href={`/project/${project.id}`}
        className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
      >
        <span className="font-medium">View Project</span>
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
