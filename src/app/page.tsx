
"use client"; // Required for useRouter and localStorage

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from "@/app/(main)/layout";
import { OnboardingSlides } from '@/components/onboarding/OnboardingSlides';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

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
      <MainLayout>
        <div className="container mx-auto px-4 py-12 md:py-16 flex justify-center items-center min-h-screen">
          <Skeleton className="h-64 w-full max-w-md rounded-lg" />
        </div>
      </MainLayout>
    );
  }

  // If not authenticated, show onboarding slides
  if (!isAuthenticated) {
    return (
      <MainLayout>
        <OnboardingSlides />
      </MainLayout>
    );
  }

  // This part should ideally not be reached if redirection works correctly
  // But as a fallback or if redirection is paused for debugging:
  return (
     <MainLayout>
      <div className="container mx-auto px-4 py-12 md:py-16">
        <p className="text-center">Loading or redirecting...</p>
      </div>
    </MainLayout>
  );
}
