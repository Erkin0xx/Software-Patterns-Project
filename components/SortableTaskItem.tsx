/**
 * SortableTaskItem - Wrapper for TaskItem with drag and drop functionality
 * Supports recursive drag and drop for subtasks
 */

'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskComponent } from '@/patterns/composite/TaskComponent';
import { GripVertical, Check, Trash2, Edit2, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface SortableTaskItemProps {
  task: TaskComponent;
  onToggle: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onEdit: (taskId: string, newTitle: string) => void;
  onAddSubtask?: (parentId: string, title: string) => void;
  onReorderSubtasks?: (parentId: string, reorderedChildren: TaskComponent[]) => void;
  level?: number;
}

export function SortableTaskItem({
  task,
  onToggle,
  onDelete,
  onEdit,
  onAddSubtask,
  onReorderSubtasks,
  level = 0,
}: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSaveEdit = () => {
    if (editTitle.trim()) {
      onEdit(task.id, editTitle.trim());
      setIsEditing(false);
    }
  };

  const handleAddSubtask = () => {
    if (subtaskTitle.trim()) {
      onAddSubtask?.(task.id, subtaskTitle.trim());
      setSubtaskTitle('');
      setIsAddingSubtask(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !task.children) return;

    const oldIndex = task.children.findIndex((child) => child.id === active.id);
    const newIndex = task.children.findIndex((child) => child.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedChildren = arrayMove(task.children, oldIndex, newIndex);
    onReorderSubtasks?.(task.id, reorderedChildren);
  };

  const indentClass = level === 0 ? '' : 'ml-8';

  return (
    <div ref={setNodeRef} style={style} className={indentClass}>
      <div className="bg-card border border-border rounded-xl p-4 mb-2 hover:shadow-md transition-shadow group">
        <div className="flex items-center gap-3">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded flex-shrink-0"
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Checkbox */}
          <button
            onClick={() => onToggle(task.id)}
            className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
              task.completed
                ? 'bg-success border-success'
                : 'border-border hover:border-primary'
            }`}
          >
            {task.completed && <Check className="w-4 h-4 text-white" />}
          </button>

          {/* Title or Edit Input */}
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') {
                  setEditTitle(task.title);
                  setIsEditing(false);
                }
              }}
              className="flex-1 px-2 py-1 border border-primary bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          ) : (
            <span
              className={`flex-1 ${
                task.completed ? 'line-through text-muted-foreground' : 'text-foreground'
              }`}
            >
              {task.title}
            </span>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {!isEditing && level < 1 && onAddSubtask && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsAddingSubtask(!isAddingSubtask)}
                className="h-8 w-8"
                title="Add subtask"
              >
                <Plus className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(task.id)}
              className="h-8 w-8 hover:text-destructive"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats for tasks with children */}
        {task.children && task.children.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            {task.getCompletedCount()} / {task.getTaskCount() - 1} subtasks completed
          </div>
        )}
      </div>

      {/* Add Subtask Form */}
      {isAddingSubtask && (
        <div className="ml-8 mb-2 bg-secondary/50 border border-border rounded-xl p-3">
          <input
            type="text"
            value={subtaskTitle}
            onChange={(e) => setSubtaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddSubtask();
              if (e.key === 'Escape') {
                setSubtaskTitle('');
                setIsAddingSubtask(false);
              }
            }}
            placeholder="Subtask title..."
            className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <Button onClick={handleAddSubtask} className="rounded-xl" size="sm">
              Add
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSubtaskTitle('');
                setIsAddingSubtask(false);
              }}
              className="rounded-xl"
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Recursive Subtasks with Drag and Drop */}
      {task.children && task.children.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={task.children.map((child) => child.id)}
            strategy={verticalListSortingStrategy}
          >
            {task.children.map((child) => (
              <SortableTaskItem
                key={child.id}
                task={child}
                onToggle={onToggle}
                onDelete={onDelete}
                onEdit={onEdit}
                onAddSubtask={onAddSubtask}
                onReorderSubtasks={onReorderSubtasks}
                level={level + 1}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
