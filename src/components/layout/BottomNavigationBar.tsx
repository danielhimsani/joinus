
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
      <div className="grid h-full max-w-lg grid-cols-4 mx-auto font-medium">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === '/events' && pathname.startsWith('/events/'));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex flex-col items-center justify-center px-2 hover:bg-muted group",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon 
                className={cn(
                  "w-6 h-6 mb-1",
                  isActive ? "text-primary" : "text-gray-500 group-hover:text-primary"
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
