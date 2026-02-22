import Link from 'next/link';
import { Home, User, MessageSquare, Settings } from 'lucide-react';

export default function Sidebar() {
  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Profile', href: '/profile', icon: User },
    { label: 'Messages', href: '/messages', icon: MessageSquare },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 sticky top-0 h-[calc(100vh-64px)]">
      <nav className="flex-1 space-y-2 mt-4">
        {navItems.map((item) => (
          <Link 
            key={item.href} 
            href={item.href}
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-zinc-600 dark:text-zinc-400 hover:text-violet-600 dark:hover:text-violet-400 font-medium"
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}