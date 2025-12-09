import { Command } from '../Command';
import { TaskComponent } from '../../composite/TaskComponent';
import { TaskGroup } from '../../composite/TaskGroup';

export class DeleteTaskCommand implements Command {
  description: string;
  timestamp: Date;
  private deletedTask: TaskComponent | null = null;
  private deletedIndex: number = -1;

  constructor(
    private taskId: string,
    private parent: TaskGroup,
    private taskTitle: string,
    private onExecute?: () => void,
    private onUndo?: () => void
  ) {
    this.description = `Delete task "${taskTitle}"`;
    this.timestamp = new Date();
  }

  execute(): void {
    this.deletedIndex = this.parent.children.findIndex(
      (child) => child.id === this.taskId
    );
    this.deletedTask = this.parent.removeChild(this.taskId);
    this.onExecute?.();
  }

  undo(): void {
    if (this.deletedTask && this.deletedIndex !== -1) {
      this.parent.children.splice(this.deletedIndex, 0, this.deletedTask);
      this.onUndo?.();
    }
  }
}
