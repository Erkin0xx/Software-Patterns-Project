# 📚 Documentation des Design Patterns

Ce document explique en détail les **3 design patterns** implémentés dans cette application : **Composite**, **Command**, et **Observer**.

## Table des Matières

1. [Pattern COMPOSITE](#1-pattern-composite-)
2. [Pattern COMMAND](#2-pattern-command-)
3. [Pattern OBSERVER](#3-pattern-observer-)
4. [Interaction entre les Patterns](#4-interaction-entre-les-patterns)
5. [Avantages et Inconvénients](#5-avantages-et-inconvénients)

---

## 1. Pattern COMPOSITE 🌳

### 📖 Définition

Le pattern **Composite** permet de composer des objets en structures arborescentes pour représenter des hiérarchies partie-tout. Il permet aux clients de traiter uniformément les objets individuels et les compositions d'objets.

### 🎯 Problème Résolu

Comment gérer une hiérarchie de tâches où :
- Une **tâche simple** n'a pas d'enfants
- Une **tâche composite** peut contenir des sous-tâches
- Les opérations (compter, vérifier statut) doivent fonctionner récursivement

**Sans le pattern :** Il faudrait des conditions partout pour vérifier si une tâche a des enfants ou non.

**Avec le pattern :** Interface uniforme pour toutes les tâches.

### 🏗️ Structure UML

```
┌─────────────────────────┐
│   TaskComponent         │ (Interface)
├─────────────────────────┤
│ + id: string            │
│ + title: string         │
│ + completed: boolean    │
│ + children?: []         │
├─────────────────────────┤
│ + getTaskCount(): int   │
│ + getCompletedCount()   │
│ + isComplete(): bool    │
└─────────────────────────┘
           △
           │
    ┌──────┴──────┐
    │             │
┌───┴───┐    ┌───┴────────┐
│ Task  │    │ TaskGroup  │
│(Leaf) │    │(Composite) │
└───────┘    └────────────┘
```

### 💻 Implémentation

#### Interface TaskComponent

```typescript
// patterns/composite/TaskComponent.ts
export interface TaskComponent {
  id: string;
  title: string;
  completed: boolean;
  children?: TaskComponent[];

  getTaskCount(): number;       // Récursif
  getCompletedCount(): number;  // Récursif
  isComplete(): boolean;         // Récursif
}
```

#### Leaf (Feuille) - Task

```typescript
// patterns/composite/Task.ts
export class Task implements TaskComponent {
  id: string;
  title: string;
  completed: boolean;
  children?: undefined; // Pas d'enfants

  getTaskCount(): number {
    return 1; // Une feuille = 1
  }

  getCompletedCount(): number {
    return this.completed ? 1 : 0;
  }

  isComplete(): boolean {
    return this.completed;
  }
}
```

#### Composite - TaskGroup

```typescript
// patterns/composite/TaskGroup.ts
export class TaskGroup implements TaskComponent {
  id: string;
  title: string;
  completed: boolean;
  children: TaskComponent[];

  // COMPOSITE PATTERN - Opération récursive
  getTaskCount(): number {
    return 1 + this.children.reduce(
      (sum, child) => sum + child.getTaskCount(),
      0
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
    return this.children.every(child => child.isComplete());
  }
}
```

### 🎯 Où dans l'Application ?

1. **Modèles de données** : `patterns/composite/`
2. **Affichage récursif** : `components/TaskItem.tsx`
   ```tsx
   // Affichage récursif des enfants
   {task.children?.map(child => (
     <TaskItem task={child} level={level + 1} />
   ))}
   ```
3. **Calcul de statistiques** : `components/Statistics.tsx`, `components/ProjectCard.tsx`
   ```typescript
   const total = project.tasks.reduce(
     (sum, task) => sum + task.getTaskCount(),
     0
   );
   ```

### ✅ Avantages

- ✅ Traitement uniforme des tâches simples et composées
- ✅ Facilite l'ajout de nouveaux types de tâches
- ✅ Code récursif élégant
- ✅ Hiérarchie extensible à l'infini

### ❌ Inconvénients

- ❌ Peut être trop général (tous les types partagent l'interface)
- ❌ Performance sur de très grandes arborescences

---

## 2. Pattern COMMAND ⚡

### 📖 Définition

Le pattern **Command** encapsule une requête en tant qu'objet, permettant ainsi de paramétrer des clients avec différentes requêtes, de mettre en file d'attente ou de journaliser des requêtes, et de supporter les opérations annulables.

### 🎯 Problème Résolu

Comment permettre l'annulation (Undo) et la répétition (Redo) d'actions ?

**Sans le pattern :** Il faudrait stocker l'état complet avant chaque action (coûteux en mémoire).

**Avec le pattern :** Chaque action sait comment s'exécuter et s'annuler.

### 🏗️ Structure UML

```
┌─────────────────────┐
│   Command           │ (Interface)
├─────────────────────┤
│ + execute(): void   │
│ + undo(): void      │
│ + description: str  │
│ + timestamp: Date   │
└─────────────────────┘
           △
           │
    ┌──────┴──────────────────┐
    │                          │
┌───┴───────────────┐  ┌──────┴──────────┐
│ CreateTaskCommand │  │ DeleteTaskCommand│
├───────────────────┤  ├─────────────────┤
│ + execute()       │  │ + execute()     │
│ + undo()          │  │ + undo()        │
└───────────────────┘  └─────────────────┘

┌──────────────────────┐
│  CommandManager      │ (Invoker)
├──────────────────────┤
│ - history: Command[] │
│ - currentIndex: int  │
├──────────────────────┤
│ + execute(cmd)       │
│ + undo()             │
│ + redo()             │
│ + canUndo(): bool    │
│ + canRedo(): bool    │
└──────────────────────┘
```

### 💻 Implémentation

#### Interface Command

```typescript
// patterns/command/Command.ts
export interface Command {
  execute(): void;
  undo(): void;
  description: string;
  timestamp: Date;
}
```

#### CommandManager (Invoker)

```typescript
// patterns/command/CommandManager.ts
export class CommandManager {
  private history: Command[] = [];
  private currentIndex: number = -1;

  execute(command: Command): void {
    command.execute();

    // Supprimer les commandes "futures" si en mode undo
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    this.history.push(command);
    this.currentIndex++;

    // Limiter à 20 commandes
    if (this.history.length > 20) {
      this.history.shift();
      this.currentIndex--;
    }
  }

  undo(): boolean {
    if (!this.canUndo()) return false;

    this.history[this.currentIndex].undo();
    this.currentIndex--;
    return true;
  }

  redo(): boolean {
    if (!this.canRedo()) return false;

    this.currentIndex++;
    this.history[this.currentIndex].execute();
    return true;
  }
}
```

#### Exemple : CreateTaskCommand

```typescript
// patterns/command/commands/CreateTaskCommand.ts
export class CreateTaskCommand implements Command {
  description: string;
  timestamp: Date;

  constructor(
    private task: TaskComponent,
    private parent: TaskGroup,
    private onExecute?: () => void,
    private onUndo?: () => void
  ) {
    this.description = `Créer la tâche "${task.title}"`;
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
```

### 🎯 Où dans l'Application ?

1. **Toutes les actions CRUD** dans `app/project/[id]/page.tsx` :
   ```typescript
   const command = new CreateTaskCommand(task, parent, notify);
   commandManager.execute(command);
   ```

2. **Composant History** : `components/History.tsx`
   - Affiche l'historique
   - Boutons Undo/Redo
   - Raccourcis clavier

3. **Commandes implémentées** :
   - `CreateTaskCommand`
   - `DeleteTaskCommand`
   - `EditTaskCommand`
   - `ToggleStatusCommand`
   - `CreateProjectCommand`
   - `DeleteProjectCommand`

### ✅ Avantages

- ✅ Undo/Redo facile
- ✅ Historique des actions
- ✅ Découplage entre l'invocation et l'exécution
- ✅ Facilite l'ajout de nouvelles commandes
- ✅ Support des macros (séquence de commandes)

### ❌ Inconvénients

- ❌ Augmente le nombre de classes
- ❌ Mémoire utilisée pour l'historique
- ❌ Certaines opérations sont difficiles à annuler

---

## 3. Pattern OBSERVER 👁️

### 📖 Définition

Le pattern **Observer** définit une dépendance un-à-plusieurs entre objets, de façon que lorsqu'un objet change d'état, tous ses dépendants soient notifiés et mis à jour automatiquement.

### 🎯 Problème Résolu

Comment synchroniser automatiquement l'interface utilisateur quand les données changent ?

**Sans le pattern :** Il faudrait appeler manuellement chaque composant à mettre à jour.

**Avec le pattern :** Les composants s'abonnent et sont notifiés automatiquement.

### 🏗️ Structure UML

```
┌──────────────────────┐
│   Observable<T>      │ (Subject)
├──────────────────────┤
│ - observers: []      │
├──────────────────────┤
│ + subscribe(obs)     │
│ + unsubscribe(obs)   │
│ + notify(data: T)    │
└──────────────────────┘
           △
           │
    ┌──────┴──────┐
    │             │
┌───┴────────┐
│ TaskStore  │ (Concrete Observable)
├────────────┤
│ + projects │
│ + cmdMgr   │
├────────────┤
│ + notifyProjectChanged() │
│ + notifyHistoryChanged() │
└──────────────────────────┘

┌──────────────────────┐
│   useObserver()      │ (Hook React)
├──────────────────────┤
│ Abonne le composant  │
│ Force re-render      │
│ Se désabonne auto    │
└──────────────────────┘
```

### 💻 Implémentation

#### Observable (Subject)

```typescript
// patterns/observer/Observable.ts
export type Observer<T> = (data: T) => void;

export class Observable<T> {
  private observers: Observer<T>[] = [];

  subscribe(observer: Observer<T>): () => void {
    this.observers.push(observer);

    // Retourne une fonction de désabonnement
    return () => this.unsubscribe(observer);
  }

  unsubscribe(observer: Observer<T>): void {
    const index = this.observers.indexOf(observer);
    if (index !== -1) {
      this.observers.splice(index, 1);
    }
  }

  protected notify(data: T): void {
    this.observers.forEach(observer => {
      try {
        observer(data);
      } catch (error) {
        console.error('Error in observer:', error);
      }
    });
  }
}
```

#### TaskStore (Concrete Observable)

```typescript
// patterns/observer/TaskStore.ts
export class TaskStore extends Observable<TaskStoreEvent> {
  private projects: Project[] = [];
  private commandManager: CommandManager;

  notifyProjectChanged(): void {
    this.notify({ type: 'PROJECT_CHANGED' });
    this.notifyStatsChanged();
  }

  notifyHistoryChanged(): void {
    this.notify({ type: 'HISTORY_CHANGED' });
  }

  notifyStatsChanged(): void {
    this.notify({
      type: 'STATS_CHANGED',
      data: this.getStatistics(),
    });
  }
}

// Singleton
export const taskStore = new TaskStore();
```

#### Hook React useObserver

```typescript
// patterns/observer/useObserver.ts
export function useObserver<T>(
  observable: Observable<T>,
  callback?: Observer<T>
): void {
  const [, setUpdateCount] = useState(0);

  useEffect(() => {
    const observer: Observer<T> = (data: T) => {
      callback?.(data);

      // Forcer un re-render
      setUpdateCount(count => count + 1);
    };

    const unsubscribe = observable.subscribe(observer);

    // Se désabonner au démontage
    return unsubscribe;
  }, [observable, callback]);
}
```

### 🎯 Où dans l'Application ?

1. **Composant Statistics** : `components/Statistics.tsx`
   ```tsx
   const stats = useObservableValue(taskStore, () =>
     taskStore.getStatistics()
   );
   // Se met à jour automatiquement !
   ```

2. **Sauvegarde automatique** : `app/page.tsx`, `app/project/[id]/page.tsx`
   ```tsx
   useObserver(taskStore, () => {
     saveProjects(taskStore.getProjects());
   });
   ```

3. **Composant History** : `components/History.tsx`
   ```tsx
   useObserver(taskStore, () => {
     forceUpdate(); // Re-render quand historique change
   });
   ```

### ✅ Avantages

- ✅ Découplage entre les données et l'UI
- ✅ Mise à jour automatique des composants
- ✅ Facilite l'ajout de nouveaux observers
- ✅ S'intègre naturellement avec React
- ✅ Évite le props drilling

### ❌ Inconvénients

- ❌ Ordre des notifications non garanti
- ❌ Peut être difficile à déboguer
- ❌ Risque de fuites mémoire si on oublie de se désabonner

---

## 4. Interaction entre les Patterns

Les 3 patterns travaillent ensemble dans cette application :

```
┌─────────────────────────────────────────────────────────┐
│                    APPLICATION FLOW                     │
└─────────────────────────────────────────────────────────┘

1. L'utilisateur clique "Créer une tâche"
   └─> COMMAND : CreateTaskCommand est créée
       ├─> execute() ajoute la tâche au TaskGroup (COMPOSITE)
       └─> Ajoutée à l'historique du CommandManager

2. La commande notifie le TaskStore
   └─> OBSERVER : taskStore.notifyProjectChanged()
       ├─> Tous les composants abonnés sont notifiés
       └─> Statistics.tsx se met à jour automatiquement

3. L'utilisateur clique "Undo"
   └─> COMMAND : CommandManager.undo()
       ├─> La commande est annulée (tâche retirée)
       └─> Notification OBSERVER à nouveau

4. Les statistiques affichent le bon total
   └─> COMPOSITE : task.getTaskCount() calcule récursivement
```

### Exemple Concret

```typescript
// 1. COMPOSITE - Structure de données
const project = new TaskGroup('p1', 'Mon Projet', false, [
  new Task('t1', 'Tâche 1'),
  new TaskGroup('t2', 'Tâche 2', false, [
    new Task('t2.1', 'Sous-tâche 2.1'),
  ]),
]);

// 2. COMMAND - Action encapsulée
const newTask = new Task('t3', 'Nouvelle tâche');
const command = new CreateTaskCommand(
  newTask,
  project,
  () => taskStore.notifyProjectChanged() // 3. OBSERVER
);

// Exécuter
commandManager.execute(command);

// Les composants abonnés se mettent à jour automatiquement
// via useObserver() !
```

---

## 5. Avantages et Inconvénients

### Pourquoi ces Patterns ?

| Pattern | Problème résolu | Alternative |
|---------|----------------|-------------|
| **Composite** | Hiérarchie de tâches | Conditions partout (`if (hasChildren)`) |
| **Command** | Undo/Redo | Sauvegarder l'état complet (coûteux) |
| **Observer** | Sync automatique UI | Passer des callbacks partout (props drilling) |

### Quand NE PAS utiliser ces Patterns ?

❌ **Composite** : Si pas de hiérarchie (liste plate suffit)
❌ **Command** : Si pas besoin d'annulation (actions simples)
❌ **Observer** : Si React Context/Redux suffit pour votre cas

### Bénéfices de cette Approche

✅ **Maintenabilité** : Code organisé, responsabilités claires
✅ **Extensibilité** : Facile d'ajouter de nouveaux types de tâches/commandes
✅ **Testabilité** : Chaque pattern peut être testé indépendamment
✅ **Pédagogie** : Démontre les patterns dans un contexte réel

---

## 📖 Ressources Complémentaires

- **Livre de référence** : "Design Patterns: Elements of Reusable Object-Oriented Software" (Gang of Four)
- **En ligne** : [Refactoring.Guru - Design Patterns](https://refactoring.guru/design-patterns)
- **TypeScript** : [TypeScript Design Patterns](https://www.patterns.dev/)

---

## 🎯 Conclusion

Cette application démontre que les design patterns ne sont pas que de la théorie :

1. **Composite** rend le code hiérarchique élégant
2. **Command** rend l'undo/redo trivial
3. **Observer** synchronise l'UI automatiquement

Ensemble, ils créent une architecture **propre**, **maintenable** et **extensible**.

**Prochaines étapes possibles :**
- Ajouter le pattern **Strategy** pour différents algorithmes de tri
- Ajouter le pattern **Factory** pour créer différents types de tâches
- Ajouter le pattern **Decorator** pour ajouter des métadonnées aux tâches

---

**Développé pour démontrer les Design Patterns en pratique** 🎓
