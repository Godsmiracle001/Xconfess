'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, User, MessageSquare, Settings } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Profile', href: '/profile', icon: User },
    { label: 'Messages', href: '/messages', icon: MessageSquare },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside aria-label="Main navigation" className="hidden md:flex flex-col w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 sticky top-16 h-[calc(100vh-4rem)]">
      <nav className="flex-1 space-y-2 mt-4">
        {navItems.map((item) => {
          // Check if the link is active
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${
                isActive 
                  ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-violet-600 dark:hover:text-violet-400'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}