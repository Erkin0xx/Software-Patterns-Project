/**
 * Composant History - Affiche l'historique des commandes avec Undo/Redo
 * Utilise le pattern COMMAND pour gérer les actions
 * Utilise le pattern OBSERVER pour se mettre à jour automatiquement
 */

'use client';

import { useObserver } from '@/patterns/observer';
import { taskStore } from '@/patterns/observer/TaskStore';
import { Undo2, Redo2, History as HistoryIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface HistoryProps {
  projectId: string;
}

export function History({ projectId }: HistoryProps) {
  const [, forceUpdate] = useState(0);

  // PATTERN OBSERVER - Update when the historic change 
  useObserver(taskStore, () => {
    forceUpdate((n) => n + 1);
  });

  const commandManager = taskStore.getCommandManager(projectId);

  // If no command manager exists, show a message
  if (!commandManager) {
    return (
      <Card className="rounded-2xl border-border p-6">
        <div className="text-center text-muted-foreground">
          History not available
        </div>
      </Card>
    );
  }

  // Get full history (saved + current session)
  const fullHistory: Array<{
    description: string;
    timestamp: Date;
    canUndo: boolean;
    index: number;
  }> = commandManager.getFullHistoryForDisplay(10);
  const currentIndex = commandManager.getCurrentIndex();
  const canUndo = commandManager.canUndo();
  const canRedo = commandManager.canRedo();

  const handleUndo = () => {
    if (commandManager.undo()) {
      taskStore.refresh();
    }
  };

  const handleRedo = () => {
    if (commandManager.redo()) {
      taskStore.refresh();
    }
  };

  return (
    <Card className="rounded-2xl border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HistoryIcon className="w-5 h-5 text-foreground" />
          <h2 className="text-xl font-semibold text-foreground">History</h2>
        </div>

        <div className="flex gap-2">
          {/* Undo Button */}
          <Button
            onClick={handleUndo}
            disabled={!canUndo}
            className="rounded-xl"
            size="sm"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4 mr-2" />
            Undo
          </Button>

          {/* Redo Button */}
          <Button
            onClick={handleRedo}
            disabled={!canRedo}
            className="rounded-xl"
            size="sm"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4 mr-2" />
            Redo
          </Button>
        </div>
      </div>

      {/* History List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {fullHistory.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            No actions performed
          </div>
        ) : (
          fullHistory.map((item, displayIndex) => {
            const isCurrent = item.canUndo && item.index === currentIndex;
            const isFuture = item.canUndo && item.index > currentIndex;
            const isSaved = !item.canUndo;

            return (
              <div
                key={displayIndex}
                className={`p-3 rounded-xl border transition-colors ${
                  isCurrent
                    ? 'bg-primary/10 border-primary'
                    : isFuture
                    ? 'bg-secondary/30 border-border opacity-50'
                    : isSaved
                    ? 'bg-secondary/20 border-border'
                    : 'bg-card border-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm ${
                        isFuture ? 'text-muted-foreground' :
                        isSaved ? 'text-muted-foreground' :
                        'text-foreground'
                      }`}
                    >
                      {item.description}
                    </span>
                    {isSaved && (
                      <span className="text-xs px-2 py-0.5 bg-secondary text-muted-foreground rounded">
                        Saved
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {item.timestamp.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {isCurrent && (
                  <div className="text-xs text-primary font-medium mt-1">
                    ← Current position
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 text-xs text-muted-foreground text-center">
        {fullHistory.length} actions • Use Ctrl+Z / Ctrl+Y for current session
      </div>
    </Card>
  );
}
