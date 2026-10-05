'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { 
  ShieldAlert, 
  Users, 
  FileText, 
  Settings, 
  UserPlus, 
  Lock, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  Calendar, 
  Activity,
  AlertTriangle,
  RefreshCw,
  Edit2
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function AdminPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'settings'>('users');

  // Audit filter state
  const [auditActionFilter, setAuditActionFilter] = useState<string>('');

  // Create user modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('Password123!');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'manager' | 'rm' | 'analyst'>('rm');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Fetch users
  const { data: usersList, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      return res.data;
    },
    enabled: user?.role === 'admin'
  });

  // Fetch audit logs
  const { data: auditLogs, isLoading: auditLoading, refetch: refetchAudit } = useQuery({
    queryKey: ['admin-audit', auditActionFilter],
    queryFn: async () => {
      const url = auditActionFilter
        ? `/admin/audit?action=${auditActionFilter}&limit=100`
        : '/admin/audit?limit=100';
      const res = await api.get(url);
      return res.data;
    },
    enabled: user?.role === 'admin'
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    try {
      await api.post('/admin/users', {
        email: newUserEmail,
        full_name: newUserName,
        password: newUserPassword,
        role: newUserRole,
        is_active: true
      });
      setIsCreateOpen(false);
      setNewUserEmail('');
      setNewUserName('');
      refetchUsers();
    } catch (err: any) {
      setCreateError(err.response?.data?.detail || 'Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}`, {
        is_active: !currentStatus
      });
      refetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update user status');
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      await api.patch(`/admin/users/${userId}`, {
        role: newRole
      });
      refetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update user role');
    }
  };

  // RBAC Access Check
  if (user && user.role !== 'admin') {
    return (
      <div className="py-24 text-center max-w-md mx-auto">
        <div className="p-4 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 inline-block mb-4">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Access Restricted
        </h2>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          The Administration Console is strictly reserved for users with the <strong>Admin</strong> role. Your current role is <strong>{user.role.toUpperCase()}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Lock className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              System Administration & Security Auditing
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage authorized staff roles, monitor immutable compliance audit trails, and maintain governance controls.
          </p>
        </div>

        {activeTab === 'users' && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Provision User
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'users'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Staff Directory ({usersList?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'audit'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Audit Trail Log ({auditLogs?.length || 0})
        </button>
      </div>

      {/* Tab 1: User Directory */}
      {activeTab === 'users' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Account Status</th>
                  <th className="px-4 py-3">Member Since</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {usersList?.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{u.full_name}</div>
                      <div className="text-xs text-slate-400">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleChangeRole(u.id, e.target.value)}
                        className="px-2.5 py-1 rounded-md text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="rm">RM</option>
                        <option value="analyst">Analyst</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold ${
                          u.is_active ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleToggleActive(u.id, u.is_active)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                          u.is_active
                            ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                            : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Audit Trail Log */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"
              >
                <option value="">All Security Events</option>
                <option value="user_login">User Login</option>
                <option value="predict_single">Single Inference</option>
                <option value="batch_upload">Batch Upload</option>
                <option value="campaign_create">Campaign Created</option>
                <option value="model_promote">Model Promoted</option>
                <option value="report_export_pdf">Report Export (PDF)</option>
                <option value="report_export_csv">Report Export (CSV)</option>
              </select>
            </div>

            <button
              onClick={() => refetchAudit()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Events
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Actor / User</th>
                    <th className="px-4 py-3">Action Type</th>
                    <th className="px-4 py-3">Target Entity</th>
                    <th className="px-4 py-3">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {auditLogs?.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 font-sans font-medium text-slate-900 dark:text-white">
                        {log.user_email || 'System Daemon'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                        {log.entity_type ? `${log.entity_type}:${log.entity_id?.slice(0, 8)}...` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400">
                        {log.ip_address || '127.0.0.1'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Provision User Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Provision New Staff Member
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Jordan Hayes"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="jordan.hayes@churnguard.io"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Initial Password
                </label>
                <input
                  type="password"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Assigned RBAC Role
                </label>
                <select
                  value={newUserRole}
                  onChange={(e: any) => setNewUserRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                >
                  <option value="rm">Relationship Manager (RM)</option>
                  <option value="manager">Retention Manager</option>
                  <option value="analyst">Data Analyst (Masked PII)</option>
                  <option value="admin">System Administrator</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
                >
                  {createLoading ? 'Provisioning...' : 'Provision User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
