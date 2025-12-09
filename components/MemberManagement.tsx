/**
 * Component for managing project members
 * Allows inviting users, changing roles, and removing members
 */

'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Crown, Shield, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getProjectMembers,
  inviteUserToProject,
  updateMemberRole,
  removeMember,
  canPerformAction,
  type ProjectMember,
  type MemberRole,
} from '@/lib/supabase/members';

interface MemberManagementProps {
  projectId: string;
  currentUserRole: MemberRole | 'owner' | null;
}

export function MemberManagement({ projectId, currentUserRole }: MemberManagementProps) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('viewer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canManageMembers = canPerformAction(currentUserRole, 'admin');

  useEffect(() => {
    loadMembers();
  }, [projectId]);

  const loadMembers = async () => {
    try {
      const data = await getProjectMembers(projectId);
      setMembers(data);
    } catch (err: any) {
      console.error('Failed to load members:', err);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await inviteUserToProject(projectId, inviteEmail.trim(), inviteRole);
      await loadMembers();
      setInviteEmail('');
      setInviteRole('viewer');
      setIsInviting(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: MemberRole) => {
    try {
      await updateMemberRole(memberId, newRole);
      await loadMembers();
    } catch (err: any) {
      alert('Failed to update role: ' + err.message);
    }
  };

  const handleRemove = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Remove ${memberEmail} from this project?`)) {
      return;
    }

    try {
      await removeMember(memberId);
      await loadMembers();
    } catch (err: any) {
      alert('Failed to remove member: ' + err.message);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />;
      case 'editor':
        return <Users className="w-4 h-4 text-green-500" />;
      case 'viewer':
        return <Eye className="w-4 h-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getRoleLabel = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <Card className="rounded-2xl border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-foreground" />
          <h2 className="text-xl font-semibold text-foreground">Members</h2>
          <span className="text-sm text-muted-foreground">({members.length})</span>
        </div>

        {canManageMembers && (
          <Button
            onClick={() => setIsInviting(true)}
            className="rounded-xl"
            size="sm"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite
          </Button>
        )}
      </div>

      {/* Members List */}
      <div className="space-y-2">
        {members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No members yet. Invite someone to collaborate!
          </div>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-secondary/20 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {member.user?.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-foreground">
                    {member.user?.full_name || member.user?.email}
                  </div>
                  {member.user?.full_name && (
                    <div className="text-xs text-muted-foreground">
                      {member.user.email}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canManageMembers ? (
                  <>
                    <Select
                      value={member.role}
                      onValueChange={(value) =>
                        handleRoleChange(member.id, value as MemberRole)
                      }
                    >
                      <SelectTrigger className="w-32 rounded-xl">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(member.role)}
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">
                          <div className="flex items-center gap-2">
                            {getRoleIcon('viewer')}
                            Viewer
                          </div>
                        </SelectItem>
                        <SelectItem value="editor">
                          <div className="flex items-center gap-2">
                            {getRoleIcon('editor')}
                            Editor
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            {getRoleIcon('admin')}
                            Admin
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:text-destructive"
                      onClick={() => handleRemove(member.id, member.user?.email || '')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary">
                    {getRoleIcon(member.role)}
                    <span className="text-sm font-medium">
                      {getRoleLabel(member.role)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Invite Dialog */}
      <Dialog open={isInviting} onOpenChange={setIsInviting}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>
              Invite someone to collaborate on this project by entering their email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
                {error}
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full px-4 py-2 border border-border bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Role</label>
              <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as MemberRole)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      {getRoleIcon('viewer')}
                      <div>
                        <div className="font-medium">Viewer</div>
                        <div className="text-xs text-muted-foreground">Can view tasks</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="editor">
                    <div className="flex items-center gap-2">
                      {getRoleIcon('editor')}
                      <div>
                        <div className="font-medium">Editor</div>
                        <div className="text-xs text-muted-foreground">Can edit tasks</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      {getRoleIcon('admin')}
                      <div>
                        <div className="font-medium">Admin</div>
                        <div className="text-xs text-muted-foreground">Can manage members</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsInviting(false);
                  setInviteEmail('');
                  setError('');
                }}
                className="rounded-xl"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleInvite}
                disabled={loading || !inviteEmail.trim()}
                className="rounded-xl"
              >
                {loading ? 'Inviting...' : 'Send Invite'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
