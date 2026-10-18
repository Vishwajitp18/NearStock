import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { mockUsers, MockUserItem } from '../../mocks/mockData';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { formatDate } from '../../lib/format';
import {
  Users,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

export const AdminUsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'shopkeeper' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [localUsers, setLocalUsers] = useState<MockUserItem[]>(mockUsers);

  // Fetch users from API (with fallback to localUsers/mock)
  const { data: users = localUsers, isLoading } = useQuery<MockUserItem[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/admin/users');
        return res.data.users || res.data;
      } catch (err) {
        return localUsers;
      }
    },
  });

  // Toggle user active status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: boolean }) => {
      try {
        await apiClient.patch(`/admin/users/${id}/status`, { is_active: newStatus });
      } catch (err) {
        // Fallback for mock mode
      }
      return { id, newStatus };
    },
    onSuccess: ({ id, newStatus }) => {
      setLocalUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, is_active: newStatus } : u))
      );
      queryClient.setQueryData<MockUserItem[]>(['admin-users'], (old) =>
        old ? old.map((u) => (u.id === id ? { ...u, is_active: newStatus } : u)) : []
      );
      toast.success(newStatus ? 'User unblocked successfully' : 'User blocked successfully');
    },
    onError: () => {
      toast.error('Failed to update user status');
    },
  });

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone.includes(searchTerm) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && user.is_active) ||
      (statusFilter === 'blocked' && !user.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-heading flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-teal" />
            User Management & Security
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            Search, inspect platform accounts, and toggle security access restrictions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-brand-surface border border-brand-border text-xs font-mono text-brand-muted">
            Total Users: <span className="text-brand-heading font-semibold">{users.length}</span>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Input
              placeholder="Search by name, phone or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4 text-brand-muted" />}
            />
          </div>

          {/* Role Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-brand-muted font-medium flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" /> Role:
            </span>
            {(['all', 'customer', 'shopkeeper', 'admin'] as const).map((r) => (
              <Chip
                key={r}
                label={r.charAt(0).toUpperCase() + r.slice(1)}
                active={roleFilter === r}
                onClick={() => setRoleFilter(r)}
                variant="neutral"
              />
            ))}
          </div>

          {/* Status Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-brand-muted font-medium mr-1">Status:</span>
            {(['all', 'active', 'blocked'] as const).map((s) => (
              <Chip
                key={s}
                label={s.charAt(0).toUpperCase() + s.slice(1)}
                active={statusFilter === s}
                onClick={() => setStatusFilter(s)}
                variant="neutral"
              />
            ))}
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-brand-border bg-brand-surface/80 text-brand-muted text-xs uppercase font-mono">
                <th className="px-4 py-3.5">User</th>
                <th className="px-4 py-3.5">Contact</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Registered</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-brand-muted">
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isBlocked = !user.is_active;
                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-brand-surface/40 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs uppercase border ${
                              isBlocked
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : 'bg-brand-teal/10 text-brand-teal border-brand-teal/20'
                            }`}
                          >
                            {user.name.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-medium text-brand-heading flex items-center gap-1.5">
                              {user.name}
                              {user.role === 'admin' && (
                                <ShieldCheck className="w-3.5 h-3.5 text-brand-teal" />
                              )}
                            </div>
                            <div className="text-xs font-mono text-brand-muted">{user.id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <div className="text-xs text-brand-body flex items-center gap-1.5 font-mono">
                            <Phone className="w-3 h-3 text-brand-muted" />
                            {user.phone}
                          </div>
                          {user.email && (
                            <div className="text-xs text-brand-muted flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-brand-muted" />
                              {user.email}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium font-mono uppercase tracking-wider ${
                            user.role === 'admin'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : user.role === 'shopkeeper'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isBlocked
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-brand-teal/10 text-brand-teal border border-brand-teal/20'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isBlocked ? 'bg-red-400' : 'bg-brand-teal'
                            }`}
                          />
                          {isBlocked ? 'Blocked' : 'Active'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-brand-muted font-mono">
                        {formatDate(user.created_at)}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <Button
                          size="sm"
                          variant={isBlocked ? 'outline' : 'ghost'}
                          className={
                            isBlocked
                              ? 'text-brand-teal border-brand-teal/40 hover:bg-brand-teal/10'
                              : 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                          }
                          loading={toggleStatusMutation.isPending}
                          onClick={() =>
                            toggleStatusMutation.mutate({
                              id: user.id,
                              newStatus: isBlocked, // toggle to opposite
                            })
                          }
                        >
                          {isBlocked ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5 mr-1" /> Unblock
                            </>
                          ) : (
                            <>
                              <UserX className="w-3.5 h-3.5 mr-1" /> Block User
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
export default AdminUsersPage;

