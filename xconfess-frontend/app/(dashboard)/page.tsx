"use client";

import Link from "next/link";
import { ErrorBoundary } from "@/app/components/common/ErrorBoundary";
import { ConfessionFeed } from "@/app/components/confession/ConfessionFeed";
import Header from "@/app/components/layout/Header";
import { useAuthContext } from "../lib/providers/AuthProvider";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Stat Badge ────────────────────────────────────────────────────────────────

function StatBadge({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-zinc-700 bg-white dark:bg-zinc-900 px-6 py-4 text-center shadow-sm">
      <span className="text-2xl font-bold">{value}</span>
      <span className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
    </div>
  );
}

// ─── User Summary ──────────────────────────────────────────────────────────────

function UserSummarySection() {
  const { user } = useAuthContext();

  const displayName = user?.username
    ? `@${user.username}`
    : (user?.email ?? "there");

  const joinedAt = user?.createdAt ? formatDate(user.createdAt) : null;

  return (
    <section className="rounded-xl border border-zinc-700 bg-white dark:bg-zinc-900 shadow-md p-6 space-y-4">
      <div>
        <h2 className="text-xl md:text-2xl font-bold">
          Welcome back,{" "}
          <span className="text-violet-500 dark:text-violet-400">
            {displayName}
          </span>
        </h2>
        {joinedAt && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Member since {joinedAt}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatBadge label="Confessions" value={user?.totalConfessions ?? "—"} />
        <StatBadge label="Likes received" value={user?.totalLikes ?? "—"} />
        <StatBadge label="Status" value="Active" />
      </div>

      <Link
        href="/confess"
        className="inline-block rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
      >
        + New Confession
      </Link>
    </section>
  );
}

// ─── Recent Confessions ────────────────────────────────────────────────────────

function RecentConfessionsSection() {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Recent Confessions</h2>
        <Link
          href="/confessions"
          className="text-sm font-medium text-violet-500 hover:underline"
        >
          View all →
        </Link>
      </div>

      <ErrorBoundary>
        <ConfessionFeed />
      </ErrorBoundary>
    </section>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 flex flex-col gap-8">
        <UserSummarySection />
        <RecentConfessionsSection />
      </main>
    </div>
  );
}
