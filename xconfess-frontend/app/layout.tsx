import React from "react"
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "./lib/providers/ThemeProvider";
import "./globals.css";
import QueryProvider from "./components/providers/QueryProvider";
import { AuthProvider } from "./lib/providers/AuthProvider";
import { ToastProvider } from "@/app/components/common/Toast";
import { ErrorBoundary } from "@/app/components/common/ErrorBoundary";

import { OnboardingFlow } from "@/app/components/onboarding/OnboardingFlow";
import { HelpButton } from "@/app/components/onboarding/HelpButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "xConfess - Anonymous Confessions on Stellar",
  description: "Share your thoughts anonymously with blockchain verification",
    generator: 'v0.app'
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ErrorBoundary>
          <AuthProvider>
            <QueryProvider>
              <ThemeProvider>
                <ToastProvider>
                  {children}

                  {/* Onboarding system */}
                  <OnboardingFlow />
                  <HelpButton />
                </ToastProvider>
              </ThemeProvider>
            </QueryProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
