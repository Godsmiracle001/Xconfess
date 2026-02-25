'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/app/lib/api/admin';
import { ErrorBoundary } from '@/app/components/common/ErrorBoundary';
import { TableSkeleton } from '@/app/components/common/SkeletonLoader';

export default function TemplatesPage() {
    return (
        <ErrorBoundary>
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Email Template Management
                    </h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Manage template lifecycles, canary rollouts, and emergency kill-switches.
                    </p>
                </div>
                <TemplateList />
            </div>
        </ErrorBoundary>
    );
}

function TemplateList() {
    const queryClient = useQueryClient();
    const { data: templates, isLoading, error } = useQuery({
        queryKey: ['admin-templates'],
        queryFn: () => adminApi.getTemplates(),
    });

    const stateMutation = useMutation({
        mutationFn: ({ key, version, state }: { key: string; version: string; state: string }) =>
            adminApi.updateTemplateState(key, version, state),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-templates'] }),
    });

    const killSwitchMutation = useMutation({
        mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
            adminApi.toggleTemplateKillSwitch(key, enabled),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-templates'] }),
    });

    if (isLoading) return <TableSkeleton rows={3} cols={5} />;
    if (error) return <div>Error loading templates</div>;
    if (!templates) return <div>No templates found</div>;

    return (
        <div className="space-y-8">
            {Object.entries(templates).map(([key, reg]: [string, any]) => (
                <div key={key} className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 flex justify-between items-center border-b border-gray-200 dark:border-gray-600">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white uppercase">
                                {key}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Active Version: <span className="font-mono text-indigo-600 dark:text-indigo-400">{reg.activeVersion}</span>
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Kill-Switch:</span>
                                <button
                                    onClick={() => killSwitchMutation.mutate({ key, enabled: !reg.rollout?.killSwitchEnabled })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${reg.rollout?.killSwitchEnabled ? 'bg-red-600' : 'bg-gray-200 dark:bg-gray-600'
                                        }`}
                                    data-testid={`kill-switch-${key}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${reg.rollout?.killSwitchEnabled ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-white dark:bg-gray-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Version</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">State</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Subject</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Rollout</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {Object.entries(reg.versions).map(([vKey, version]: [string, any]) => (
                                    <tr key={vKey}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                                            {vKey}
                                            {reg.activeVersion === vKey && (
                                                <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full dark:bg-green-900/30 dark:text-green-300">
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <select
                                                value={version.lifecycleState}
                                                onChange={(e) => stateMutation.mutate({ key, version: vKey, state: e.target.value })}
                                                className="text-sm rounded-md border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                                data-testid={`state-select-${key}-${vKey}`}
                                            >
                                                <option value="draft">Draft</option>
                                                <option value="canary">Canary</option>
                                                <option value="active">Active</option>
                                                <option value="deprecated">Deprecated</option>
                                                <option value="archived">Archived</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                            {version.subject}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {reg.rollout?.canaryVersion === vKey ? (
                                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                                    Canary ({reg.rollout.canaryWeight}%)
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            {/* Placeholder for more actions */}
                                            <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400">Preview</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
}
