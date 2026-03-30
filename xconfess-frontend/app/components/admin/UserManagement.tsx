'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, User } from '@/app/lib/api/admin';

export default function UserManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [page, setPage] = useState(1);
  const limit = 20;

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users-search', searchQuery, page],
    queryFn: () => adminApi.searchUsers(searchQuery, limit, (page - 1) * limit),
    enabled: searchQuery.length > 0,
  });

  const banMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      adminApi.banUser(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-search'] });
      setSelectedUser(null);
    },
  });

  const unbanMutation = useMutation({
    mutationFn: (id: string) => adminApi.unbanUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-search'] });
      setSelectedUser(null);
    },
  });

  const handleBan = (user: User) => {
    const reason = prompt('Enter ban reason (optional):');
    if (reason !== null) {
      if (confirm(`Are you sure you want to ban user ${user.username}?`)) {
        banMutation.mutate({ id: user.id.toString(), reason: reason || undefined });
      }
    }
  };

  const handleUnban = (user: User) => {
    if (confirm(`Are you sure you want to unban user ${user.username}?`)) {
      unbanMutation.mutate(user.id.toString());
    }
  };

  const users = data?.users || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div className="flex gap-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by username..."
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Users Table */}
      {searchQuery.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No users found</div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((user: User) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {user.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                              : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                          }`}
                        >
                          {user.is_active ? 'Active' : 'Banned'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {user.isAdmin ? 'Yes' : 'No'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          {user.is_active ? (
                            <button
                              onClick={() => handleBan(user)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400"
                            >
                              Ban
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUnban(user)}
                              className="text-green-600 hover:text-green-900 dark:text-green-400"
                            >
                              Unban
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                          >
                            History
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}{' '}
                    results
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 border rounded-md disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 border rounded-md disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* User History Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                User History: {selectedUser.username}
              </h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <UserHistory userId={selectedUser.id.toString()} />
          </div>
        </div>
      )}
    </div>
  );
}

function UserHistory({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-user-history', userId],
    queryFn: () => adminApi.getUserHistory(userId),
  });

  if (isLoading) {
    return <div className="text-center py-4 text-gray-500">Loading history...</div>;
  }

  if (!data) {
    return <div className="text-center py-4 text-gray-500">No history found</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Confessions</h4>
        {data.note && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{data.note}</div>
        )}
        {data.confessions?.length ? (
          <div className="space-y-2">
            {data.confessions.slice(0, 20).map((c: any) => (
              <div
                key={c.id}
                className="p-3 rounded border border-gray-200 dark:border-gray-700"
              >
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {c.created_at ? new Date(c.created_at).toLocaleString() : ''}
                </div>
                <div className="text-sm text-gray-900 dark:text-white mt-1 line-clamp-2">
                  {c.message}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 font-mono">
                  {c.id}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-600 dark:text-gray-400">No confessions found</div>
        )}
      </div>
      <div>
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Reports</h4>
        {data.reports?.length ? (
          <div className="space-y-2">
            {data.reports.slice(0, 20).map((r: any) => (
              <div
                key={r.id}
                className="p-3 rounded border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {r.type} · {r.status}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}
                  </div>
                </div>
                {r.reason && (
                  <div className="text-sm text-gray-700 dark:text-gray-200 mt-1">
                    {r.reason}
                  </div>
                )}
                {r.confession?.message && (
                  <div className="text-sm text-gray-700 dark:text-gray-200 mt-2 line-clamp-2">
                    Confession: {r.confession.message}
                  </div>
                )}
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 font-mono">
                  {r.id}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-600 dark:text-gray-400">No reports found</div>
        )}
      </div>
    </div>
  );
}
