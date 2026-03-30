import React from "react";
import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "./components/providers/QueryProvider";
import { AuthProvider } from "./lib/providers/AuthProvider";
import { ToastProvider } from "@/app/components/common/Toast";
import { ErrorBoundary } from "@/app/components/common/ErrorBoundary";

import { OnboardingFlow } from "@/app/components/onboarding/OnboardingFlow";
import { HelpButton } from "@/app/components/onboarding/HelpButton";

export const metadata: Metadata = {
  title: "xConfess - Anonymous Confessions on Stellar",
  description: "Share your thoughts anonymously with blockchain verification",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ErrorBoundary>
          <AuthProvider>
            <QueryProvider>
              <ToastProvider>
                {children}

                {/* Onboarding system */}
                <OnboardingFlow />
                <HelpButton />
              </ToastProvider>
            </QueryProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
