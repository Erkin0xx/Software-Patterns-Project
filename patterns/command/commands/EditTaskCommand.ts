import { Command } from '../Command';
import { TaskComponent } from '../../composite/TaskComponent';

export class EditTaskCommand implements Command {
  description: string;
  timestamp: Date;
  private oldTitle: string;

  constructor(
    private task: TaskComponent,
    private newTitle: string,
    private onExecute?: () => void,
    private onUndo?: () => void
  ) {
    this.oldTitle = task.title;
    this.description = `Edit "${this.oldTitle}" to "${newTitle}"`;
    this.timestamp = new Date();
  }

  execute(): void {
    this.task.title = this.newTitle;
    this.onExecute?.();
  }

  undo(): void {
    this.task.title = this.oldTitle;
    this.onUndo?.();
  }
}
