'use client';

export default function ProfilePage() {
  return (
    <div className="w-full pb-24 md:pb-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Your Profile</h1>
      
      <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-xl mb-8 flex items-center gap-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="w-20 h-20 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center text-2xl font-bold text-zinc-500 dark:text-zinc-400">
          AN
        </div>
        <div>
          <h2 className="text-xl font-semibold">Anonymous User</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Reputation Score: 120</p>
        </div>
      </div>

      <h3 className="text-xl font-semibold mb-4">Your Confessions</h3>
      <div className="text-center py-16 text-zinc-500 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/30">
        <p>You haven't confessed anything yet.</p>
      </div>
    </div>
  );
}