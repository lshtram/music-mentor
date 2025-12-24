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
    <div className="container mx-auto p-6 text-gray-100">
      <h1 className="text-3xl font-bold mb-4">Admin</h1>

      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <label className="block text-sm text-gray-300 mb-2">Admin secret</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Enter ADMIN_SECRET"
            className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-md"
          />
          <button
            onClick={loadUsers}
            disabled={!secret || loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md disabled:bg-gray-600"
          >
            {loading ? 'Loading...' : 'Load users'}
          </button>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Reset password</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={resetUserId}
            onChange={(e) => setResetUserId(e.target.value)}
            placeholder="User ID"
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-md"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-md"
          />
          <button
            onClick={resetPassword}
            disabled={!secret || !resetUserId || !newPassword || loading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md disabled:bg-gray-600"
          >
            {loading ? 'Saving...' : 'Reset'}
          </button>
        </div>
      </div>

      {error && <p className="text-red-300 mb-4">{error}</p>}
      {status && <p className="text-green-300 mb-4">{status}</p>}

      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Users</h2>
        {users.length === 0 ? (
          <p className="text-gray-400">No users loaded.</p>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="bg-gray-900 p-3 rounded-md border border-gray-700">
                <p className="text-sm text-gray-300">ID: {user.id}</p>
                <p className="text-sm text-gray-300">Email: {user.email || '—'}</p>
                <p className="text-xs text-gray-500">Created: {user.createdAt || '—'}</p>
                <p className="text-xs text-gray-500">Last sign-in: {user.lastSignInAt || '—'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
