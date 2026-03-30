"use client";

import Link from "next/link";
import { useState, useCallback, useRef } from "react";
import { Menu, LogOut } from "lucide-react";
import { useAuth } from "../../lib/hooks/useAuth";
import { ThemeToggle } from "../common/ThemeToggle";
import Sidebar from "./Sidebar";

const navLinkClass =
  "text-gray-700 hover:text-purple-600 dark:text-slate-300 dark:hover:text-purple-400 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 rounded";

export default function Header() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  const handleNavKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        closeMobileMenu();
      }
    },
    [mobileMenuOpen, closeMobileMenu],
  );

  return (
    <>
      <header
        aria-label="Main navigation"
        className="border-b bg-white dark:bg-zinc-950 sticky top-0 z-30"
        onKeyDown={handleNavKeyDown}
      >
        <nav className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-xl font-bold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 rounded"
            >
              xConfess
            </Link>

            <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className={navLinkClass}>
                Feed
              </Link>
              <Link href="/search" className={navLinkClass}>
                Search
              </Link>
              <Link href="/profile" className={navLinkClass}>
                Profile
              </Link>
              {user?.role === "admin" && (
                <Link href="/admin" className={navLinkClass + " font-bold"}>
                  Admin
                </Link>
              )}
              <Link href="/messages" className={navLinkClass}>
                Messages
              </Link>

              <div aria-hidden="true" className="h-6 w-px bg-zinc-200 dark:bg-slate-800" />

              <ThemeToggle />

              {user && (
                <div className="flex items-center space-x-4">
                  <span aria-label={`Logged in as ${user.username}`} className="text-sm text-gray-600 dark:text-slate-400">
                    @{user.username}
                  </span>
                  <button
                    onClick={logout}
                    className="flex items-center space-x-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 rounded"
                  >
                    <LogOut aria-hidden="true" size={18} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 md:hidden">
              <ThemeToggle />
              <button
                ref={menuButtonRef}
                type="button"
                className="p-2 -mr-2 text-gray-700 dark:text-slate-300 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 rounded"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-navigation"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu aria-hidden="true" size={24} />
              </button>
            </div>
          </div>
        </nav>
      </header>

      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={closeMobileMenu}
      />
    </>
  );
}
