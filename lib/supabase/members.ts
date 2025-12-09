/**
 * Supabase functions for project member management
 * Handles inviting users, managing roles, and permissions
 */

import { createClient } from './client';

export type MemberRole = 'viewer' | 'editor' | 'admin';

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: MemberRole;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    email: string;
    full_name?: string;
  };
}

/**
 * Get all members of a project
 */
export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const supabase = createClient();

  // First, get all members
  const { data, error } = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', projectId)
    .order('accepted_at', { ascending: true });

  if (error) {
    console.error('Error fetching project members:', error);
    throw new Error(error.message);
  }

  // For now, return without user details (we can add a users table later)
  return (data || []).map((member: any) => ({
    id: member.id,
    project_id: member.project_id,
    user_id: member.user_id,
    role: member.role,
    invited_by: member.invited_by,
    created_at: member.accepted_at || new Date().toISOString(),
    updated_at: member.accepted_at || new Date().toISOString(),
    user: {
      email: member.user_id, // Display user ID for now
      full_name: undefined,
    },
  }));
}

/**
 * Get user's role in a project
 * Returns 'owner' if user owns the project, or their role as a member
 */
export async function getUserProjectRole(
  projectId: string,
  userId: string
): Promise<MemberRole | 'owner' | null> {
  const supabase = createClient();

  // Check if user is the owner
  const { data: project } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .single();

  if (project?.owner_id === userId) {
    return 'owner';
  }

  // Check if user is a member
  const { data: member } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single();

  return member?.role || null;
}

/**
 * Invite a user to a project by email
 * Returns the created member record
 */
export async function inviteUserToProject(
  projectId: string,
  email: string,
  role: MemberRole = 'viewer'
): Promise<ProjectMember> {
  const supabase = createClient();

  // For now, we'll need the user to provide the user ID instead of email
  // This is a limitation since we can't query auth.users directly
  // TODO: Create a users table or use an RPC function
  throw new Error('Inviting by email is not yet supported. Please use user ID instead.');

  const userId = email; // Placeholder

  // Get current user ID for invited_by
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    throw new Error('You must be logged in to invite users');
  }

  // Add the user as a project member
  const { data, error } = await supabase
    .from('project_members')
    .insert({
      project_id: projectId,
      user_id: userId,
      role,
      invited_by: currentUser.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      // Unique constraint violation
      throw new Error('User is already a member of this project');
    }
    console.error('Error inviting user:', error);
    throw new Error(error.message);
  }

  return data as ProjectMember;
}

/**
 * Update a member's role
 */
export async function updateMemberRole(
  memberId: string,
  newRole: MemberRole
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('project_members')
    .update({ role: newRole })
    .eq('id', memberId);

  if (error) {
    console.error('Error updating member role:', error);
    throw new Error(error.message);
  }
}

/**
 * Remove a member from a project
 */
export async function removeMember(memberId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('id', memberId);

  if (error) {
    console.error('Error removing member:', error);
    throw new Error(error.message);
  }
}

/**
 * Leave a project (remove yourself as a member)
 */
export async function leaveProject(projectId: string): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be logged in');
  }

  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error leaving project:', error);
    throw new Error(error.message);
  }
}

/**
 * Check if user can perform an action based on their role
 */
export function canPerformAction(
  userRole: MemberRole | 'owner' | null,
  requiredRole: MemberRole | 'owner'
): boolean {
  if (!userRole) return false;

  const roleHierarchy: Record<string, number> = {
    viewer: 1,
    editor: 2,
    admin: 3,
    owner: 4,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}
