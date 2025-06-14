
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingSlides } from '@/components/onboarding/OnboardingSlides';
import { cn } from '@/lib/utils';
import { Rubik } from 'next/font/google';
import { onAuthStateChanged } from "firebase/auth";
import { auth as firebaseAuthInstance } from "@/lib/firebase";
import { FullScreenLoader } from '@/components/layout/FullScreenLoader';
import { HEBREW_TEXT } from '@/constants/hebrew-text';

const rubik = Rubik({
  subsets: ['latin', 'hebrew'],
  variable: '--font-rubik',
  display: 'swap',
  weight: ['300', '400', '500', '700']
});

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuthInstance, (user) => {
      if (user) {
        // User is authenticated
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userName', user.displayName || user.email || HEBREW_TEXT.profile.verifiedBadge);
        setShowOnboarding(false);
        router.replace('/events');
      } else {
        // User is not authenticated
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('userName');
        setShowOnboarding(true);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (showOnboarding) {
    return (
      <div className={cn('font-body antialiased bg-background text-foreground', rubik.variable)}>
        <OnboardingSlides />
      </div>
    );
  }

  // This state is typically when authenticated and redirecting, or if there's a brief moment.
  // Show loader until redirect completes.
  return <FullScreenLoader />;
}
