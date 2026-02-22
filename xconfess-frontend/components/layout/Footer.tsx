import Link from 'next/link';
import { Home, User, MessageSquare } from 'lucide-react';

export default function Footer() {
  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav aria-label="Mobile navigation" className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex justify-around p-3 z-50 pb-[env(safe-area-inset-bottom)]">
        <Link href="/" className="flex flex-col items-center text-zinc-500 hover:text-violet-600 transition-colors">
          <Home className="w-6 h-6" />
          <span className="text-[10px] mt-1 font-medium">Home</span>
        </Link>
        <Link href="/messages" className="flex flex-col items-center text-zinc-500 hover:text-violet-600 transition-colors">
          <MessageSquare className="w-6 h-6" />
          <span className="text-[10px] mt-1 font-medium">Messages</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center text-zinc-500 hover:text-violet-600 transition-colors">
          <User className="w-6 h-6" />
          <span className="text-[10px] mt-1 font-medium">Profile</span>
        </Link>
      </nav>

      {/* Desktop Standard Footer */}
      <footer className="hidden md:block py-6 text-center text-zinc-500 text-sm mt-auto border-t border-zinc-200 dark:border-zinc-800">
        <p>&copy; {new Date().getFullYear()} XConfess. Stay Anonymous.</p>
      </footer>
    </>
  );
}