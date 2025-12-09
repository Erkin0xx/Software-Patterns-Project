/**
 * Composant Statistics - Affiche les statistiques globales
 * Utilise le pattern OBSERVER pour se mettre à jour automatiquement
 */

'use client';

import { useObservableValue } from '@/patterns/observer';
import { taskStore } from '@/patterns/observer/TaskStore';
import { CheckCircle2, Circle, TrendingUp } from 'lucide-react';

export function Statistics() {
  // PATTERN OBSERVER - Subscribe automaticaly when stats change
  const stats = useObservableValue(taskStore, () => taskStore.getStatistics());

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Global Statistics
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Tasks */}
        <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <Circle className="w-8 h-8 text-primary dark:text-blue-400" />
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalTasks}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Tasks</div>
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <CheckCircle2 className="w-8 h-8 text-success dark:text-green-400" />
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.completedTasks}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Completed Tasks</div>
          </div>
        </div>

        {/* Percentage */}
        <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.percentage}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Progress</div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {stats.totalTasks > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Overall Progress</span>
            <span>
              {stats.completedTasks} / {stats.totalTasks}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary to-success h-full transition-all duration-500"
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
        </div>
      )}

      {stats.totalTasks === 0 && (
        <div className="mt-4 text-center text-gray-500 dark:text-gray-400 text-sm">
          No tasks yet. Create a project to get started!
        </div>
      )}
    </div>
  );
}
