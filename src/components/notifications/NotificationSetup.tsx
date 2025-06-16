
'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { requestNotificationPermissionAndSaveToken, onForegroundMessageListener } from '@/lib/firebase-messaging';
import { auth as firebaseAuthInstance } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { useRouter } from 'next/navigation';
import { ToastAction } from '@/components/ui/toast';

export function NotificationSetup() {
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.location.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        console.warn(
          '[NotificationSetup] Push notifications require a secure context (HTTPS) or localhost. ' +
          'If testing on a mobile device, use a service like ngrok to serve your local environment over HTTPS.'
        );
        // toast({
        //   title: "אזהרה: הקשר לא מאובטח",
        //   description: "התראות דחיפה עשויות לא לעבוד כראוי מכיוון שהעמוד אינו מוגש בפרוטוקול HTTPS.",
        //   variant: "default",
        //   duration: 10000,
        // });
      } else {
        console.log('[NotificationSetup] Context is secure (HTTPS or localhost).');
      }

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(registration => {
          if (registration) {
            console.log('[NotificationSetup] Service Worker registration found:', registration);
            if (registration.active) {
              console.log('[NotificationSetup] Active Service Worker on load:', registration.active);
            }
          } else {
            console.warn('[NotificationSetup] No Service Worker registration found on initial load.');
          }
        }).catch(error => {
          console.error('[NotificationSetup] Error getting Service Worker registration on load:', error);
        });

        navigator.serviceWorker.ready.then(registration => {
          console.log('[NotificationSetup] Service Worker is ready: ', registration);
          if (registration.active) {
            console.log('[NotificationSetup] Active Service Worker (via ready): ', registration.active);
          } else {
            console.warn('[NotificationSetup] No active Service Worker found by navigator.serviceWorker.ready');
          }
        }).catch(error => {
          console.error('[NotificationSetup] Service Worker registration failed or not ready: ', error);
        });

      } else {
        console.warn('[NotificationSetup] Service workers are not supported in this browser.');
      }
    }

    const unsubscribeAuth = firebaseAuthInstance.onAuthStateChanged(async (user: FirebaseUser | null) => {
      if (user) {
        console.log("[NotificationSetup] User authenticated, attempting to set up notifications for:", user.uid);
        // Small delay to ensure service worker might have had a chance to register
        // This might not be strictly necessary if navigator.serviceWorker.ready is awaited in requestPermission...
        setTimeout(async () => {
            await requestNotificationPermissionAndSaveToken(user.uid);
        }, 1500); // Increased delay slightly
      } else {
        console.log("[NotificationSetup] No user authenticated, notifications setup skipped.");
      }
    });

    onForegroundMessageListener().then(messagePayload => {
      if (messagePayload && typeof messagePayload === 'object' && messagePayload !== null) {
        const notification = (messagePayload as any).notification;
        const data = (messagePayload as any).data;

        console.log('[NotificationSetup] Foreground message received:', messagePayload);
        
        let title = HEBREW_TEXT.notifications.newMessage;
        let body = "You have a new message.";

        if (notification) {
          title = notification.title || title;
          body = notification.body || body;
        } else if (data) {
          title = data.title || title;
          body = data.body || body;
        }
        
        toast({
          title: title,
          description: body,
          action: data?.chatId ? (
            <ToastAction altText="פתח צ'אט" onClick={() => router.push(`/chat/${data.chatId}`)}>
              פתח צ'אט
            </ToastAction>
          ) : undefined,
        });
      } else if (messagePayload === null) {
        console.log('[NotificationSetup] Foreground message listener resolved with null (messaging not supported or not in browser).');
      }
    }).catch(err => console.error("[NotificationSetup] Error setting up foreground message listener:", err));

    return () => {
      unsubscribeAuth();
    };
  }, [toast, router]);

  return null;
}
