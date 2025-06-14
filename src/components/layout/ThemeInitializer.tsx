
"use client";

import { useEffect } from 'react';

export function ThemeInitializer() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      // Default to light theme or if 'light' is explicitly set
      document.documentElement.classList.remove('dark');
    }
  }, []);
  return null; // This component doesn't render anything
}
