
"use client";

import Link from 'next/link';
import Image from 'next/image'; // Added for PNG logo
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { LogIn, LogOut, Menu, UserCircle, Search, PlusSquare, MessageSquare, Contact as UserPlaceholderIcon } from 'lucide-react';
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
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth"; // Firebase Auth
import { auth as firebaseAuthInstance } from "@/lib/firebase"; // Firebase Auth Instance

// Navigation items for Desktop Top Bar
const desktopNavItems = [
  { href: '/events', label: HEBREW_TEXT.navigation.events },
  { href: '/events/create', label: HEBREW_TEXT.navigation.createEvent },
  { href: '/messages', label: HEBREW_TEXT.navigation.messages },
  // Profile link is accessed via avatar dropdown
];

// Navigation items for Mobile Sheet Menu
const sheetNavItems = [
  { href: '/events', label: HEBREW_TEXT.navigation.events, icon: <Search className="ml-2 h-5 w-5" /> },
  { href: '/events/create', label: HEBREW_TEXT.navigation.createEvent, icon: <PlusSquare className="ml-2 h-5 w-5" /> },
  { href: '/messages', label: HEBREW_TEXT.navigation.messages, icon: <MessageSquare className="ml-2 h-5 w-5" /> },
  { href: '/profile', label: HEBREW_TEXT.navigation.profile, icon: <UserCircle className="ml-2 h-5 w-5" /> }, // Profile link remains in sheet for direct access
];


export default function Header() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuthInstance, (user) => {
      setFirebaseUser(user);
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await firebaseAuthInstance.signOut();
      // Clear any local mock auth state if it was used before full Firebase integration
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userName');
      router.push('/'); // Redirect to home page after sign out
    } catch (error) {
      console.error("Error signing out: ", error);
      // Optionally, show a toast message for sign-out error
    }
  };

  const UserNav = () => {
    if (isLoadingAuth) {
      return <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />; // Skeleton for avatar
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
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
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
        {/* Left side: Logo and Desktop Nav */}
        <div className="flex items-center space-x-4 rtl:space-x-reverse"> {/* Added space-x-4 for padding */}
          <Link href="/" className="flex items-center"> {/* Removed internal space-x from Link */}
            <Image src="/app_logo.png" alt={HEBREW_TEXT.appName} width={100} height={30} className="h-auto" data-ai-hint="app logo" />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 rtl:space-x-reverse"> {/* Removed ml-6 */}
            {desktopNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  (pathname === item.href || (item.href === '/events' && pathname.startsWith('/events/') && pathname !== '/events/create'))
                    ? "text-primary bg-primary/10"
                    : "text-foreground/70 hover:text-foreground hover:bg-muted/50",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right side: Auth buttons / UserNav / Mobile Menu Trigger */}
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
          <div className="md:hidden"> {/* This ensures SheetTrigger is only for mobile */}
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
                  {sheetNavItems.map(link => (
                    <Button
                        variant="ghost"
                        asChild
                        key={link.href}
                        className={cn(
                            "w-full justify-start p-3 text-base",
                            (pathname === link.href || (link.href === '/events' && pathname.startsWith('/events/') && pathname !== '/events/create'))
                            ? "text-primary bg-primary/10"
                            : "text-foreground/80 hover:text-foreground"
                        )}
                    >
                        <Link href={link.href} className="flex items-center">
                        {link.icon}
                        {link.label}
                        </Link>
                    </Button>
                  ))}
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
