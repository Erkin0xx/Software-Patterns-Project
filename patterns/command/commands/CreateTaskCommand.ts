import { Command } from '../Command';
import { TaskComponent } from '../../composite/TaskComponent';
import { TaskGroup } from '../../composite/TaskGroup';

export class CreateTaskCommand implements Command {
  description: string;
  timestamp: Date;

  constructor(
    private task: TaskComponent,
    private parent: TaskGroup,
    private onExecute?: () => void,
    private onUndo?: () => void
  ) {
    this.description = `Create task "${task.title}"`;
    this.timestamp = new Date();
  }

  execute(): void {
    this.parent.addChild(this.task);
    this.onExecute?.();
  }

  undo(): void {
    this.parent.removeChild(this.task.id);
    this.onUndo?.();
  }
}
