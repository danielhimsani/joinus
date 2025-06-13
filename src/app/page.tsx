
"use client"; // Required for useRouter and localStorage

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingSlides } from '@/components/onboarding/OnboardingSlides';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state
import { cn } from '@/lib/utils';
import { Rubik } from 'next/font/google'; // Import font for direct use

const rubik = Rubik({
  subsets: ['latin', 'hebrew'],
  variable: '--font-rubik',
  display: 'swap',
  weight: ['300', '400', '500', '700']
});


// This is the mock authentication check, replace with actual Firebase auth check
const checkAuthStatus = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('isAuthenticated') === 'true';
  }
  return false; // Default to not authenticated on server or if window is not available
};

export default function HomePage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    // Client-side check for authentication
    const authStatus = checkAuthStatus();
    setIsAuthenticated(authStatus);

    if (authStatus) {
      router.replace('/events'); // Redirect authenticated users
    }
  }, [router]);

  // Show loading state while determining auth status
  if (isAuthenticated === undefined) {
    return (
      <div className={cn('font-body antialiased min-h-screen flex items-center justify-center bg-background', rubik.variable)}>
        <Skeleton className="h-64 w-full max-w-md rounded-lg" />
      </div>
    );
  }

  // If not authenticated, show onboarding slides directly without MainLayout
  if (!isAuthenticated) {
    return (
      <div className={cn('font-body antialiased bg-background text-foreground', rubik.variable)}>
        <OnboardingSlides />
      </div>
    );
  }

  // This part should ideally not be reached if redirection works correctly
  // But as a fallback or if redirection is paused for debugging:
  return (
     <div className={cn('font-body antialiased min-h-screen flex items-center justify-center bg-background', rubik.variable)}>
      <p className="text-center">Loading or redirecting...</p>
    </div>
  );
}
