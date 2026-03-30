"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, Report } from "@/app/lib/api/admin";
import ReportDetail from "./ReportDetail";
import { exportToCSV } from "@/app/lib/utils/csvExport";

export default function ReportList() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: [
      "admin-reports",
      statusFilter,
      typeFilter,
      startDate,
      endDate,
      page,
    ],
    queryFn: () =>
      adminApi.getReports({
        status: statusFilter !== "all" ? statusFilter : undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        limit,
        offset: (page - 1) * limit,
      }),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      adminApi.resolveReport(id, notes),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-reports"] });
      const previousData = queryClient.getQueryData(["admin-reports"]);
      queryClient.setQueriesData(
        { queryKey: ["admin-reports"] },
        (old: any) => {
          if (!old?.reports) return old;
          return {
            ...old,
            reports: old.reports.map((r: Report) =>
              r.id === id ? { ...r, status: "resolved" } : r,
            ),
          };
        },
      );
      return { previousData };
    },
    onError: (err, newReport, context) => {
      if (context?.previousData) {
        queryClient.setQueriesData(
          { queryKey: ["admin-reports"] },
          context.previousData,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      setSelectedReport(null);
    },
  });

  const dismissMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      adminApi.dismissReport(id, notes),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-reports"] });
      const previousData = queryClient.getQueryData(["admin-reports"]);
      queryClient.setQueriesData(
        { queryKey: ["admin-reports"] },
        (old: any) => {
          if (!old?.reports) return old;
          return {
            ...old,
            reports: old.reports.map((r: Report) =>
              r.id === id ? { ...r, status: "dismissed" } : r,
            ),
          };
        },
      );
      return { previousData };
    },
    onError: (err, newReport, context) => {
      if (context?.previousData) {
        queryClient.setQueriesData(
          { queryKey: ["admin-reports"] },
          context.previousData,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      setSelectedReport(null);
    },
  });

  const bulkResolveMutation = useMutation({
    mutationFn: ({ ids, notes }: { ids: string[]; notes?: string }) =>
      adminApi.bulkResolveReports(ids, notes),
    onMutate: async ({ ids }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-reports"] });
      const previousData = queryClient.getQueryData(["admin-reports"]);
      queryClient.setQueriesData(
        { queryKey: ["admin-reports"] },
        (old: any) => {
          if (!old?.reports) return old;
          return {
            ...old,
            reports: old.reports.map((r: Report) =>
              ids.includes(r.id) ? { ...r, status: "resolved" } : r,
            ),
          };
        },
      );
      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueriesData(
          { queryKey: ["admin-reports"] },
          context.previousData,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    },
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkResolve = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Resolve ${selectedIds.size} selected reports?`)) {
      bulkResolveMutation.mutate({ ids: Array.from(selectedIds) });
      setSelectedIds(new Set());
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-500">Loading reports...</div>
    );
  }

  const reports = data?.reports || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  if (selectedReport) {
    const report = reports.find((r: Report) => r.id === selectedReport);
    if (report) {
      return (
        <ReportDetail
          report={report}
          onBack={() => setSelectedReport(null)}
          onResolve={(notes) =>
            resolveMutation.mutate({ id: report.id, notes })
          }
          onDismiss={(notes) =>
            dismissMutation.mutate({ id: report.id, notes })
          }
        />
      );
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="reviewing">Reviewing</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All</option>
              <option value="spam">Spam</option>
              <option value="harassment">Harassment</option>
              <option value="hate_speech">Hate Speech</option>
              <option value="inappropriate_content">
                Inappropriate Content
              </option>
              <option value="copyright">Copyright</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                const exportData = reports.map((r: Report) => ({
                  id: r.id,
                  type: r.type,
                  status: r.status,
                  reporter: r.reporter?.username || "Anonymous",
                  reason: r.reason || "",
                  createdAt: new Date(r.createdAt).toLocaleString(),
                  resolvedAt: r.resolvedAt
                    ? new Date(r.resolvedAt).toLocaleString()
                    : "",
                }));
                exportToCSV(
                  exportData,
                  `reports-${new Date().toISOString().split("T")[0]}.csv`,
                );
              }}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm"
            >
              Export CSV
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={handleBulkResolve}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm"
              >
                Resolve Selected ({selectedIds.size})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(new Set(reports.map((r: Report) => r.id)));
                    } else {
                      setSelectedIds(new Set());
                    }
                  }}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Reporter
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
            {reports.map((report: Report) => (
              <tr
                key={report.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(report.id)}
                    onChange={() => toggleSelect(report.id)}
                    className="rounded border-gray-300"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {report.type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      report.status === "pending"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100"
                        : report.status === "resolved"
                          ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                    }`}
                  >
                    {report.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {report.reporter?.username || "Anonymous"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(report.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => setSelectedReport(report.id)}
                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)}{" "}
            of {total} results
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
    </div>
  );
}
