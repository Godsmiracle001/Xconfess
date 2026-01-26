"use client";

import { ConfessionFeed } from "./components/confession/ConfessionFeed";
import { ErrorBoundary } from "./components/confession/ErrorBoundary";
import { EnhancedConfessionForm } from "./components/confession/EnhancedConfessionForm";

export default function Home() {
  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-linear-to-b from-zinc-950 to-black">
        <div className="container mx-auto py-8 px-4">
          <header className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              Confessions
            </h1>
            <p className="text-gray-400 text-lg">
              Share your secrets anonymously
            </p>
          </header>
          
          {/* Confession Form */}
          <div className="mb-12 max-w-3xl mx-auto">
            <EnhancedConfessionForm />
          </div>

          {/* Confessions Feed */}
          <div className="max-w-3xl mx-auto">
            <ConfessionFeed />
          </div>
        </div>

        {/* Post Confession Button */}
        <button className="create-confession-button w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-transform transform hover:scale-105">
          Post Confession
        </button>

        {/* Reactions */}
        <div className="reaction-buttons flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
          <button className="flex items-center justify-center gap-2 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg transition w-full sm:w-auto">
            👍 Like
          </button>
          <button className="flex items-center justify-center gap-2 bg-pink-200 dark:bg-pink-800 hover:bg-pink-300 dark:hover:bg-pink-700 text-pink-900 dark:text-pink-100 px-4 py-2 rounded-lg transition w-full sm:w-auto">
            ❤️ Love
          </button>
        </div>

        {/* Connect Wallet */}
        <button className="wallet-connect w-full md:w-auto bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold py-3 px-6 rounded-xl shadow-md transition-transform transform hover:scale-105">
          Connect Wallet
        </button>
      </main>
    </>
  );
}
