'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { adminApi } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Ban,
  Trash2,
  Loader2,
  Filter,
} from 'lucide-react';

interface Report {
  id: string;
  reporter: { id: string; username: string };
  reportedUser: { id: string; username: string };
  content?: { id: string; type: string };
  reason: string;
  status: string;
  createdAt: string;
}

const STATUS_FILTERS = ['all', 'pending', 'under_review', 'resolved', 'dismissed'];

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  under_review: 'bg-blue-100 text-blue-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  dismissed: 'bg-gray-100 text-gray-700',
};

export default function AdminReportsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
      router.push('/');
      return;
    }
  }, [user, isAuthenticated, router]);

  const fetchReports = useCallback(async (status?: string) => {
    setLoading(true);
    try {
      const params = status && status !== 'all' ? { status } : undefined;
      const res = await adminApi.getReports(params);
      setReports(res.data.data);
    } catch {
      router.push('/');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchReports(statusFilter);
  }, [statusFilter, fetchReports]);

  const handleReportAction = async (reportId: string, status: string, action?: string) => {
    setActionLoading(reportId);
    try {
      await adminApi.updateReport(reportId, { status, action });
      await fetchReports(statusFilter);
      setSelectedReport(null);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && reports.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="mt-1 text-gray-500">Content moderation queue</p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto">
        <Filter className="h-4 w-4 text-gray-400" />
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {reports.map((report, i) => (
          <motion.div
            key={report.id}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-amber-50 p-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    <span className="text-gray-500">Reporter:</span> {report.reporter.username}
                    <span className="mx-2 text-gray-300">→</span>
                    <span className="text-gray-500">Reported:</span> {report.reportedUser.username}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">{report.reason}</p>
                  {report.content && (
                    <p className="mt-1 text-xs text-gray-400">
                      Content: {report.content.type} ({report.content.id.slice(0, 8)}...)
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">{timeAgo(report.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[report.status] || 'bg-gray-100 text-gray-700'}`}>
                  {report.status.replace('_', ' ')}
                </span>
                {report.status === 'pending' && (
                  <button
                    onClick={() => setSelectedReport(selectedReport?.id === report.id ? null : report)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Review
                  </button>
                )}
              </div>
            </div>

            {selectedReport?.id === report.id && (
              <motion.div
                className="mt-4 border-t border-gray-100 pt-4"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <p className="mb-3 text-sm font-medium text-gray-700">Take action:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleReportAction(report.id, 'under_review')}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
                    disabled={actionLoading === report.id}
                  >
                    <Eye className="h-4 w-4" /> Under Review
                  </button>
                  <button
                    onClick={() => handleReportAction(report.id, 'resolved')}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                    disabled={actionLoading === report.id}
                  >
                    <CheckCircle className="h-4 w-4" /> Resolve
                  </button>
                  <button
                    onClick={() => handleReportAction(report.id, 'dismissed')}
                    className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                    disabled={actionLoading === report.id}
                  >
                    <XCircle className="h-4 w-4" /> Dismiss
                  </button>
                  {report.content && (
                    <button
                      onClick={() => handleReportAction(report.id, report.status, 'remove_content')}
                      className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
                      disabled={actionLoading === report.id}
                    >
                      <Trash2 className="h-4 w-4" /> Remove Content
                    </button>
                  )}
                  <button
                    onClick={() => handleReportAction(report.id, report.status, 'ban_user')}
                    className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
                    disabled={actionLoading === report.id}
                  >
                    <Ban className="h-4 w-4" /> Ban User
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {reports.length === 0 && !loading && (
        <div className="rounded-xl border border-gray-200 bg-white py-12 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">No reports found</p>
        </div>
      )}
    </div>
  );
}
