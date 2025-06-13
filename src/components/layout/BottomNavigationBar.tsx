
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, PlusSquare, MessageSquare, UserCircle } from 'lucide-react';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/events', label: HEBREW_TEXT.navigation.events, icon: Search },
  { href: '/events/create', label: HEBREW_TEXT.navigation.createEvent, icon: PlusSquare },
  { href: '/messages', label: HEBREW_TEXT.navigation.messages, icon: MessageSquare },
  { href: '/profile', label: HEBREW_TEXT.navigation.profile, icon: UserCircle },
];

export default function BottomNavigationBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-background border-t border-border md:hidden">
      {/* Changed from grid to flex for horizontal layout */}
      <div className="flex h-full max-w-lg mx-auto font-medium items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === '/events' && pathname.startsWith('/events/'));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex flex-col items-center justify-center px-1 group", // Reduced px slightly
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground/80" // Adjusted hover for non-active
              )}
            >
              <item.icon 
                className={cn(
                  "w-6 h-6 mb-1",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground/80" // Adjusted hover for non-active icon
                )} 
              />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
