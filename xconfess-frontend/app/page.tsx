"use client";

import { OnboardingFlow } from "./components/onboarding/OnboardingFlow";
import dynamic from "next/dynamic";
import { ConfessionFeed } from "./components/confession/ConfessionFeed";
import { ErrorBoundary } from "./components/common/ErrorBoundary";

const EnhancedConfessionForm = dynamic(
  () =>
    import("./components/confession/EnhancedConfessionForm").then((mod) => ({
      default: mod.EnhancedConfessionForm,
    })),
  {
    loading: () => (
      <div className="animate-pulse bg-zinc-900 rounded-xl p-6 h-48">
        <div className="h-4 bg-zinc-800 rounded w-1/4 mb-4"></div>
        <div className="h-32 bg-zinc-800 rounded mb-4"></div>
        <div className="h-10 bg-zinc-800 rounded w-24"></div>
      </div>
    ),
    ssr: false,
  },
);
import Header from "./components/layout/Header";

export default function Home() {
  return (
    <>
      <OnboardingFlow />

      <main className="p-4 md:p-8 flex flex-col items-center space-y-6">
        <div className="confession-feed w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-700 rounded-xl shadow-md p-6">
          <h2 className="text-xl md:text-2xl font-bold text-center">
            Confession Feed
          </h2>
          <p className="text-center">
            Browse anonymous confessions from the community.
          </p>
        </div>

        <button className="create-confession-button">Post Confession</button>

        <div className="reaction-buttons flex gap-4">
          <button>👍 Like</button>
          <button>❤️ Love</button>
        </div>

        <ErrorBoundary>
          <Header />

          <div className="container mx-auto py-8 px-4">
            <header className="mb-12 text-center">
              <h1 className="text-4xl font-bold">Confessions</h1>
              <p>Share your secrets anonymously</p>
            </header>

            <div className="mb-12 max-w-3xl mx-auto">
              <EnhancedConfessionForm />
            </div>

            <div className="max-w-3xl mx-auto">
              <ConfessionFeed />
            </div>
          </div>
        </ErrorBoundary>

        <button className="wallet-connect">Connect Wallet</button>
      </main>
    </>
  );
}
