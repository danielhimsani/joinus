
"use client";

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation'; // Added usePathname
import { Button } from '@/components/ui/button';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { Home, CalendarPlus, UserCircle, LogIn, LogOut, Menu, PartyPopper, Search, PlusSquare, MessageSquare } from 'lucide-react'; // Added icons
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
import { AppLogo } from '@/components/icons/AppLogo'; // Import AppLogo
import { cn } from '@/lib/utils';

// Mock authentication state
const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const router = useRouter(); 

  useEffect(() => {
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
    router.push('/'); 
  };

  return { isAuthenticated, userName, signIn, signOut };
};

// Navigation items for Desktop Top Bar (text only)
const desktopNavItems = [
  { href: '/events', label: HEBREW_TEXT.navigation.events },
  { href: '/events/create', label: HEBREW_TEXT.navigation.createEvent },
  { href: '/messages', label: HEBREW_TEXT.navigation.messages },
  { href: '/profile', label: HEBREW_TEXT.navigation.profile },
];

// Navigation items for Mobile Sheet Menu (with icons)
const sheetNavItems = [
  { href: '/events', label: HEBREW_TEXT.navigation.events, icon: <Search className="ml-2 h-5 w-5" /> },
  { href: '/events/create', label: HEBREW_TEXT.navigation.createEvent, icon: <PlusSquare className="ml-2 h-5 w-5" /> },
  { href: '/messages', label: HEBREW_TEXT.navigation.messages, icon: <MessageSquare className="ml-2 h-5 w-5" /> },
  { href: '/profile', label: HEBREW_TEXT.navigation.profile, icon: <UserCircle className="ml-2 h-5 w-5" /> },
];


export default function Header() {
  const { isAuthenticated, userName, signIn, signOut } = useAuth();
  const pathname = usePathname(); // For active link styling

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
        {/* Left side: Logo, App Name, and Desktop Nav */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2 rtl:space-x-reverse">
            <AppLogo width={83} height={30} />
            <span className="font-headline text-xl font-bold text-primary hidden sm:inline-block">{HEBREW_TEXT.appName}</span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 rtl:space-x-reverse ml-6">
            {desktopNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  // Active link styling:
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
          {isAuthenticated ? (
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
                <SheetHeader className="mb-4 border-b pb-4">
                   <Link href="/" className="flex items-center space-x-2 rtl:space-x-reverse justify-center mb-2">
                        <AppLogo width={83} height={30} />
                        <span className="font-headline text-xl font-bold text-primary">{HEBREW_TEXT.appName}</span>
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
                  {!isAuthenticated && (
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
