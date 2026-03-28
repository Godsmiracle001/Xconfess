'use client';

import { useState } from 'react';
import { Report } from '@/app/lib/api/admin';
import { adminApi } from '@/app/lib/api/admin';
import { MODERATION_TEMPLATES } from '@/app/lib/utils/moderationTemplates';

interface ReportDetailProps {
  report: Report;
  onBack: () => void;
  onResolve: (notes?: string) => void;
  onDismiss: (notes?: string) => void;
}

export default function ReportDetail({
  report,
  onBack,
  onResolve,
  onDismiss,
}: ReportDetailProps) {
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [showDismissDialog, setShowDismissDialog] = useState(false);
  const [action, setAction] = useState<'resolve' | 'dismiss' | null>(null);

  const handleResolve = () => {
    if (confirm('Are you sure you want to resolve this report?')) {
      onResolve(resolutionNotes || undefined);
    }
  };

  const handleDismiss = () => {
    if (confirm('Are you sure you want to dismiss this report?')) {
      onDismiss(resolutionNotes || undefined);
    }
  };

  const handleDeleteConfession = async () => {
    if (confirm('Are you sure you want to delete this confession? This action cannot be undone.')) {
      try {
        await adminApi.deleteConfession(report.confessionId, 'Deleted via report resolution');
        alert('Confession deleted successfully');
        onBack();
      } catch (error) {
        alert('Failed to delete confession');
      }
    }
  };

  const handleHideConfession = async () => {
    if (confirm('Are you sure you want to hide this confession?')) {
      try {
        await adminApi.hideConfession(report.confessionId, 'Hidden via report resolution');
        alert('Confession hidden successfully');
        onBack();
      } catch (error) {
        alert('Failed to hide confession');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
        >
          ← Back to Reports
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Report Details
          </h3>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">ID</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">{report.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Type</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">{report.type}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
              <dd className="mt-1">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    report.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                      : report.status === 'resolved'
                      ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}
                >
                  {report.status}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Reporter</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {report.reporter?.username || 'Anonymous'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {new Date(report.createdAt).toLocaleString()}
              </dd>
            </div>
            {report.resolvedAt && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Resolved</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {new Date(report.resolvedAt).toLocaleString()}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {report.reason && (
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Reason
            </dt>
            <dd className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded">
              {report.reason}
            </dd>
          </div>
        )}

        {report.resolutionNotes && (
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Resolution Notes
            </dt>
            <dd className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded">
              {report.resolutionNotes}
            </dd>
          </div>
        )}

        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-2">
            Confession Content
          </h4>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
            <p className="text-sm text-gray-900 dark:text-white">
              {report.confession?.message || 'Confession not available'}
            </p>
          </div>
        </div>

        {report.status === 'pending' && (
          <div className="border-t pt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Resolution Notes (optional)
              </label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={3}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="Add notes about this resolution..."
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {MODERATION_TEMPLATES.report_resolved.map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => setResolutionNotes(template)}
                    className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    {template}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {MODERATION_TEMPLATES.report_dismissed.map((template, idx) => (
                  <button
                    key={`dismiss-${idx}`}
                    onClick={() => setResolutionNotes(template)}
                    className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    {template}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleResolve}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                Resolve Report
              </button>
              <button
                onClick={handleDismiss}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                Dismiss Report
              </button>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-2">
                Quick Actions
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteConfession}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
                >
                  Delete Confession
                </button>
                <button
                  onClick={handleHideConfession}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 text-sm"
                >
                  Hide Confession
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
