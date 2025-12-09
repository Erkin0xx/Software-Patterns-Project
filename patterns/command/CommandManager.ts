import { Command } from './Command';

export interface SerializableCommandHistory {
  description: string;
  timestamp: string;
}

export class CommandManager {
  private history: Command[] = [];
  private currentIndex: number = -1;
  private readonly maxHistorySize: number = 20;
  private savedHistory: SerializableCommandHistory[] = [];

  execute(command: Command): void {
    command.execute();

    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    this.history.push(command);
    this.currentIndex++;

    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.currentIndex--;
    }
  }

  undo(): boolean {
    if (!this.canUndo()) return false;

    const command = this.history[this.currentIndex];
    command.undo();
    this.currentIndex--;

    return true;
  }

  redo(): boolean {
    if (!this.canRedo()) return false;

    this.currentIndex++;
    const command = this.history[this.currentIndex];
    command.execute();

    return true;
  }

  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  getHistory(): ReadonlyArray<Command> {
    return this.history;
  }

  getRecentHistory(count: number = 10): ReadonlyArray<Command> {
    return this.history.slice(-count);
  }

  getFullHistoryForDisplay(count: number = 10): Array<{
    description: string;
    timestamp: Date;
    canUndo: boolean;
    index: number;
  }> {
    const saved = this.savedHistory.map((cmd, idx) => ({
      description: cmd.description,
      timestamp: new Date(cmd.timestamp),
      canUndo: false,
      index: idx - this.savedHistory.length
    }));

    const current = this.history.map((cmd, idx) => ({
      description: cmd.description,
      timestamp: cmd.timestamp,
      canUndo: true,
      index: idx
    }));

    const all = [...saved, ...current];
    return all.slice(-count);
  }

  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  exportHistory(): SerializableCommandHistory[] {
    return this.history.map(cmd => ({
      description: cmd.description,
      timestamp: cmd.timestamp.toISOString()
    }));
  }

  importHistory(savedHistory: SerializableCommandHistory[]): void {
    this.savedHistory = savedHistory;
  }

  getSavedHistory(): SerializableCommandHistory[] {
    return this.savedHistory;
  }
}
