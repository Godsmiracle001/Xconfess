'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/app/lib/api/admin';
import { ErrorBoundary } from '@/app/components/common/ErrorBoundary';
import { TableSkeleton } from '@/app/components/common/SkeletonLoader';
import { ConfirmDialog } from '@/app/components/admin/ConfirmDialog';
import type { FailedNotificationJob, FailedJobsFilter } from '@/app/lib/types/notification-jobs';
import { useDebounce } from '@/app/lib/hooks/useDebounce';

export default function NotificationsPage() {
  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Failed Notification Jobs
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Monitor and replay failed notification delivery attempts
          </p>
        </div>
        <FailedJobsList />
      </div>
    </ErrorBoundary>
  );
}

function FailedJobsList() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'failed' | 'all'>('failed');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minRetries, setMinRetries] = useState<number | undefined>(undefined);
  const [replayingJobId, setReplayingJobId] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingReplays, setPendingReplays] = useState<Set<string>>(new Set());

  // Debounce filter changes to avoid excessive API calls
  const debouncedStartDate = useDebounce(startDate, 500);
  const debouncedEndDate = useDebounce(endDate, 500);

  const filter: FailedJobsFilter = useMemo(
    () => ({
      status: statusFilter,
      startDate: debouncedStartDate || undefined,
      endDate: debouncedEndDate || undefined,
      minRetries,
      page,
      limit: 20,
    }),
    [statusFilter, debouncedStartDate, debouncedEndDate, minRetries, page]
  );

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-failed-notification-jobs', filter],
    queryFn: () => adminApi.getFailedNotificationJobs(filter),
    staleTime: 30000, // 30 seconds
  });

  const replayMutation = useMutation({
    mutationFn: (jobId: string) => adminApi.replayFailedNotificationJob(jobId),
    onMutate: async (jobId) => {
      // Optimistically add to pending set
      setPendingReplays((prev) => new Set(prev).add(jobId));

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['admin-failed-notification-jobs'] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(['admin-failed-notification-jobs', filter]);

      // Optimistically update the job in the list
      queryClient.setQueryData(['admin-failed-notification-jobs', filter], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          jobs: old.jobs.map((job: FailedNotificationJob) =>
            job.id === jobId ? { ...job, _replaying: true } : job
          ),
        };
      });

      return { previousData };
    },
    onSuccess: (data, jobId) => {
      // Remove from pending set
      setPendingReplays((prev) => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });

      // Refetch to get updated state
      refetch();
    },
    onError: (error, jobId, context) => {
      // Remove from pending set
      setPendingReplays((prev) => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });

      // Rollback optimistic update
      if (context?.previousData) {
        queryClient.setQueryData(['admin-failed-notification-jobs', filter], context.previousData);
      }

      console.error('Failed to replay job:', error);
    },
  });

  const handleReplayClick = useCallback((jobId: string) => {
    // Prevent duplicate requests
    if (pendingReplays.has(jobId)) {
      return;
    }
    setReplayingJobId(jobId);
    setConfirmDialogOpen(true);
  }, [pendingReplays]);

  const handleConfirmReplay = useCallback(() => {
    if (replayingJobId) {
      replayMutation.mutate(replayingJobId);
      setConfirmDialogOpen(false);
      setReplayingJobId(null);
    }
  }, [replayingJobId, replayMutation]);

  const handleCancelReplay = useCallback(() => {
    setReplayingJobId(null);
    setConfirmDialogOpen(false);
  }, []);

  const handleFilterChange = useCallback(() => {
    setPage(1); // Reset to first page when filters change
  }, []);

  const totalPages = data ? Math.ceil(data.total / (filter.limit || 20)) : 0;

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-red-600 dark:text-red-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            Failed to load notification jobs. Please try again.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="mt-3 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'failed' | 'all');
                handleFilterChange();
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            >
              <option value="failed">Failed Only</option>
              <option value="all">All</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                handleFilterChange();
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                handleFilterChange();
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Min Retries
            </label>
            <input
              type="number"
              min="0"
              value={minRetries ?? ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                setMinRetries(val);
                handleFilterChange();
              }}
              placeholder="Any"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <TableSkeleton rows={5} cols={6} />
        </div>
      ) : !data || data.jobs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No failed jobs found
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            All notification jobs are processing successfully.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Job ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Channel
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Recipient
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Retries
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Failure Reason
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Failed At
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {data.jobs.map((job) => {
                  const isReplaying = pendingReplays.has(job.id);
                  return (
                    <tr
                      key={job.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                        {job.id.substring(0, 12)}...
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                          {job.channel}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                        {sanitizeEmail(job.recipientEmail)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            job.attemptsMade >= job.maxAttempts
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
                          }`}
                        >
                          {job.attemptsMade}/{job.maxAttempts}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white max-w-md">
                        <div className="truncate" title={job.failedReason || 'Unknown'}>
                          {truncateText(job.failedReason || 'Unknown', 50)}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {job.failedAt ? formatDate(job.failedAt) : 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleReplayClick(job.id)}
                          disabled={isReplaying}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isReplaying ? 'Replaying...' : 'Replay'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 px-4 py-3 rounded-lg shadow">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing {(page - 1) * (filter.limit || 20) + 1} to{' '}
            {Math.min(page * (filter.limit || 20), data.total)} of {data.total} results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title="Replay Failed Job"
        description="Are you sure you want to replay this failed notification job? This will attempt to resend the notification."
        confirmLabel="Replay"
        cancelLabel="Cancel"
        onConfirm={handleConfirmReplay}
        onCancel={handleCancelReplay}
        loading={replayMutation.isPending}
      />
    </>
  );
}

// Utility functions
function sanitizeEmail(email?: string): string {
  if (!email) return 'N/A';
  // Mask email for privacy: u***@example.com
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const maskedLocal = local.length > 1 ? `${local[0]}***` : local;
  return `${maskedLocal}@${domain}`;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}
