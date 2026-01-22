'use client';

import { useState } from 'react';
import { Confession, ConfessionListResponse } from '@/app/lib/types/confession';
import { cn } from '@/app/lib/utils/cn';
import { formatRelativeDate } from '@/app/lib/utils/formatDate';
import { Heart, Eye, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';

interface ConfessionHistoryProps {
  confessions: Confession[];
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

function ConfessionCard({ confession }: { confession: Confession }) {
  const statusColors: Record<string, string> = {
    approved: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    rejected: 'bg-red-100 text-red-700',
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="line-clamp-3 flex-1 text-gray-800">{confession.message}</p>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize',
            statusColors[confession.moderationStatus] || 'bg-gray-100 text-gray-600'
          )}
        >
          {confession.moderationStatus}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <Heart className="h-4 w-4" />
          {confession.reactionCount}
        </span>
        <span className="flex items-center gap-1">
          <Eye className="h-4 w-4" />
          {confession.viewCount}
        </span>
        {confession.gender && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize">
            {confession.gender}
          </span>
        )}
        <span className="ml-auto text-xs">{formatRelativeDate(confession.createdAt)}</span>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-200" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-12">
      <MessageSquare className="mb-3 h-12 w-12 text-gray-300" />
      <h3 className="mb-1 text-lg font-medium text-gray-900">No confessions yet</h3>
      <p className="text-sm text-gray-500">Your confession history will appear here</p>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className={cn(
          'flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          page <= 1
            ? 'cursor-not-allowed text-gray-300'
            : 'text-gray-700 hover:bg-gray-100'
        )}
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </button>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .map((p, index, arr) => {
            const showEllipsis = index > 0 && p - arr[index - 1] > 1;
            return (
              <span key={p} className="flex items-center">
                {showEllipsis && <span className="px-2 text-gray-400">...</span>}
                <button
                  onClick={() => onPageChange(p)}
                  className={cn(
                    'h-8 w-8 rounded-lg text-sm font-medium transition-colors',
                    p === page
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  {p}
                </button>
              </span>
            );
          })}
      </div>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className={cn(
          'flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          page >= totalPages
            ? 'cursor-not-allowed text-gray-300'
            : 'text-gray-700 hover:bg-gray-100'
        )}
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ConfessionHistory({
  confessions,
  total,
  page,
  totalPages,
  onPageChange,
  isLoading,
}: ConfessionHistoryProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (confessions.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Your Confessions</h3>
        <span className="text-sm text-gray-500">{total} total</span>
      </div>

      <div className="space-y-3">
        {confessions.map((confession) => (
          <ConfessionCard key={confession.id} confession={confession} />
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}

export default ConfessionHistory;
