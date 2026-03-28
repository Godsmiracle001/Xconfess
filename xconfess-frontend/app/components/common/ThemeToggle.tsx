"use client";

import { useTheme } from "../../lib/hooks/useTheme";
import { Sun, Moon, Laptop } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-9 w-24 rounded-full border border-gray-200 bg-white/50 p-1 dark:border-slate-800 dark:bg-slate-950/50" />
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <button
        onClick={() => setTheme("light")}
        className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300 ${
          theme === "light"
            ? "bg-purple-100 text-purple-600 shadow-sm dark:bg-slate-800 dark:text-purple-400"
            : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-slate-100"
        }`}
        aria-label="Light mode"
        title="Light Mode"
      >
        <Sun size={14} />
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300 ${
          theme === "dark"
            ? "bg-purple-100 text-purple-600 shadow-sm dark:bg-slate-800 dark:text-purple-400"
            : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-slate-100"
        }`}
        aria-label="Dark mode"
        title="Dark Mode"
      >
        <Moon size={14} />
      </button>
      <button
        onClick={() => setTheme("system")}
        className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300 ${
          theme === "system"
            ? "bg-purple-100 text-purple-600 shadow-sm dark:bg-slate-800 dark:text-purple-400"
            : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-slate-100"
        }`}
        aria-label="System preference"
        title="System Preference"
      >
        <Laptop size={14} />
      </button>
    </div>
  );
}
