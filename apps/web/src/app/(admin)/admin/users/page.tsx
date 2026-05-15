'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { adminApi } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  Search,
  Shield,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Ban,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  UserCheck,
  UserX,
} from 'lucide-react';

interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatar?: string;
  role: string;
  isVerified: boolean;
  isBanned: boolean;
  isShadowBanned: boolean;
  followersCount: number;
  createdAt: string;
}

const ROLES = ['USER', 'MODERATOR', 'ADMIN'];

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
      router.push('/');
      return;
    }
  }, [user, isAuthenticated, router]);

  const fetchUsers = useCallback(async (searchQuery?: string, pageCursor?: string) => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({
        limit: 20,
        cursor: pageCursor,
        search: searchQuery || undefined,
      });
      setUsers(res.data.data.users);
      setNextCursor(res.data.data.nextCursor);
      setCursor(pageCursor);
    } catch {
      router.push('/');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUsers(search);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(search);
  };

  const handleUserAction = async (userId: string, action: string) => {
    setActionLoading(userId);
    try {
      await adminApi.updateUser(userId, { action, reason: 'Admin action' });
      await fetchUsers(search, cursor);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
      setOpenMenu(null);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="mt-1 text-gray-500">Manage platform users</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by username or email..."
          className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </form>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Followers</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <motion.tr
                  key={u.id}
                  className="bg-white transition-colors hover:bg-gray-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.username} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          u.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{u.displayName || u.username}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        u.role === 'ADMIN'
                          ? 'bg-red-100 text-red-700'
                          : u.role === 'MODERATOR'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {u.isVerified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          <CheckCircle className="h-3 w-3" /> Verified
                        </span>
                      )}
                      {u.isBanned && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          <Ban className="h-3 w-3" /> Banned
                        </span>
                      )}
                      {u.isShadowBanned && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          <EyeOff className="h-3 w-3" /> Shadowbanned
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatNumber(u.followersCount)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {openMenu === u.id && (
                          <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                            {!u.isVerified && (
                              <button
                                onClick={() => handleUserAction(u.id, 'verify')}
                                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                              >
                                <CheckCircle className="h-4 w-4" /> Verify
                              </button>
                            )}
                            {!u.isBanned && (
                              <button
                                onClick={() => handleUserAction(u.id, 'ban')}
                                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-gray-50"
                              >
                                <Ban className="h-4 w-4" /> Ban
                              </button>
                            )}
                            {u.isBanned && (
                              <button
                                onClick={() => handleUserAction(u.id, 'unban')}
                                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-emerald-600 transition-colors hover:bg-gray-50"
                              >
                                <UserCheck className="h-4 w-4" /> Unban
                              </button>
                            )}
                            {!u.isShadowBanned && (
                              <button
                                onClick={() => handleUserAction(u.id, 'shadowban')}
                                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                              >
                                <EyeOff className="h-4 w-4" /> Shadowban
                              </button>
                            )}
                            {user?.role === 'ADMIN' &&
                              ROLES.filter((r) => r !== u.role).map((role) => (
                                <button
                                  key={role}
                                  onClick={() => handleUserAction(u.id, `role:${role}`)}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                                >
                                  <Shield className="h-4 w-4" /> Set {role}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                      {actionLoading === u.id && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <p className="px-6 py-8 text-center text-sm text-gray-500">No users found</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{users.length} users</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchUsers(search, undefined)}
            disabled={!cursor}
            className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition-colors disabled:opacity-50 hover:bg-gray-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <button
            onClick={() => fetchUsers(search, nextCursor)}
            disabled={!nextCursor}
            className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition-colors disabled:opacity-50 hover:bg-gray-50 disabled:cursor-not-allowed"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
