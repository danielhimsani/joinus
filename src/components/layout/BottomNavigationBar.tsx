
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, PlusSquare, MessageSquare, UserCircle } from 'lucide-react';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

const navItems = [
  { href: '/profile', label: HEBREW_TEXT.navigation.profile, icon: UserCircle },
  { href: '/messages', label: HEBREW_TEXT.navigation.messages, icon: MessageSquare },
  { href: '/events/create', label: HEBREW_TEXT.navigation.createEvent, icon: PlusSquare },
  { href: '/events', label: HEBREW_TEXT.navigation.events, icon: Search },
];

export default function BottomNavigationBar() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-background border-t border-border md:hidden">
      <div className="flex h-full max-w-lg mx-auto font-medium items-center justify-around">
        {navItems.map((item) => {
          let currentItemIsActive = false;
          if (isMounted) {
            if (item.href === '/events') {
              // Active for /events or /events/sub-path, but NOT /events/create
              currentItemIsActive = (pathname === item.href || (pathname.startsWith(item.href + '/') && pathname !== '/events/create'));
            } else {
              // For all other items (e.g., /profile, /messages, /events/create), direct match
              currentItemIsActive = pathname === item.href;
            }
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex flex-col items-center justify-center px-1 group",
                currentItemIsActive ? "text-primary" : "text-muted-foreground hover:text-foreground/80"
              )}
            >
              <item.icon
                className={cn(
                  "w-6 h-6 mb-1",
                  currentItemIsActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground/80"
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
