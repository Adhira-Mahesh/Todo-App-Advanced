'use client';

import { useState, useEffect, useTransition } from 'react';
import { getUsers, addUser, deleteUser, updateUserRole } from './actions';
import { logoutUser } from '@/app/auth/actions';
import {
  Users, UserPlus, Trash2, Shield, ShieldOff, CheckSquare,
  X, AlertCircle, CheckCircle, Crown, User, LogOut, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [notification, setNotification] = useState(null); // { message, type: 'success'|'error' }
  const [confirmDelete, setConfirmDelete] = useState(null); // userId to confirm
  const [isPending, startTransition] = useTransition();

  // Add user form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('USER');

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch {
      showNotification('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set('name', formName);
    formData.set('email', formEmail);
    formData.set('password', formPassword);
    formData.set('role', formRole);

    startTransition(async () => {
      const result = await addUser(formData);
      if (result?.error) {
        showNotification(result.error, 'error');
      } else {
        showNotification('User added successfully!');
        setIsAddModalOpen(false);
        setFormName(''); setFormEmail(''); setFormPassword(''); setFormRole('USER');
        loadUsers();
      }
    });
  };

  const handleDeleteUser = async (userId) => {
    startTransition(async () => {
      const result = await deleteUser(userId);
      if (result?.error) {
        showNotification(result.error, 'error');
      } else {
        showNotification('User deleted.');
        setConfirmDelete(null);
        loadUsers();
      }
    });
  };

  const handleRoleChange = async (userId, newRole) => {
    startTransition(async () => {
      const result = await updateUserRole(userId, newRole);
      if (result?.error) {
        showNotification(result.error, 'error');
      } else {
        showNotification(`Role changed to ${newRole}`);
        loadUsers();
      }
    });
  };

  const adminCount = users.filter(u => u.role === 'ADMIN').length;
  const userCount = users.filter(u => u.role === 'USER').length;

  return (
    <div className="min-h-screen bg-background text-on-background font-sans">

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl border animate-in fade-in slide-in-from-bottom-4 duration-200 ${
          notification.type === 'error'
            ? 'bg-error text-on-error border-error'
            : 'bg-primary text-on-primary border-primary'
        }`}>
          {notification.type === 'error'
            ? <AlertCircle size={18} />
            : <CheckCircle size={18} />}
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-[260px] bg-surface-container-low dark:bg-surface-dim border-r border-outline-variant flex flex-col p-5 gap-4 z-40">
        <div className="flex items-center gap-3 py-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
            <CheckSquare size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-primary leading-none">Workspace</h2>
            <p className="text-xs text-on-surface-variant mt-0.5 font-medium">Admin Panel</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 mt-2">
          <Link
            href="/dashboard"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors text-sm font-medium"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-container-highest text-primary font-bold text-sm">
            <Users size={16} /> User Management
          </div>
        </nav>

        <div className="pt-4 border-t border-outline-variant">
          <form action={logoutUser}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-error hover:bg-error-container hover:text-on-error-container transition-colors text-sm font-medium cursor-pointer"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-[260px] p-8 min-h-screen">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Header */}
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-on-background">User Management</h1>
              <p className="text-on-surface-variant mt-1">Manage accounts, assign roles, and control access.</p>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-primary text-on-primary px-5 py-3 rounded-xl font-bold text-sm shadow-md hover:shadow-lg hover:opacity-95 transition-all active:scale-95 cursor-pointer"
            >
              <UserPlus size={16} /> Add User
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Users', value: users.length, icon: Users, color: 'text-primary' },
              { label: 'Admins', value: adminCount, icon: Crown, color: 'text-amber-500' },
              { label: 'Regular Users', value: userCount, icon: User, color: 'text-secondary' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-surface-container-lowest dark:bg-surface-container rounded-2xl p-5 border border-outline-variant/30 shadow-sm flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl bg-surface-container flex items-center justify-center ${color}`}>
                  <Icon size={22} />
                </div>
                <div>
                  <p className="text-2xl font-black text-on-background">{loading ? '—' : value}</p>
                  <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Users Table */}
          <div className="bg-surface-container-lowest dark:bg-surface-container rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/30 flex items-center justify-between">
              <h2 className="font-bold text-on-surface">All Users</h2>
              <span className="text-xs bg-primary-container text-on-primary-container px-3 py-1 rounded-full font-bold">
                {users.length} {users.length === 1 ? 'account' : 'accounts'}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-on-surface-variant">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
                Loading users...
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant gap-3">
                <Users size={40} className="opacity-30" />
                <p className="font-semibold">No users found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-outline-variant/20 text-xs text-on-surface-variant font-extrabold uppercase tracking-wider">
                    <th className="text-left px-6 py-3">Name</th>
                    <th className="text-left px-6 py-3">Email</th>
                    <th className="text-left px-6 py-3">Role</th>
                    <th className="text-left px-6 py-3">Joined</th>
                    <th className="text-right px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-surface-container-low dark:hover:bg-surface transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                            user.role === 'ADMIN' ? 'bg-amber-100 text-amber-700' : 'bg-primary-container text-on-primary-container'
                          }`}>
                            {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                          </div>
                          <span className="font-semibold text-on-background text-sm">
                            {user.name || <span className="text-on-surface-variant italic">No name</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          user.role === 'ADMIN'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}>
                          {user.role === 'ADMIN' ? <Crown size={11} /> : <User size={11} />}
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant">
                        {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* Role Toggle Button */}
                          <button
                            onClick={() => handleRoleChange(user.id, user.role === 'ADMIN' ? 'USER' : 'ADMIN')}
                            disabled={isPending}
                            title={user.role === 'ADMIN' ? 'Demote to User' : 'Promote to Admin'}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50 ${
                              user.role === 'ADMIN'
                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50'
                                : 'bg-surface-container text-on-surface-variant hover:bg-primary-container hover:text-on-primary-container'
                            }`}
                          >
                            {user.role === 'ADMIN' ? <ShieldOff size={12} /> : <Shield size={12} />}
                            {user.role === 'ADMIN' ? 'Demote' : 'Make Admin'}
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setConfirmDelete(user.id)}
                            disabled={isPending}
                            title="Delete user"
                            className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error-container/50 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-hidden animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest dark:bg-surface-container w-full max-w-md rounded-2xl p-6 shadow-2xl border border-outline-variant/50 space-y-5 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold">Add New User</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-full hover:bg-surface-container-high text-outline cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-outline uppercase tracking-wider">Full Name</label>
                <input
                  type="text" value={formName} onChange={e => setFormName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full bg-surface-container-low dark:bg-surface border border-outline-variant/60 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-outline uppercase tracking-wider">Email *</label>
                <input
                  type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)}
                  placeholder="jane@example.com" required
                  className="w-full bg-surface-container-low dark:bg-surface border border-outline-variant/60 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-outline uppercase tracking-wider">Password *</label>
                <input
                  type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)}
                  placeholder="Min. 6 characters" required minLength={6}
                  className="w-full bg-surface-container-low dark:bg-surface border border-outline-variant/60 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-outline uppercase tracking-wider block">Role</label>
                <div className="grid grid-cols-2 gap-3">
                  {['USER', 'ADMIN'].map(r => (
                    <button
                      key={r} type="button" onClick={() => setFormRole(r)}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                        formRole === r
                          ? r === 'ADMIN'
                            ? 'border-amber-400 bg-amber-100 text-amber-700'
                            : 'border-primary bg-primary-container text-on-primary-container'
                          : 'border-outline-variant/50 text-on-surface-variant hover:border-primary'
                      }`}
                    >
                      {r === 'ADMIN' ? <Crown size={14} /> : <User size={14} />}
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button" onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 border border-outline-variant/60 text-on-surface-variant rounded-xl text-sm font-bold cursor-pointer hover:bg-surface-container-low"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={isPending}
                  className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-bold shadow-sm cursor-pointer hover:opacity-95 disabled:opacity-60 flex items-center gap-2"
                >
                  {isPending ? (
                    <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Creating...</>
                  ) : (
                    <><UserPlus size={14} /> Create User</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-hidden animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest dark:bg-surface-container w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-outline-variant/50 space-y-5 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 bg-error-container rounded-full flex items-center justify-center">
                <Trash2 size={22} className="text-error" />
              </div>
              <h3 className="text-lg font-extrabold text-on-background">Delete User?</h3>
              <p className="text-sm text-on-surface-variant">This action is permanent and cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 border border-outline-variant/60 text-on-surface-variant rounded-xl text-sm font-bold cursor-pointer hover:bg-surface-container-low"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(confirmDelete)}
                disabled={isPending}
                className="flex-1 py-2.5 bg-error text-on-error rounded-xl text-sm font-bold cursor-pointer hover:opacity-95 disabled:opacity-60"
              >
                {isPending ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
