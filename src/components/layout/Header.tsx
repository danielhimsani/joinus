
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { LogIn, LogOut, Menu, UserCircle, Search, PlusSquare, MessageSquare, Contact as UserPlaceholderIcon, Award } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { auth as firebaseAuthInstance, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import type { EventChat } from '@/types';

// Navigation items for Desktop Top Bar
const desktopNavItems = [
  { href: '/events', label: HEBREW_TEXT.navigation.events },
  { href: '/events/create', label: HEBREW_TEXT.navigation.createEvent },
  { href: '/messages', label: HEBREW_TEXT.navigation.messages },
  { href: '/hall-of-fame', label: HEBREW_TEXT.navigation.hallOfFame },
  // Profile link is accessed via avatar dropdown
];

// Navigation items for Mobile Sheet Menu
const sheetNavItems = [
  { href: '/events', label: HEBREW_TEXT.navigation.events, icon: <Search className="ml-2 h-5 w-5" /> },
  { href: '/events/create', label: HEBREW_TEXT.navigation.createEvent, icon: <PlusSquare className="ml-2 h-5 w-5" /> },
  { href: '/messages', label: HEBREW_TEXT.navigation.messages, icon: <MessageSquare className="ml-2 h-5 w-5" /> },
  { href: '/hall-of-fame', label: HEBREW_TEXT.navigation.hallOfFame, icon: <Award className="ml-2 h-5 w-5" /> },
  { href: '/profile', label: HEBREW_TEXT.navigation.profile, icon: <UserCircle className="ml-2 h-5 w-5" /> },
];


export default function Header() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [isLoadingUnread, setIsLoadingUnread] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(firebaseAuthInstance, (user) => {
      setFirebaseUser(user);
      setIsLoadingAuth(false);
      if (!user) {
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
    const q = query(chatsRef, where("participants", "array-contains", firebaseUser.uid));

    const unsubscribeChats = onSnapshot(q, (querySnapshot) => {
      let unreadSum = 0;
      querySnapshot.forEach((doc) => {
        const chatData = doc.data() as EventChat;
        if (chatData.unreadCount && chatData.unreadCount[firebaseUser.uid]) {
          unreadSum += chatData.unreadCount[firebaseUser.uid];
        }
      });
      setTotalUnreadCount(unreadSum);
      setIsLoadingUnread(false);
    }, (error) => {
      console.error("Error fetching unread messages count for header:", error);
      setTotalUnreadCount(0);
      setIsLoadingUnread(false);
    });

    return () => unsubscribeChats();
  }, [firebaseUser]);

  const handleSignOut = async () => {
    try {
      await firebaseAuthInstance.signOut();
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userName');
      router.push('/');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const UserNav = () => {
    if (isLoadingAuth) {
      return <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />;
    }
    if (!firebaseUser) return null;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              {firebaseUser.photoURL ? (
                <AvatarImage src={firebaseUser.photoURL} alt={firebaseUser.displayName || "User"} data-ai-hint="profile picture" />
              ) : (
                <AvatarFallback className="bg-muted">
                    <UserPlaceholderIcon className="h-6 w-6 text-muted-foreground" />
                </AvatarFallback>
              )}
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount dir="rtl">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1 text-center">
              <p className="text-sm font-medium leading-none">{firebaseUser.displayName || "משתמש"}</p>
              {firebaseUser.email && (
                <p className="text-xs leading-none text-muted-foreground">
                  {firebaseUser.email}
                </p>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile" className="flex items-center w-full">
              <UserCircle className="ml-2 h-4 w-4" />
              {HEBREW_TEXT.navigation.profile}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="flex items-center w-full cursor-pointer">
            <LogOut className="ml-2 h-4 w-4" />
            {HEBREW_TEXT.auth.signOut}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <Link href="/" className="flex items-center">
            <Image src="/app_logo.png" alt={HEBREW_TEXT.appName} width={100} height={30} className="h-auto" data-ai-hint="app logo" />
          </Link>
          <nav className="hidden md:flex items-center space-x-1 rtl:space-x-reverse">
            {desktopNavItems.map((item) => {
              const isActive = pathname === item.href || (item.href === '/events' && pathname.startsWith('/events/') && pathname !== '/events/create' && pathname !== '/hall-of-fame');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5", // Added flex and gap
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-foreground/70 hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  {item.label}
                  {item.href === '/messages' && totalUnreadCount > 0 && !isLoadingUnread && (
                    <span className="text-xs bg-primary text-primary-foreground rounded-full h-5 min-w-[1.25rem] flex items-center justify-center px-1.5">
                      {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          {!isLoadingAuth && (firebaseUser ? (
            <UserNav />
          ) : (
            <>
              <Button variant="ghost" asChild className="hidden md:inline-flex">
                <Link href="/signin">{HEBREW_TEXT.auth.signIn}</Link>
              </Button>
              <Button asChild className="hidden md:inline-flex">
                <Link href="/signup">{HEBREW_TEXT.auth.signUp}</Link>
              </Button>
            </>
          ))}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">פתח תפריט ניווט</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader className="mb-4 border-b pb-4">
                   <Link href="/" className="flex items-center space-x-2 rtl:space-x-reverse justify-center mb-2">
                        <Image src="/app_logo.png" alt={HEBREW_TEXT.appName} width={83} height={24} className="h-auto" data-ai-hint="app logo" />
                    </Link>
                  <SheetTitle className="text-center text-lg font-normal text-muted-foreground">{HEBREW_TEXT.navigation.mobileMenuTitle}</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col space-y-2 mt-4">
                  {sheetNavItems.map(link => {
                    const isActive = pathname === link.href || (link.href === '/events' && pathname.startsWith('/events/') && pathname !== '/events/create' && pathname !== '/hall-of-fame');
                    return (
                      <Button
                          variant="ghost"
                          asChild
                          key={link.href}
                          className={cn(
                              "w-full justify-start p-3 text-base",
                              isActive
                              ? "text-primary bg-primary/10"
                              : "text-foreground/80 hover:text-foreground"
                          )}
                      >
                          <Link href={link.href} className="flex items-center justify-between w-full">
                              <div className="flex items-center">
                                {link.icon}
                                {link.label}
                              </div>
                              {link.href === '/messages' && totalUnreadCount > 0 && !isLoadingUnread && (
                                <span className="text-xs bg-primary text-primary-foreground rounded-full h-5 min-w-[1.25rem] flex items-center justify-center px-1.5">
                                  {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                                </span>
                              )}
                          </Link>
                      </Button>
                    );
                  })}
                  <DropdownMenuSeparator className="my-2"/>
                  {!isLoadingAuth && !firebaseUser && (
                    <>
                     <Button variant="ghost" asChild className="w-full justify-start p-3 text-base">
                        <Link href="/signin" className="flex items-center">
                          <LogIn className="ml-2 h-5 w-5" />
                          {HEBREW_TEXT.auth.signIn}
                        </Link>
                      </Button>
                      <Button variant="default" asChild className="w-full justify-start p-3 text-base">
                        <Link href="/signup" className="flex items-center">
                          <UserCircle className="ml-2 h-5 w-5" />
                          {HEBREW_TEXT.auth.signUp}
                        </Link>
                      </Button>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
