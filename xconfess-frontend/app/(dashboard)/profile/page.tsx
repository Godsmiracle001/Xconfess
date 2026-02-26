"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User, ShieldCheck, ShieldAlert, Hash } from "lucide-react";
import { useAuth } from "@/app/lib/hooks/useAuth";

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          <div className="space-y-2">
            <div className="h-4 w-28 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
          {[80, 60, 90].map((w) => (
            <div
              key={w}
              className="h-4 rounded bg-zinc-200 dark:bg-zinc-800"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Avatar initials ───────────────────────────────────────────────────────────

function Avatar({ username }: { username: string }) {
  const initials =
    username
      .split(/[\s._-]+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?";

  return (
    <div
      aria-hidden
      className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-semibold text-xl select-none"
    >
      {initials}
    </div>
  );
}

// ── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
        <Icon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-zinc-400 dark:text-slate-500">{label}</p>
        <p className="text-sm font-medium text-zinc-800 dark:text-slate-200 truncate">
          {value}
        </p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();

  // AuthProvider shape:
  //   isLoading: true on mount until checkAuth() resolves
  //   isAuthenticated: boolean (false when guest)
  //   user: User | null
  //   logout(): void  (synchronous — clears cookie + store)
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  // Redirect once the initial checkAuth() has settled and there's no session
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // checkAuth() still in-flight — show skeleton to avoid layout shift
  if (isLoading) return <ProfileSkeleton />;

  // Resolved as guest — redirect queued above, render nothing to prevent flash
  if (!isAuthenticated || !user) return null;

  // ── Derived values ────────────────────────────────────────────────────────
  const isAdmin = user.role === "admin";

  const handleLogout = () => {
    logout(); // synchronous: clears HttpOnly cookie via authApi + zustand store
    router.replace("/login");
  };

  const handleDeactivate = () => {
    // TODO: call your deactivate endpoint, then handleLogout()
    alert("Account deactivation coming soon.");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {/* ── Identity header ── */}
        <div className="flex items-center gap-4">
          <Avatar username={user.username} />
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
              @{user.username}
            </h1>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-purple-600 dark:text-purple-400">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                Admin
              </span>
            )}
          </div>
        </div>

        {/* ── Account details ── */}
        <section
          aria-labelledby="account-details-heading"
          className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-2"
        >
          <h2
            id="account-details-heading"
            className="pt-4 pb-2 text-xs uppercase tracking-wider text-zinc-400 dark:text-slate-500 font-medium"
          >
            Account details
          </h2>
          <InfoRow icon={User} label="Username" value={user.username} />
          <InfoRow icon={Hash} label="Role" value={user.role ?? "member"} />
          {/*
            Add more rows as your User type grows, e.g.:
            <InfoRow icon={Mail} label="Email" value={user.email} />
            <InfoRow icon={Calendar} label="Member since" value={formatDate(new Date(user.createdAt))} />
          */}
        </section>

        {/* ── Account actions ── */}
        <section
          aria-labelledby="account-actions-heading"
          className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-2"
        >
          <h2
            id="account-actions-heading"
            className="pt-4 pb-2 text-xs uppercase tracking-wider text-zinc-400 dark:text-slate-500 font-medium"
          >
            Account actions
          </h2>

          {/* Sign out — same style as Header's logout button */}
          <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <p className="text-sm font-medium text-zinc-800 dark:text-slate-200">
                Sign out
              </p>
              <p className="text-xs text-zinc-400 dark:text-slate-500">
                End your current session
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 rounded"
            >
              <LogOut aria-hidden className="h-4 w-4" />
              Sign out
            </button>
          </div>

          {/* Deactivate (placeholder) */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-zinc-800 dark:text-slate-200">
                Deactivate account
              </p>
              <p className="text-xs text-zinc-400 dark:text-slate-500">
                Temporarily disable your account
              </p>
            </div>
            <button
              onClick={handleDeactivate}
              aria-label="Deactivate account (coming soon)"
              className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 rounded"
            >
              <ShieldAlert aria-hidden className="h-4 w-4" />
              Deactivate
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
