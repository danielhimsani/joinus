
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, PlusSquare, MessageSquare, UserCircle, Contact as UserPlaceholderIcon, Award } from 'lucide-react';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { auth as firebaseAuthInstance, db } from "@/lib/firebase"; // Added db
import { collection, query, where, onSnapshot, type DocumentData } from "firebase/firestore"; // Firebase imports
import type { EventChat } from '@/types'; // Import EventChat type

// Updated order: Events, Requests (Messages), Create Event, Hall of Fame, Profile
const navItemsConfig = [
  { href: '/events', label: HEBREW_TEXT.navigation.events, icon: Search },
  { href: '/messages', label: HEBREW_TEXT.navigation.messages, icon: MessageSquare, isMessages: true },
  { href: '/events/create', label: HEBREW_TEXT.navigation.createEvent, icon: PlusSquare },
  { href: '/hall-of-fame', label: HEBREW_TEXT.navigation.hallOfFame, icon: Award },
  { href: '/profile', label: HEBREW_TEXT.navigation.profile, icon: UserCircle, isProfile: true },
];

export default function BottomNavigationBar() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [isLoadingUnread, setIsLoadingUnread] = useState(true);


  useEffect(() => {
    setIsMounted(true);
    const unsubscribeAuth = onAuthStateChanged(firebaseAuthInstance, (user) => {
      setFirebaseUser(user);
      setIsLoadingAuth(false);
      if (!user) { // If user logs out, reset unread count
        setTotalUnreadCount(0);
        setIsLoadingUnread(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!firebaseUser) {
      setTotalUnreadCount(0);
      setIsLoadingUnread(false);
      return;
    }

    setIsLoadingUnread(true);
    const chatsRef = collection(db, "eventChats");
    // Query for chats where the current user is a participant
    const q = query(chatsRef, where("participants", "array-contains", firebaseUser.uid));

    const unsubscribeChats = onSnapshot(q, (querySnapshot) => {
      let unreadSum = 0;
      querySnapshot.forEach((doc) => {
        const chatData = doc.data() as EventChat; // Cast to EventChat
        if (chatData.unreadCount && chatData.unreadCount[firebaseUser.uid]) {
          unreadSum += chatData.unreadCount[firebaseUser.uid];
        }
      });
      setTotalUnreadCount(unreadSum);
      setIsLoadingUnread(false);
    }, (error) => {
      console.error("Error fetching unread messages count:", error);
      setTotalUnreadCount(0); // Reset on error
      setIsLoadingUnread(false);
    });

    return () => unsubscribeChats(); // Cleanup snapshot listener
  }, [firebaseUser]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-background border-t border-border md:hidden">
      <div className="grid grid-cols-5 h-full max-w-lg mx-auto font-medium items-center justify-around">
        {navItemsConfig.map((item) => {
          let currentItemIsActive = false;
          if (isMounted) {
            if (item.href === '/events') {
              currentItemIsActive = (pathname === item.href || (pathname.startsWith(item.href + '/') && pathname !== '/events/create' && pathname !== '/hall-of-fame'));
            } else {
              currentItemIsActive = pathname === item.href || pathname.startsWith(item.href + '/');
            }
             // Special check for /events/create to not activate /events
            if (item.href === '/events' && (pathname === '/events/create' || pathname === '/hall-of-fame')) {
                currentItemIsActive = false;
            }
          }

          let IconElement: React.ReactNode;
          const DefaultIcon = item.icon;

          if (item.isProfile) {
            IconElement = isLoadingAuth ? (
              <UserCircle className={cn("w-6 h-6 mb-1", currentItemIsActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground/80")} />
            ) : firebaseUser && firebaseUser.photoURL ? (
              <Avatar className={cn("w-6 h-6 mb-1 rounded-full", currentItemIsActive && "ring-2 ring-primary ring-offset-1 ring-offset-background")}>
                <AvatarImage src={firebaseUser.photoURL} alt={firebaseUser.displayName || "User"} data-ai-hint="profile picture bottomnav" />
                <AvatarFallback className="text-xs bg-muted">
                  <UserPlaceholderIcon className="h-4 w-4 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
            ) : firebaseUser ? (
               <Avatar className={cn("w-6 h-6 mb-1 rounded-full", currentItemIsActive && "ring-2 ring-primary ring-offset-1 ring-offset-background")}>
                  <AvatarFallback className="text-xs bg-muted">
                      <UserPlaceholderIcon className="h-4 w-4 text-muted-foreground" />
                  </AvatarFallback>
              </Avatar>
            ) : ( 
              <UserCircle className={cn("w-6 h-6 mb-1", currentItemIsActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground/80")} />
            );
          } else if (item.isMessages) {
             IconElement = (
                <div className="relative">
                    <DefaultIcon className={cn("w-6 h-6 mb-1", currentItemIsActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground/80")} />
                    {totalUnreadCount > 0 && !isLoadingUnread && (
                         <span className="absolute -top-1 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                            {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                        </span>
                    )}
                </div>
            );
          }
          else {
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
