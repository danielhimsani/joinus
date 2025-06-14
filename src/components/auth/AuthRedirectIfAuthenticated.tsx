"use client";

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth as firebaseAuthInstance } from '@/lib/firebase';
import { FullScreenLoader } from '@/components/layout/FullScreenLoader';

export function AuthRedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuthInstance, (user) => {
      if (user) {
        // If user is signed in, redirect them from auth pages (signin/signup)
        router.replace('/events'); // Or to '/profile' or another appropriate page
      }
      // If no user, we allow rendering children (the auth form)
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (isLoading) {
    return <FullScreenLoader />;
  }

  // If not loading and no user (or user existed and redirect is happening), render children
  return <>{children}</>;
}
