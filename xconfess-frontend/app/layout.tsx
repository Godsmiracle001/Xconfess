

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { WalletProvider } from "@/lib/providers/WalletProvider";
import { AppHeader } from "@/components/layout/AppHeader";
import "./globals.css";
import { AuthProvider } from "./lib/providers/AuthProvider";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <WalletProvider>
            <AppHeader />
            {children}
            {/* Onboarding system */}
            <OnboardingFlow />
            <HelpButton />
          </WalletProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
