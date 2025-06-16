
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
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        console.warn(
          'Push notifications require a secure context (HTTPS) or localhost. ' +
          'If testing on a mobile device, use a service like ngrok to serve your local environment over HTTPS.'
        );
        // Optionally, inform the user via UI if not on HTTPS and not localhost
        // toast({
        //   title: "Warning: Insecure Context",
        //   description: "Push notifications may not work correctly as this page is not served over HTTPS.",
        //   variant: "default", // Or "warning" if you add that variant
        //   duration: 10000,
        // });
      }

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          console.log('[NotificationSetup] Service Worker is ready: ', registration);
          if (registration.active) {
            console.log('[NotificationSetup] Active Service Worker: ', registration.active);
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
        // Small delay to ensure service worker might have had a chance to register via Firebase SDK
        setTimeout(async () => {
            await requestNotificationPermissionAndSaveToken(user.uid);
        }, 1000);
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
      }
    }).catch(err => console.error("[NotificationSetup] Error setting up foreground message listener:", err));

    return () => {
      unsubscribeAuth();
    };
  }, [toast, router]);

  return null;
}

