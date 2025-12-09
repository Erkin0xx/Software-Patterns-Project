# Todo Patterns - Software Design Patterns

A collaborative todo application demonstrating three software design patterns using Next.js, Supabase, and TypeScript.

**🚀 Live Demo:** [https://software-patterns-project.vercel.app](https://software-patterns-project.vercel.app)

## How It Works

### Authentication & Setup

1. **Sign up with real email**: Create an account using your actual email address
2. **Email verification required**: Check your inbox and verify your email before accessing the app
3. **Supabase backend**: All data is stored in Supabase (PostgreSQL database)
4. **Row Level Security**: Database automatically enforces access permissions based on user authentication

### Project Structure

```
patterns/
├── composite/     # Hierarchical task management
├── command/       # Undo/redo functionality
└── observer/      # Reactive state management
```

## Patterns Quick Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                     THREE DESIGN PATTERNS                        │
└──────────────────────────────────────────────────────────────────┘

╔══════════════════╗   ╔══════════════════╗   ╔═══════════════════╗
║   COMPOSITE      ║   ║   COMMAND        ║   ║   OBSERVER        ║
╠══════════════════╣   ╠══════════════════╣   ╠═══════════════════╣
║                  ║   ║                  ║   ║                   ║
║  Tree Structure  ║   ║  Undo/Redo       ║   ║  Reactive State   ║
║                  ║   ║                  ║   ║                   ║
║  Task            ║   ║  [Create]        ║   ║  TaskStore        ║
║  ├─ Subtask 1    ║   ║  [Edit]          ║   ║      │            ║
║  ├─ Subtask 2    ║   ║  [Delete]        ║   ║      ├─> UI₁      ║
║  └─ Subtask 3    ║   ║  [Toggle]        ║   ║      ├─> UI₂      ║
║                  ║   ║      ↕           ║   ║      └─> UI₃      ║
║  Uniform         ║   ║  History Stack   ║   ║                   ║
║  Operations      ║   ║  with 20 limit   ║   ║  Auto-sync        ║
║                  ║   ║                  ║   ║  Components       ║
╚══════════════════╝   ╚══════════════════╝   ╚═══════════════════╝
       │                       │                        │
       └───────────────────────┼────────────────────────┘
                               ▼
                    ┌──────────────────────┐
                    │  Seamless Integration│
                    │   in Todo App        │
                    └──────────────────────┘
```

### What Each Pattern Does

| Pattern | Problem Solved | Real-World Analogy |
|---------|---------------|-------------------|
| **Composite** | How to treat single tasks and task groups uniformly? | File system: files and folders both can be opened, moved, deleted |
| **Command** | How to undo user actions? | Text editor: Ctrl+Z undoes typing, deleting, formatting |
| **Observer** | How to sync multiple UI components? | Newsletter: one email sent, many subscribers notified |

## Design Patterns

### 1. Composite Pattern 

**Where**: [patterns/composite/](patterns/composite/)

**Why**: Tasks can contain subtasks, creating a tree structure. We need to treat individual tasks and groups of tasks uniformly.

**Context**:
- User creates a task "Build Feature"
- User adds subtasks: "Design UI", "Write Tests", "Deploy"
- The app needs to count all tasks, calculate completion percentage, and support unlimited nesting

#### Structure Diagram

```
┌─────────────────────────────────────────┐
│         TaskComponent (Interface)       │
│ ─────────────────────────────────────── │
│ + id: string                            │
│ + title: string                         │
│ + completed: boolean                    │
│ ─────────────────────────────────────── │
│ + isGroup(): boolean                    │
│ + getTaskCount(): number                │
│ + getCompletedCount(): number           │
│ + getCompletionPercentage(): number     │
└─────────────────────────────────────────┘
                   ▲
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────┴────────┐   ┌────────┴───────────┐
│     Task       │   │    TaskGroup       │
│    (Leaf)      │   │   (Composite)      │
├────────────────┤   ├────────────────────┤
│ - description  │   │ - children: []     │
│ - dueDate      │   │ - parent: ?        │
├────────────────┤   ├────────────────────┤
│ isGroup() = X  │   │ isGroup() = Ok     │
│ getCount() = 1 │   │ addChild()         │
│                │   │ removeChild()      │
│                │   │ getCount() = Σ     │
└────────────────┘   └────────────────────┘
                              │
                              └─── children ───┐
                                               │
                         ┌─────────────────────┘
                         ▼
                  [ TaskComponent, TaskComponent, ... ]
```

#### Real-World Example

```
Project: "Build E-commerce Site"              ← TaskGroup (parent)
├── Setup Infrastructure                      ← TaskGroup (child + parent)
│   ├── Configure AWS                         ← Task (leaf)
│   ├── Setup Database                        ← Task (leaf)
│   └── Configure CI/CD                       ← Task (leaf)
├── Frontend Development                      ← TaskGroup (child + parent)
│   ├── Design Homepage                       ← Task (leaf)
│   ├── Create Product Catalog                ← TaskGroup (child + parent)
│   │   ├── Product Grid Component            ← Task (leaf)
│   │   ├── Filter System                     ← Task (leaf)
│   │   └── Pagination                        ← Task (leaf)
│   └── Shopping Cart                         ← Task (leaf)
└── Testing                                   ← TaskGroup (child + parent)
    ├── Unit Tests                            ← Task (leaf)
    └── E2E Tests                             ← Task (leaf)

Completion: 4/11 tasks = 36%
```

**Implementation**:
- `TaskComponent`: Common interface for all tasks
- `Task`: Single task (leaf node) - Cannot have children
- `TaskGroup`: Task with children (composite node) - Can contain other tasks/groups

**Example**:
```typescript
const project = new TaskGroup('1', 'Backend Development');
project.addChild(new Task('2', 'Setup database'));
project.addChild(new Task('3', 'Create API'));

project.getTaskCount(); // 3 (1 parent + 2 children)
project.getCompletionPercentage(); // 0%

// Complete a subtask
project.children[0].completed = true;
project.getCompletionPercentage(); // 50%
```

### 2. Command Pattern 

**Where**: [patterns/command/](patterns/command/)

**Why**: Users make mistakes and need to undo actions. We need to store enough information to reverse any operation.

**Context**:
- User creates a task → realizes it's wrong → wants to undo
- User deletes a task → regrets it → wants to undo
- App needs to maintain history of 20 recent actions per project

#### Structure Diagram

```
┌─────────────────────────┐
│   Command (Interface)   │
│ ─────────────────────── │
│ + execute(): void       │
│ + undo(): void          │
│ + canUndo(): boolean    │
└─────────────────────────┘
            ▲
            │ implements
            │
    ┌───────┴────────────────────────────────┐
    │                                        │
┌───┴──────────────┐              ┌─────────┴────────────┐
│ CreateTaskCommand│              │ DeleteTaskCommand    │
├──────────────────┤              ├──────────────────────┤
│ - task: Task     │              │ - task: Task         │
│ - parent: Group  │              │ - parent: Group      │
├──────────────────┤              ├──────────────────────┤
│ execute() {      │              │ execute() {          │
│   parent.add()   │              │   parent.remove()    │
│ }                │              │ }                    │
│ undo() {         │              │ undo() {             │
│   parent.remove()│              │   parent.add()       │
│ }                │              │ }                    │
└──────────────────┘              └──────────────────────┘

                ┌──────────────────────────┐
                │    CommandManager        │
                ├──────────────────────────┤
                │ - history: Command[]     │
                │ - currentIndex: number   │
                │ - maxSize: 20            │
                ├──────────────────────────┤
                │ + execute(cmd)           │
                │ + undo()                 │
                │ + redo()                 │
                │ + canUndo(): boolean     │
                │ + canRedo(): boolean     │
                │ + clear()                │
                └──────────────────────────┘
```

#### Execution Flow

```
User Action        CommandManager               Command Stack
──────────        ──────────────               ─────────────

1. Create Task
   │
   ├──────────> execute(CreateTaskCmd) ──> [ CreateTaskCmd ]
   │                                             ▲ current
   │

2. Edit Task
   │
   ├──────────> execute(EditTaskCmd)   ──> [ CreateTaskCmd, EditTaskCmd ]
   │                                                         ▲ current
   │

3. Delete Task
   │
   ├──────────> execute(DeleteTaskCmd) ──> [ Create, Edit, DeleteTaskCmd ]
   │                                                         ▲ current
   │

4. Undo (Ctrl+Z)
   │
   ├──────────> undo()                 ──> [ Create, Edit, DeleteTaskCmd ]
   │                 │                                    ▲ current
   │                 │
   │                 └──> DeleteTaskCmd.undo()
   │                      (Restores deleted task)
   │

5. Redo (Ctrl+Y)
   │
   ├──────────> redo()                 ──> [ Create, Edit, DeleteTaskCmd ]
                  │                                         ▲ current
                  │
                  └──> DeleteTaskCmd.execute()
                       (Deletes task again)
```

#### State Snapshot Example

```typescript
// Each command captures the state needed to reverse itself

class EditTaskCommand implements Command {
  constructor(
    private task: Task,
    private oldTitle: string,    // ← Snapshot BEFORE
    private newTitle: string     // ← Snapshot AFTER
  ) {}

  execute() {
    this.task.title = this.newTitle;  // Apply change
  }

  undo() {
    this.task.title = this.oldTitle;  // Restore previous
  }
}
```

**Implementation**:
- `Command`: Interface with `execute()` and `undo()` methods
- `CommandManager`: Tracks history (max 20 commands) and handles undo/redo
- Concrete commands: `CreateTaskCommand`, `EditTaskCommand`, `DeleteTaskCommand`, `ToggleStatusCommand`

**Example**:
```typescript
const manager = new CommandManager();

const cmd = new CreateTaskCommand(task, parentGroup);
manager.execute(cmd);  // Task created
// History: [CreateTaskCmd] ←

manager.undo();  // Task removed
// History: [CreateTaskCmd]
//           ↑ current position moved back

manager.redo();  // Task restored
// History: [CreateTaskCmd] ←

// If user makes new action after undo, future history is cleared
manager.undo();
const editCmd = new EditTaskCommand(task, 'old', 'new');
manager.execute(editCmd);
// History: [CreateTaskCmd, EditTaskCmd] ← (redo unavailable)
```

### 3. Observer Pattern 👁️

**Where**: [patterns/observer/](patterns/observer/)

**Why**: Multiple UI components need to react to data changes. Manual synchronization is error-prone and creates tight coupling.

**Context**:
- User completes a task → statistics component must update → task list must update
- User creates a project → sidebar must update → dashboard must update
- Changes must sync with Supabase database automatically

#### Structure Diagram

```
┌────────────────────────────────────┐
│      Observable (Subject)          │
│ ────────────────────────────────── │
│ - observers: Set<Observer>         │
│ ────────────────────────────────── │
│ + attach(observer: Observer)       │
│ + detach(observer: Observer)       │
│ + notify()                         │
└────────────────────────────────────┘
                ▲
                │ extends
                │
┌───────────────┴──────────────────────┐
│       TaskStore (Singleton)          │
│ ──────────────────────────────────── │
│ - static instance: TaskStore         │
│ - projects: Project[]                │
│ ──────────────────────────────────── │
│ + static getInstance()               │
│ + getProjects()                      │
│ + addProject()                       │
│ + deleteProject()                    │
│ + notifyProjectChanged() ───────┐    │
│ + notifyTaskChanged() ──────────┤    │
└─────────────────────────────────┘    │
                                       │ triggers
                    ┌──────────────────┘
                    │
                    ▼
        ┌─────── notify() ────────┐
        │                         │
        ▼                         ▼
┌───────────────┐         ┌──────────────┐
│  Component A  │         │ Component B  │
│  (Observer)   │         │  (Observer)  │
├───────────────┤         ├──────────────┤
│ TaskList      │         │ Statistics   │
│               │         │              │
│ useObserver() │         │ useObserver()│
│   │           │         │   │          │
│   └─> re-render         │   └─> update │
└───────────────┘         └──────────────┘
```

#### Observer Pattern Flow

```
Step 1: Component Subscribes
─────────────────────────────
Component Mount
    │
    ├──> useObserver(taskStore, callback)
    │           │
    │           └──> taskStore.attach(observer)
    │
    └──> Component listening for changes


Step 2: State Changes
──────────────────────
User Action (e.g., create task)
    │
    ├──> taskStore.addTask(newTask)
    │           │
    │           ├──> Update internal state
    │           │
    │           └──> taskStore.notify()
    │                       │
    │                       └──> Call all observer callbacks
    │
    └──> All subscribed components re-render


Step 3: Component Unmounts
───────────────────────────
Component Unmount
    │
    └──> taskStore.detach(observer)
             │
             └──> Component stops listening
```

#### Real-World Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                      User Action                        │
│           "Mark task 'Setup DB' as complete"            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   Command executes    │
         │  task.completed=true  │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  TaskStore.notify()   │
         └───────────┬───────────┘
                     │
         ┌───────────┴─────────────────┬─────────────┐
         │                             │             │
         ▼                             ▼             ▼
┌────────────────┐          ┌──────────────┐  ┌──────────────┐
│  TaskList      │          │ StatsBadge   │  │ ProgressBar  │
│  Component     │          │  Component   │  │  Component   │
├────────────────┤          ├──────────────┤  ├──────────────┤
│ ✓ Update UI    │          │ 4 → 5 done   │  │ 66% → 71%    │
│ ✓ Show checkmark│         │ ✓ Re-render  │  │ ✓ Animate    │
└────────────────┘          └──────────────┘  └──────────────┘
         │                             │             │
         └─────────────┬───────────────┴─────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  Supabase Sync       │
            │  Save to database    │
            └──────────────────────┘
```

#### Push vs Pull Pattern

```typescript
// PUSH: Observer receives the data (used in this app)
class PushObserver {
  update(data: Project[]) {
    // Data is pushed to observer
    console.log('Received update:', data);
  }
}

// PULL: Observer fetches the data (alternative approach)
class PullObserver {
  update(subject: TaskStore) {
    // Observer pulls data from subject
    const data = subject.getProjects();
    console.log('Fetched update:', data);
  }
}
```

**Implementation**:
- `Observable`: Base class for subjects that notify observers
- `TaskStore`: Central state store (singleton pattern)
- `useObserver`: React hook for components to subscribe to changes

**Example**:
```typescript
// Component automatically re-renders when data changes
function TaskList() {
  useObserver(taskStore, () => {
    const projects = taskStore.getProjects();
    saveToDatabase(projects);
  });

  return <div>...</div>;
}

// Trigger update from anywhere in the app
taskStore.addProject(newProject);
taskStore.notifyProjectChanged();
// ↑ All components subscribed to taskStore will re-render
```

## Pattern Interaction 🔄

The three patterns work together seamlessly to create a reactive, undoable task management system:

### Complete User Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                            │
│                    "Create new subtask in project"                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │  UI Event Handler    │
                  └──────────┬───────────┘
                             │
                             ▼
        ╔════════════════════════════════════════╗
        ║      COMMAND PATTERN (Undo/Redo)       ║
        ╠════════════════════════════════════════╣
        ║  1. Create: new CreateTaskCommand()    ║
        ║  2. Execute: commandManager.execute()  ║
        ║  3. Store in history stack             ║
        ╚════════════════════════════╦═══════════╝
                                     │
                                     ▼
        ╔════════════════════════════════════════╗
        ║    COMPOSITE PATTERN (Tree Structure)  ║
        ╠════════════════════════════════════════╣
        ║  1. Find parent TaskGroup              ║
        ║  2. Add new Task as child              ║
        ║  3. Update task counts recursively     ║
        ║  4. Recalculate completion %           ║
        ╚════════════════════════════╦═══════════╝
                                     │
                                     ▼
        ╔════════════════════════════════════════╗
        ║   OBSERVER PATTERN (State Sync)        ║
        ╠════════════════════════════════════════╣
        ║  1. TaskStore.notifyTaskChanged()      ║
        ║  2. Broadcast to all observers         ║
        ╚════════════════════════════╦═══════════╝
                                     │
                     ┌───────────────┼───────────────┐
                     │               │               │
                     ▼               ▼               ▼
            ┌────────────┐  ┌────────────┐  ┌────────────┐
            │  TaskList  │  │ Statistics │  │  Sidebar   │
            │ Component  │  │ Component  │  │ Component  │
            └──────┬─────┘  └──────┬─────┘  └──────┬─────┘
                   │               │               │
                   └───────────────┼───────────────┘
                                   │
                                   ▼
                        ┌──────────────────┐
                        │  Supabase Sync   │
                        │  (Auto-save)     │
                        └──────────────────┘
```

### Concrete Example: "User Marks Task as Complete"

```
Step-by-Step Flow:
──────────────────

1️⃣  User clicks checkbox
    └─> onClick={() => handleToggle(taskId)}

2️⃣  COMMAND PATTERN
    ├─> Create command:
    │   const cmd = new ToggleStatusCommand(task, currentStatus)
    │
    ├─> Execute:
    │   commandManager.execute(cmd)
    │
    └─> History updated:
        [CreateCmd, EditCmd, ToggleCmd] ← new
        User can now undo this action

3️⃣  COMPOSITE PATTERN
    ├─> Update task:
    │   task.completed = !task.completed
    │
    ├─> Traverse up tree:
    │   TaskGroup calculates new completion percentage
    │   Parent: 3/5 tasks done = 60%
    │   Grandparent: 15/30 tasks done = 50%
    │
    └─> Tree structure maintained:
        Project (50% complete)
        └─> Feature A (60% complete) ✓ Updated
            └─> Task 1 (✓ DONE) ✓ Changed

4️⃣  OBSERVER PATTERN
    ├─> Notify:
    │   taskStore.notifyTaskChanged()
    │
    ├─> All observers triggered:
    │   • TaskList → re-render with checkmark
    │   • ProgressBar → animate to 60%
    │   • StatsCard → update "15/30 done"
    │   • Sidebar → update project badge
    │
    └─> React components re-render automatically

5️⃣  DATABASE SYNC
    └─> Supabase client saves to PostgreSQL
        UPDATE tasks SET completed = true WHERE id = '...'
```

### Pattern Responsibilities Matrix

| Pattern        | Responsibility                          | Key Benefit                       |
|----------------|-----------------------------------------|-----------------------------------|
| **Command**    | Encapsulate actions, enable undo/redo   | History tracking, reversibility   |
| **Composite**  | Manage hierarchical task structure      | Uniform treatment of tasks/groups |
| **Observer**   | Sync state across components            | Loose coupling, reactive UI       |

### Why This Architecture?

**Without Patterns** (naive approach):
```typescript
// Tightly coupled, no undo, manual sync
function createTask(title: string) {
  const task = { id: uuid(), title, completed: false };
  project.tasks.push(task);

  // Manual updates everywhere:
  updateTaskList();
  updateStats();
  updateSidebar();
  updateProgressBar();
  saveToDatabase(task);

  // No way to undo!
}
```

**With Patterns** (our approach):
```typescript
// ✅ Decoupled, undoable, auto-sync
function createTask(title: string) {
  const cmd = new CreateTaskCommand(title, parentGroup);
  commandManager.execute(cmd);
  // ↑ Everything else happens automatically!
  // - Composite tree updated
  // - Observer notifies all components
  // - Database syncs
  // - Undo available
}
```

### Benefits Summary

1. **Separation of Concerns**: Each pattern handles one responsibility
2. **Maintainability**: Changes isolated to specific pattern implementations
3. **Testability**: Each pattern can be tested independently
4. **Scalability**: Easy to add new commands, task types, or observers
5. **User Experience**: Undo/redo + reactive UI = professional app feel

## Technologies

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (Auth, PostgreSQL, Row Level Security)
- **Patterns**: Composite, Command, Observer
- **State Management**: Custom Observer pattern (no Redux/Zustand needed)
- **Styling**: Tailwind CSS + shadcn/ui components

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                     │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    React Components                      │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │  │
│  │  │Dashboard │  │ TaskList │  │Sidebar   │  │Stats     │  │  │
│  │  └─────┬────┘  └─────┬────┘  └─────┬────┘  └─────┬────┘  │  │
│  │        │             │             │             │       │  │
│  │        └─────────────┼─────────────┼─────────────┘       │  │
│  │                      │             │                     │  │
│  └──────────────────────┼─────────────┼─────────────────────┘  │
│                         │             │                        │
│  ┌──────────────────────▼─────────────▼─────────────────────┐  │
│  │              OBSERVER PATTERN (State)                    │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  TaskStore (Singleton)                             │  │  │
│  │  │  - projects: Project[]                             │  │  │
│  │  │  - observers: Set<Observer>                        │  │  │
│  │  │  - notify() → triggers React re-renders            │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────┬──────────────────────────-─┘  │
│                                │                               │
│  ┌─────────────────────────────▼───────────────────────────┐   │
│  │              COMMAND PATTERN (Actions)                  │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │  CommandManager                                    │ │   │
│  │  │  - history: Command[]                              │ │   │
│  │  │  - currentIndex: number                            │ │   │
│  │  │  - execute() / undo() / redo()                     │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │  Concrete Commands                                 │ │   │
│  │  │  [Create] [Edit] [Delete] [Toggle]                 │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────┬───────────────────────────┘   │
│                                │                               │
│  ┌─────────────────────────────▼───────────────────────────┐   │
│  │            COMPOSITE PATTERN (Data Model)               │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │  TaskComponent (Interface)                         │ │   │
│  │  │      ▲                    ▲                        │ │   │
│  │  │      │                    │                        │ │   │
│  │  │  ┌───┴──────┐      ┌──────┴────────┐               │ │   │
│  │  │  │  Task    │      │  TaskGroup    │               │ │   │
│  │  │  │  (Leaf)  │      │  (Composite)  │               │ │   │
│  │  │  └──────────┘      └───────────────┘               │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────-──┘   │
│                                                                │
└───────────────────────────┬────────────────────────────────--──┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────┐
│                    BACKEND (Supabase)                          │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Auth         │  │ PostgreSQL   │  │ Row Level Security   │  │
│  │ - Sign up    │  │ - projects   │  │ - User isolation     │  │
│  │ - Sign in    │  │ - tasks      │  │ - Auto-permissions   │  │
│  │ - Email      │  │ - Real-time  │  │ - SQL policies       │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Install dependencies
npm install

# Configure Supabase in .env.local
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key

# Run migrations from supabase/migrations/

# Start dev server
npm run dev
```

## Project File Structure

```
todo-patterns/
├── app/                          # Next.js App Router
│   ├── dashboard/                # Main dashboard page
│   ├── project/[id]/             # Individual project page
│   └── auth/                     # Authentication pages
│
├── patterns/                     # Design Pattern Implementations
│   ├── composite/                # Composite Pattern
│   │   ├── TaskComponent.ts      # Interface for all tasks
│   │   ├── Task.ts               # Leaf node (single task)
│   │   └── TaskGroup.ts          # Composite node (task with children)
│   │
│   ├── command/                  # Command Pattern
│   │   ├── Command.ts            # Command interface
│   │   ├── CommandManager.ts     # Manages undo/redo history
│   │   └── commands/             # Concrete command implementations
│   │       ├── CreateTaskCommand.ts
│   │       ├── EditTaskCommand.ts
│   │       ├── DeleteTaskCommand.ts
│   │       └── ToggleStatusCommand.ts
│   │
│   └── observer/                 # Observer Pattern
│       ├── Observable.ts         # Base class for subjects
│       ├── TaskStore.ts          # Singleton state store
│       └── useObserver.ts        # React hook for subscriptions
│
├── components/                   # React Components
│   ├── TaskList.tsx              # Displays tasks (uses Observer)
│   ├── TaskItem.tsx              # Individual task component
│   ├── ProjectCard.tsx           # Project summary card
│   └── ui/                       # shadcn/ui components
│
├── lib/                          # Utilities
│   ├── supabase/                 # Supabase client & helpers
│   └── utils.ts                  # Helper functions
│
└── supabase/                     # Database
    └── migrations/               # SQL migration files
        └── *.sql                 # Database schema & RLS policies
```

## Key Files to Explore

### Pattern Implementations
- [`patterns/composite/TaskGroup.ts`](patterns/composite/TaskGroup.ts) - Composite pattern (tree operations)
- [`patterns/command/CommandManager.ts`](patterns/command/CommandManager.ts) - Command pattern (undo/redo)
- [`patterns/observer/TaskStore.ts`](patterns/observer/TaskStore.ts) - Observer pattern (state sync)

### React Integration
- [`patterns/observer/useObserver.ts`](patterns/observer/useObserver.ts) - React hook connecting components to store
- [`app/project/[id]/page.tsx`](app/project/[id]/page.tsx) - Example of all patterns working together

### Database
- [`supabase/migrations/`](supabase/migrations/) - Database schema and Row Level Security policies

