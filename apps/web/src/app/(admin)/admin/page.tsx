'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { adminApi } from '@/lib/api';
import { formatNumber, timeAgo } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  Users,
  FileText,
  Video,
  AlertTriangle,
  Activity,
  Shield,
  Ban,
  Eye,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalPosts: number;
  totalReels: number;
  pendingReports: number;
  activeUsers24h: number;
}

interface Report {
  id: string;
  reporter: { username: string };
  reportedUser: { username: string };
  reason: string;
  status: string;
  createdAt: string;
}

const statCards = [
  { key: 'totalUsers', label: 'Total Users', icon: Users, color: 'bg-blue-500' },
  { key: 'totalPosts', label: 'Total Posts', icon: FileText, color: 'bg-emerald-500' },
  { key: 'totalReels', label: 'Total Reels', icon: Video, color: 'bg-purple-500' },
  { key: 'pendingReports', label: 'Pending Reports', icon: AlertTriangle, color: 'bg-amber-500' },
  { key: 'activeUsers24h', label: 'Active Users (24h)', icon: Activity, color: 'bg-rose-500' },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
      router.push('/');
      return;
    }

    async function fetchData() {
      try {
        const [dashboardRes, reportsRes] = await Promise.all([
          adminApi.getDashboard(),
          adminApi.getReports({ status: 'pending' }),
        ]);
        setStats(dashboardRes.data.data);
        setReports(reportsRes.data.data.slice(0, 5));
      } catch {
        router.push('/');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-500">Overview of your platform</p>
      </div>

      <motion.div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {statCards.map((card, i) => {
          const Icon = card.icon;
          const value = stats ? (stats as unknown as Record<string, number>)[card.key] : 0;
          return (
            <motion.div
              key={card.key}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="flex items-center justify-between">
                <div className={`rounded-lg ${card.color} p-2.5`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="mt-4 text-2xl font-bold text-gray-900">{formatNumber(value)}</p>
              <p className="text-sm text-gray-500">{card.label}</p>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div
          className="rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Reports</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {reports.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-gray-500">No pending reports</p>
            ) : (
              reports.map((report) => (
                <div key={report.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-amber-50 p-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {report.reporter.username} reported {report.reportedUser.username}
                      </p>
                      <p className="text-xs text-gray-500">{report.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{timeAgo(report.createdAt)}</span>
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      {report.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        <motion.div
          className="rounded-xl border border-gray-200 bg-white shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-4 space-y-2">
            <button
              onClick={() => router.push('/admin/users')}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Users className="h-4 w-4" />
              Manage Users
            </button>
            <button
              onClick={() => router.push('/admin/reports')}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Shield className="h-4 w-4" />
              Review Reports
            </button>
            <button
              onClick={() => router.push('/admin/moderation')}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Eye className="h-4 w-4" />
              Moderation Log
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
