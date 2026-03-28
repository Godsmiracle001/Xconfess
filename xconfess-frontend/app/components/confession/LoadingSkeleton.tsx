export const SkeletonCard = () => (
  <div role='status' aria-label='loading' className="bg-zinc-900 rounded-xl p-6 shadow-lg animate-pulse">
    {/* Author skeleton */}
    <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-800">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-zinc-800" />
        <div className="h-3 w-24 bg-zinc-800 rounded" />
      </div>
      <div className="h-2 w-16 bg-zinc-800 rounded" />
    </div>

    {/* Content skeleton */}
    <div className="space-y-2 mb-4">
      <div className="h-4 w-full bg-zinc-800 rounded" />
      <div className="h-4 w-full bg-zinc-800 rounded" />
      <div className="h-4 w-3/4 bg-zinc-800 rounded" />
    </div>

    {/* Actions skeleton */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-3 w-12 bg-zinc-800 rounded" />
        <div className="h-3 w-12 bg-zinc-800 rounded" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-20 bg-zinc-800 rounded-full" />
        <div className="h-8 w-20 bg-zinc-800 rounded-full" />
      </div>
    </div>
  </div>
);
