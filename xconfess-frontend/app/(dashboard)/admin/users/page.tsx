'use client';

import UserManagement from '@/app/components/admin/UserManagement';

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Search and manage users
        </p>
      </div>
      <UserManagement />
    </div>
  );
}
