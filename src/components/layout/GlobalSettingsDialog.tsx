
"use client";

import { useState, useEffect } from 'react';
// Removed usePathname as it's no longer needed for conditional rendering here
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Moon, Sun } from 'lucide-react';
import { HEBREW_TEXT } from '@/constants/hebrew-text';

export function GlobalSettingsDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const currentTheme = localStorage.getItem("theme");
    if (currentTheme === "dark") {
      setIsDarkMode(true);
      if (!document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.add("dark");
      }
    } else {
      setIsDarkMode(false);
      if (document.documentElement.classList.contains('dark')) {
         document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      const currentTheme = localStorage.getItem("theme");
      setIsDarkMode(currentTheme === "dark");
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);


  const handleThemeToggle = (checked: boolean) => {
    setIsDarkMode(checked);
    if (checked) {
      localStorage.setItem("theme", "dark");
      document.documentElement.classList.add("dark");
    } else {
      localStorage.setItem("theme", "light");
      document.documentElement.classList.remove("dark");
    }
  };

  // The button is now always rendered, no longer checking pathname.
  // The position is changed from left-4 to right-4.
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 right-4 z-50 bg-background/80 hover:bg-background text-foreground shadow-md rounded-full"
          aria-label={HEBREW_TEXT.profile.settings}
          title={HEBREW_TEXT.profile.settings}
        >
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl">{HEBREW_TEXT.profile.settings}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              {isDarkMode ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
              <Label htmlFor="global-dark-mode-switch" className="text-base cursor-pointer">
                {isDarkMode ? HEBREW_TEXT.profile.darkMode : HEBREW_TEXT.profile.lightMode}
              </Label>
            </div>
            <Switch
              id="global-dark-mode-switch"
              checked={isDarkMode}
              onCheckedChange={handleThemeToggle}
              aria-label={isDarkMode ? `העבר ל${HEBREW_TEXT.profile.lightMode}` : `העבר ל${HEBREW_TEXT.profile.darkMode}`}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            {HEBREW_TEXT.general.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

