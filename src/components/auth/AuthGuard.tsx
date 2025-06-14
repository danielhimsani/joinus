"use client";

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth as firebaseAuthInstance } from '@/lib/firebase';
import { FullScreenLoader } from '@/components/layout/FullScreenLoader';
import { HEBREW_TEXT } from '@/constants/hebrew-text';

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuthInstance, (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        // This is a transitional step. Ideally, components should get auth state from a global context.
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userName', fbUser.displayName || fbUser.email || HEBREW_TEXT.profile.verifiedBadge); // Using a generic term
      } else {
        setFirebaseUser(null);
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('userName');
        router.replace('/signin');
      }
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [router]);

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (!firebaseUser && !isLoading) {
    // This state should ideally not be reached if router.replace works immediately.
    // It's a fallback. The user would see a flicker of the loader then redirection.
    return <FullScreenLoader />; 
  }

  return <>{children}</>;
}
