"use client";

import { useState } from "react";
import { ConfessionFeed } from "./components/confession/ConfessionFeed";
import { ErrorBoundary } from "./components/confession/ErrorBoundary";
import { EnhancedConfessionForm } from "./components/confession/EnhancedConfessionForm";

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
            <EnhancedConfessionForm
              onSubmit={() => setRefreshTrigger((n) => n + 1)}
            />
          </div>

          {/* Confessions Feed */}
          <div className="max-w-3xl mx-auto">
            <ConfessionFeed refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </main>
    </ErrorBoundary>
  );
}
