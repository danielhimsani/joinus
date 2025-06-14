
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, PlusSquare, MessageSquare, UserCircle } from 'lucide-react';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { auth as firebaseAuthInstance } from "@/lib/firebase";

const navItemsConfig = [
  { href: '/profile', label: HEBREW_TEXT.navigation.profile, icon: UserCircle, isProfile: true },
  { href: '/messages', label: HEBREW_TEXT.navigation.messages, icon: MessageSquare },
  { href: '/events/create', label: HEBREW_TEXT.navigation.createEvent, icon: PlusSquare },
  { href: '/events', label: HEBREW_TEXT.navigation.events, icon: Search },
];

export default function BottomNavigationBar() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    const unsubscribe = onAuthStateChanged(firebaseAuthInstance, (user) => {
      setFirebaseUser(user);
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-background border-t border-border md:hidden">
      <div className="flex h-full max-w-lg mx-auto font-medium items-center justify-around">
        {navItemsConfig.map((item) => {
          let currentItemIsActive = false;
          if (isMounted) {
            if (item.href === '/events') {
              currentItemIsActive = (pathname === item.href || (pathname.startsWith(item.href + '/') && pathname !== '/events/create'));
            } else {
              currentItemIsActive = pathname === item.href;
            }
          }

          let IconElement: React.ReactNode;
          const DefaultIcon = item.icon;

          if (item.isProfile) {
            const userInitial = firebaseUser?.displayName?.charAt(0).toUpperCase() || firebaseUser?.email?.charAt(0).toUpperCase() || 'U';
            IconElement = isLoadingAuth ? (
              <UserCircle className={cn("w-6 h-6 mb-1", currentItemIsActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground/80")} />
            ) : firebaseUser && firebaseUser.photoURL ? (
              <Avatar className={cn("w-6 h-6 mb-1 rounded-full", currentItemIsActive && "ring-2 ring-primary ring-offset-1 ring-offset-background")}>
                <AvatarImage src={firebaseUser.photoURL} alt={firebaseUser.displayName || "User"} data-ai-hint="profile picture bottomnav" />
                <AvatarFallback className="text-xs">{userInitial}</AvatarFallback>
              </Avatar>
            ) : ( // Fallback to UserCircle if no photoURL or not logged in (after loading)
              <UserCircle className={cn("w-6 h-6 mb-1", currentItemIsActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground/80")} />
            );
          } else {
            IconElement = <DefaultIcon className={cn("w-6 h-6 mb-1", currentItemIsActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground/80")} />;
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
              {IconElement}
              <span className={cn("text-xs", currentItemIsActive && "text-primary")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
