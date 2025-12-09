import { TaskComponent } from './TaskComponent';

export class Task implements TaskComponent {
  id: string;
  title: string;
  completed: boolean;
  children?: TaskComponent[] = undefined;

  constructor(id: string, title: string, completed: boolean = false) {
    this.id = id;
    this.title = title;
    this.completed = completed;
  }

  getTaskCount(): number {
    return 1;
  }

  getCompletedCount(): number {
    return this.completed ? 1 : 0;
  }

  isComplete(): boolean {
    return this.completed;
  }

  toJSON(): any {
    return {
      id: this.id,
      title: this.title,
      completed: this.completed,
    };
  }

  static fromJSON(json: any): Task {
    return new Task(json.id, json.title, json.completed);
  }
}
