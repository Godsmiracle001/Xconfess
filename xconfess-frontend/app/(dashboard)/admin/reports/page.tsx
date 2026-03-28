'use client';

import ReportList from '@/app/components/admin/ReportList';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Review and manage user reports
        </p>
      </div>
      <ReportList />
    </div>
  );
}
