
'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { requestNotificationPermissionAndSaveToken, onForegroundMessageListener } from '@/lib/firebase-messaging';
import { auth as firebaseAuthInstance } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { useRouter } from 'next/navigation';
import { ToastAction } from '@/components/ui/toast'; // Import ToastAction

export function NotificationSetup() {
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = firebaseAuthInstance.onAuthStateChanged(async (user: FirebaseUser | null) => {
      if (user) {
        console.log("User authenticated, attempting to set up notifications for:", user.uid);
        const permission = await requestNotificationPermissionAndSaveToken(user.uid);
        // Optional: inform user about permission status
        // if (permission === 'granted') {
        //   toast({ title: "התראות מופעלות", description: "תקבל התראות על הודעות חדשות." });
        // } else if (permission === 'denied') {
        //   toast({ title: "התראות נדחו", description: "לא תקבל התראות. תוכל לשנות זאת בהגדרות הדפדפן.", variant: "default", duration: 5000 });
        // }
      }
    });

    // Handle foreground messages
    onForegroundMessageListener().then(payload => {
      if (payload && typeof payload === 'object' && payload !== null) { // Check if payload is not null and is an object
        const notification = (payload as any).notification;
        const data = (payload as any).data;

        console.log('Foreground message received:', payload);
        toast({
          title: notification?.title || HEBREW_TEXT.notifications.newMessage,
          description: notification?.body,
          action: data?.chatId ? (
            <ToastAction altText="פתח צ'אט" onClick={() => router.push(`/chat/${data.chatId}`)}>
              פתח צ'אט
            </ToastAction>
          ) : undefined,
        });
      }
    }).catch(err => console.error("Error setting up foreground message listener:", err));


    return () => {
      unsubscribeAuth();
      // Note: onMessage returns an unsubscribe function, but onForegroundMessageListener is Promise-based.
      // If you need to unsubscribe from onMessage directly, you'd call it inside the onForegroundMessageListener logic.
      // For this setup, the listener is set up once.
    };
  }, [toast, router]);

  return null; // This component does not render anything itself
}
