import { Command } from '../Command';
import { TaskComponent } from '../../composite/TaskComponent';

export class ToggleStatusCommand implements Command {
  description: string;
  timestamp: Date;

  constructor(
    private task: TaskComponent,
    private onExecute?: () => void,
    private onUndo?: () => void
  ) {
    const action = task.completed ? 'Mark incomplete' : 'Mark complete';
    this.description = `${action}: "${task.title}"`;
    this.timestamp = new Date();
  }

  execute(): void {
    this.task.completed = !this.task.completed;
    this.onExecute?.();
  }

  undo(): void {
    this.task.completed = !this.task.completed;
    this.onUndo?.();
  }
}
