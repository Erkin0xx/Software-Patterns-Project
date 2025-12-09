import { TaskComponent } from './TaskComponent';
import { Task } from './Task';

export class TaskGroup implements TaskComponent {
  id: string;
  title: string;
  completed: boolean;
  children: TaskComponent[];

  constructor(
    id: string,
    title: string,
    completed: boolean = false,
    children: TaskComponent[] = []
  ) {
    this.id = id;
    this.title = title;
    this.completed = completed;
    this.children = children;
  }

  getTaskCount(): number {
    return (
      1 +
      this.children.reduce((sum, child) => sum + child.getTaskCount(), 0)
    );
  }

  getCompletedCount(): number {
    const thisCount = this.completed ? 1 : 0;
    const childrenCount = this.children.reduce(
      (sum, child) => sum + child.getCompletedCount(),
      0
    );
    return thisCount + childrenCount;
  }

  isComplete(): boolean {
    if (!this.completed) return false;
    return this.children.every((child) => child.isComplete());
  }

  addChild(task: TaskComponent): void {
    this.children.push(task);
  }

  removeChild(taskId: string): TaskComponent | null {
    const index = this.children.findIndex((child) => child.id === taskId);
    if (index === -1) {
      for (const child of this.children) {
        if (child.children) {
          const removed = (child as TaskGroup).removeChild(taskId);
          if (removed) return removed;
        }
      }
      return null;
    }
    return this.children.splice(index, 1)[0];
  }

  findTask(taskId: string): TaskComponent | null {
    if (this.id === taskId) return this;

    for (const child of this.children) {
      if (child.id === taskId) return child;
      if (child.children) {
        const found = (child as TaskGroup).findTask(taskId);
        if (found) return found;
      }
    }
    return null;
  }

  toJSON(): any {
    return {
      id: this.id,
      title: this.title,
      completed: this.completed,
      children: this.children.map((child) => child.toJSON()),
    };
  }

  static fromJSON(json: any): TaskGroup {
    const children = json.children
      ? json.children.map((childJson: any) => {
          if (childJson.children && childJson.children.length > 0) {
            return TaskGroup.fromJSON(childJson);
          }
          return Task.fromJSON(childJson);
        })
      : [];

    return new TaskGroup(json.id, json.title, json.completed, children);
  }
}
