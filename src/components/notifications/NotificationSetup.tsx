
'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { requestNotificationPermissionAndSaveToken, onForegroundMessageListener } from '@/lib/firebase-messaging';
import { auth as firebaseAuthInstance } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { useRouter } from 'next/navigation';
import { ToastAction } from '@/components/ui/toast';
import { isSupported } from 'firebase/messaging'; // Import isSupported

const UNSUPPORTED_NOTIFICATION_SHOWN_KEY = 'hasShownUnsupportedNotification';

export function NotificationSetup() {
  const { toast } = useToast();
  const router = useRouter();
  // No need for messagingIsSupported state here anymore as we'll check directly in useEffect

  useEffect(() => {
    const setupNotifications = async () => {
      const supported = await isSupported();
      console.log('[NotificationSetup] Firebase Messaging isSupported():', supported);

      if (!supported) {
        const hasShownUnsupportedToast = localStorage.getItem(UNSUPPORTED_NOTIFICATION_SHOWN_KEY);
        if (!hasShownUnsupportedToast) {
          console.warn('[NotificationSetup] Firebase Messaging is not supported in this browser.');
          const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
          if (isIOS) {
            toast({
              title: "התראות דחיפה",
              description: "במכשירי iOS, יש להוסיף את האפליקציה למסך הבית כדי לאפשר התראות דחיפה (מ-iOS 16.4 ואילך).",
              variant: "default",
              duration: 10000,
            });
          } else {
            toast({
              title: "התראות דחיפה",
              description: "הדפדפן שלך אינו תומך באופן מלא בהתראות דחיפה, או שהן אינן מאופשרות.",
              variant: "default",
              duration: 7000,
            });
          }
          localStorage.setItem(UNSUPPORTED_NOTIFICATION_SHOWN_KEY, 'true');
        }
        return; // Stop further execution if not supported
      }

      // Proceed with notification setup only if supported
      if (typeof window !== 'undefined') {
        if (window.location.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
          console.warn(
            '[NotificationSetup] Push notifications require a secure context (HTTPS) or localhost. ' +
            'If testing on a mobile device, use a service like ngrok to serve your local environment over HTTPS.'
          );
        } else {
          console.log('[NotificationSetup] Context is secure (HTTPS or localhost).');
        }

        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistration().then(registration => {
            if (registration) {
              console.log('[NotificationSetup] Service Worker registration found:', registration.scope);
              if (registration.active) {
                console.log('[NotificationSetup] Active Service Worker on load:', registration.active.scriptURL);
              }
            } else {
              console.warn('[NotificationSetup] No Service Worker registration found on initial load.');
            }
          }).catch(error => {
            console.error('[NotificationSetup] Error getting Service Worker registration on load:', error);
          });

          navigator.serviceWorker.ready.then(registration => {
            console.log('[NotificationSetup] Service Worker is ready: ', registration.scope);
            if (registration.active) {
              console.log('[NotificationSetup] Active Service Worker (via ready): ', registration.active.scriptURL);
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
          await requestNotificationPermissionAndSaveToken(user.uid);
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

      // Return the auth unsubscription function for cleanup by useEffect
      return unsubscribeAuth;
    };

    let authUnsubscribe: (() => void) | undefined;
    
    setupNotifications().then(unsubscribeFn => {
      authUnsubscribe = unsubscribeFn;
    });

    // Cleanup function for useEffect
    return () => {
      if (authUnsubscribe) {
        authUnsubscribe();
      }
    };
  }, [toast, router]);

  return null;
}
