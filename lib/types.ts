/**
 * Types globaux pour l'application
 */

// Ré-exporter les types des patterns pour éviter la duplication
import type { TaskComponent } from '@/patterns/composite/TaskComponent';
import type { Command } from '@/patterns/command/Command';
import type { CommandManager, SerializableCommandHistory } from '@/patterns/command/CommandManager';

// =============================================
// AUTH & USER TYPES
// =============================================

export interface User {
  id: string;
  email: string;
  fullName?: string;
  username?: string;
  avatarUrl?: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

// =============================================
// PROJECT TYPES
// =============================================

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  owner?: User; // Populated from join
  tasks: TaskComponent[];
  members?: ProjectMember[]; // Populated from join
  createdAt: Date;
  updatedAt: Date;
  // Client-side only (not stored in DB)
  commandManager?: CommandManager;
  savedHistory?: SerializableCommandHistory[];
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  user?: User; // Populated from join
  role: 'owner' | 'member';
  invitedBy?: string;
  invitedAt: Date;
  acceptedAt?: Date;
}

// =============================================
// TASK TYPES (from Supabase)
// =============================================

export interface TaskDB {
  id: string;
  projectId: string;
  parentId?: string;
  title: string;
  completed: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================
// COMMAND HISTORY (from Supabase)
// =============================================

export interface CommandHistoryDB {
  id: string;
  projectId: string;
  userId: string;
  description: string;
  createdAt: Date;
}

// =============================================
// LEGACY TYPES (to be phased out)
// =============================================

export interface AppState {
  projects: Project[];
  commandHistory: Command[];
  currentCommandIndex: number;
}

// Statistics
export interface Statistics {
  totalTasks: number;
  completedTasks: number;
  percentage: number;
  totalProjects?: number;
  totalUsers?: number; // For admin dashboard
}

// =============================================
// INVITATION TYPES
// =============================================

export interface Invitation {
  id: string;
  projectId: string;
  projectName: string;
  invitedBy: string;
  invitedByName?: string;
  invitedAt: Date;
  status: 'pending' | 'accepted' | 'rejected';
}

// =============================================
// ADMIN DASHBOARD TYPES
// =============================================

export interface AdminDashboardData {
  totalUsers: number;
  totalProjects: number;
  totalTasks: number;
  users: User[];
  projects: Project[];
}

// Ré-exporter pour faciliter les imports
export type { TaskComponent, Command };
