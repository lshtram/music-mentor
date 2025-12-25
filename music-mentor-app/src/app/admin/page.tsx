'use client';

import { useState } from 'react';

interface AdminUser {
  id: string;
  email?: string | null;
  createdAt?: string | null;
  lastSignInAt?: string | null;
}

export default function AdminPage() {
  const [secret, setSecret] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetUserId, setResetUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const loadUsers = async () => {
    setError('');
    setStatus('');
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        headers: { 'x-admin-secret': secret },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load users');
      }
      setUsers(data.users || []);
      setStatus('Loaded users.');
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setError('');
    setStatus('');
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': secret,
        },
        body: JSON.stringify({ userId: resetUserId, password: newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }
      setStatus('Password reset.');
      setNewPassword('');
      setResetUserId('');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-12 max-w-4xl">
      <h1 className="text-4xl font-serif mb-8">Admin</h1>

      <div className="mb-8">
        <label className="block text-sm text-muted mb-2">Admin secret</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Enter ADMIN_SECRET"
            className="flex-1 px-3 py-2 bg-transparent border-b divider focus:outline-none"
          />
          <button
            onClick={loadUsers}
            disabled={!secret || loading}
            className="text-sm underline decoration-transparent hover:decoration-current underline-offset-4 disabled:text-muted"
          >
            {loading ? 'Loading...' : 'Load users'}
          </button>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-serif mb-4">Reset password</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={resetUserId}
            onChange={(e) => setResetUserId(e.target.value)}
            placeholder="User ID"
            className="px-3 py-2 bg-transparent border-b divider focus:outline-none"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            className="px-3 py-2 bg-transparent border-b divider focus:outline-none"
          />
          <button
            onClick={resetPassword}
            disabled={!secret || !resetUserId || !newPassword || loading}
            className="text-sm underline decoration-transparent hover:decoration-current underline-offset-4 disabled:text-muted"
          >
            {loading ? 'Saving...' : 'Reset'}
          </button>
        </div>
      </div>

      {error && <p className="text-red-700 mb-4">{error}</p>}
      {status && <p className="text-[var(--accent)] mb-4">{status}</p>}

      <div>
        <h2 className="text-2xl font-serif mb-4">Users</h2>
        {users.length === 0 ? (
          <p className="text-muted">No users loaded.</p>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="pb-3 border-b divider">
                <p className="text-sm text-muted">ID: {user.id}</p>
                <p className="text-sm text-muted">Email: {user.email || '—'}</p>
                <p className="text-xs text-muted">Created: {user.createdAt || '—'}</p>
                <p className="text-xs text-muted">Last sign-in: {user.lastSignInAt || '—'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
