'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { adminApi } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  Shield,
  Ban,
  EyeOff,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Plus,
  X,
} from 'lucide-react';

interface ModerationAction {
  id: string;
  moderator: { id: string; username: string };
  targetUser: { id: string; username: string };
  action: string;
  reason: string;
  duration?: number;
  createdAt: string;
}

const ACTION_TYPES = ['warning', 'ban', 'shadowban', 'unban', 'content_removal', 'account_suspension', 'role_change'];

const actionIcons: Record<string, React.ElementType> = {
  warning: AlertTriangle,
  ban: Ban,
  shadowban: EyeOff,
  unban: CheckCircle,
  content_removal: Trash2,
  account_suspension: Shield,
  role_change: Shield,
};

const actionColors: Record<string, string> = {
  warning: 'bg-amber-100 text-amber-700',
  ban: 'bg-red-100 text-red-700',
  shadowban: 'bg-orange-100 text-orange-700',
  unban: 'bg-emerald-100 text-emerald-700',
  content_removal: 'bg-gray-100 text-gray-700',
  account_suspension: 'bg-red-100 text-red-700',
  role_change: 'bg-blue-100 text-blue-700',
};

export default function AdminModerationPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [actions, setActions] = useState<ModerationAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    action: 'warning',
    reason: '',
    duration: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
      router.push('/');
      return;
    }
  }, [user, isAuthenticated, router]);

  const fetchActions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getModerationActions();
      setActions(res.data.data);
    } catch {
      router.push('/');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminApi.createModerationAction({
        userId: formData.userId,
        action: formData.action,
        reason: formData.reason,
        duration: formData.duration ? parseInt(formData.duration) : undefined,
      });
      setFormData({ userId: '', action: 'warning', reason: '', duration: '' });
      setShowForm(false);
      await fetchActions();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && actions.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-900">Moderation Log</h1>
          <p className="mt-1 text-gray-500">All moderation actions</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'New Action'}
        </button>
      </div>

      {showForm && (
        <motion.div
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Create Moderation Action</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Target User ID</label>
                <input
                  type="text"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  placeholder="user_id"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Action Type</label>
                <select
                  value={formData.action}
                  onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {ACTION_TYPES.map((action) => (
                    <option key={action} value={action}>
                      {action.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Reason</label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Reason for this action..."
                required
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Duration (hours, optional)</label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="Leave empty for permanent"
                min={1}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Action
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="space-y-3">
        {actions.map((action, i) => {
          const Icon = actionIcons[action.action] || Shield;
          return (
            <motion.div
              key={action.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex items-start gap-3">
                <div className={`rounded-lg p-2 ${actionColors[action.action] || 'bg-gray-100 text-gray-700'}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{action.moderator.username}</span>
                    <span className="text-xs text-gray-400">→</span>
                    <span className="text-sm text-gray-600">{action.targetUser.username}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${actionColors[action.action] || 'bg-gray-100 text-gray-700'}`}
                    >
                      {action.action.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{action.reason}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-xs text-gray-400">{timeAgo(action.createdAt)}</span>
                    {action.duration && (
                      <span className="text-xs text-gray-400">Duration: {action.duration}h</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {actions.length === 0 && !loading && (
        <div className="rounded-xl border border-gray-200 bg-white py-12 text-center shadow-sm">
          <Shield className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">No moderation actions recorded</p>
        </div>
      )}
    </div>
  );
}
