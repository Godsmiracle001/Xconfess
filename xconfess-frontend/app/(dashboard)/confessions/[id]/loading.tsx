import { SkeletonCard } from "@/app/components/confession/LoadingSkeleton";

export default function ConfessionDetailLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
        <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse mb-6" />
        <SkeletonCard />
        <div className="mt-8 space-y-4">
          <div className="h-6 w-40 bg-zinc-800 rounded animate-pulse" />
          <div className="h-24 bg-zinc-800 rounded-xl animate-pulse" />
          <div className="h-20 bg-zinc-800 rounded animate-pulse" />
          <div className="h-20 bg-zinc-800 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
