
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { Home, CalendarPlus, UserCircle, LogIn, LogOut, Menu, PartyPopper } from 'lucide-react'; // Kept PartyPopper in case it's used by navLinks
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from 'react';

// Mock authentication state
const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    // Simulate checking auth status
    const authStatus = localStorage.getItem('isAuthenticated') === 'true';
    setIsAuthenticated(authStatus);
    if (authStatus) {
      setUserName(localStorage.getItem('userName') || "משתמש");
    }
  }, []);
  
  const signIn = () => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userName', 'דוד כהן');
    setIsAuthenticated(true);
    setUserName('דוד כהן');
  };

  const signOut = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userName');
    setIsAuthenticated(false);
    setUserName(null);
  };

  return { isAuthenticated, userName, signIn, signOut };
};


const navLinks = [
  { href: '/', label: HEBREW_TEXT.navigation.home, icon: <Home className="ml-2 h-5 w-5" /> },
  { href: '/events', label: HEBREW_TEXT.navigation.events, icon: <PartyPopper className="ml-2 h-5 w-5" /> }, // Using PartyPopper here for nav icon
  { href: '/events/create', label: HEBREW_TEXT.navigation.createEvent, icon: <CalendarPlus className="ml-2 h-5 w-5" /> },
];

export default function Header() {
  const { isAuthenticated, userName, signIn, signOut } = useAuth();

  const UserNav = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src="https://placehold.co/100x100.png" alt={userName || "U"} data-ai-hint="user avatar" />
            <AvatarFallback>{userName ? userName.charAt(0).toUpperCase() : "U"}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {/* Mock email */}
              {userName?.toLowerCase().replace(' ', '.')}@example.com
            </p>
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
        <DropdownMenuItem onClick={signOut} className="flex items-center w-full cursor-pointer">
          <LogOut className="ml-2 h-4 w-4" />
          {HEBREW_TEXT.auth.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center space-x-2 rtl:space-x-reverse">
          <span className="text-2xl" role="img" aria-label="Ring icon">💍</span>
          <span className="font-headline text-2xl font-bold text-primary">{HEBREW_TEXT.appName}</span>
        </Link>

        <nav className="hidden items-center space-x-6 rtl:space-x-reverse md:flex">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} className="flex items-center text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
              {link.icon}
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          {isAuthenticated ? (
            <UserNav />
          ) : (
            <>
              <Button variant="ghost" asChild className="hidden md:inline-flex">
                <Link href="/auth/signin">{HEBREW_TEXT.auth.signIn}</Link>
              </Button>
              <Button asChild className="hidden md:inline-flex">
                <Link href="/auth/signup">{HEBREW_TEXT.auth.signUp}</Link>
              </Button>
              {/* Mock sign-in for development */}
              <Button onClick={signIn} variant="outline" size="sm" className="md:hidden">
                <LogIn className="h-4 w-4" />
              </Button>
            </>
          )}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">פתח תפריט ניווט</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <nav className="flex flex-col space-y-4 mt-8">
                  {navLinks.map(link => (
                    <Link key={link.href} href={link.href} className="flex items-center p-2 rounded-md hover:bg-accent">
                       {link.icon}
                      {link.label}
                    </Link>
                  ))}
                  <DropdownMenuSeparator />
                  {!isAuthenticated && (
                    <>
                     <Button variant="ghost" asChild className="w-full justify-start p-2">
                        <Link href="/auth/signin" className="flex items-center">
                          <LogIn className="ml-2 h-5 w-5" />
                          {HEBREW_TEXT.auth.signIn}
                        </Link>
                      </Button>
                      <Button asChild className="w-full justify-start p-2">
                        <Link href="/auth/signup" className="flex items-center">
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
