
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { app, db } from './firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { Toast } from '@/hooks/use-toast'; // For type hint if passing toast

// Define a more descriptive result type
export type NotificationSetupResult = {
  status: 'granted' | 'denied' | 'default' | 'not-supported' | 'sw-inactive' | 'vapid-key-missing' | 'error';
  token?: string | null;
  error?: any;
};

export const requestNotificationPermissionAndSaveToken = async (userId: string): Promise<NotificationSetupResult> => {
  console.log('[FCM Setup] Attempting to request permission and save token for user:', userId);

  const messagingSupported = await isSupported();
  console.log('[FCM Setup] Firebase Messaging isSupported():', messagingSupported);

  if (!messagingSupported) {
    console.warn('[FCM Setup] Firebase Messaging is not supported in this browser environment.');
    return { status: 'not-supported', error: new Error("Firebase Messaging not supported by browser") };
  }

  if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
    try {
      console.log('[FCM Setup] Browser supports Notification and ServiceWorker.');

      const swRegistration = await navigator.serviceWorker.ready;
      console.log('[FCM Setup] Service worker is ready. Active script URL:', swRegistration.active?.scriptURL);

      if (!swRegistration.active) {
        console.error('[FCM Setup] Service worker is ready but not active. This is unexpected. Cannot get token.');
        return { status: 'sw-inactive', error: new Error("Service worker not active") };
      }

      const messaging = getMessaging(app);
      const permission = await Notification.requestPermission();
      console.log('[FCM Setup] Notification.requestPermission() status:', permission);

      if (permission === 'granted') {
        console.log('[FCM Setup] Notification permission granted.');
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
          console.error("[FCM Setup] VAPID key is not defined. Push notifications will not work. Define NEXT_PUBLIC_FIREBASE_VAPID_KEY in your .env.local file.");
          return { status: 'vapid-key-missing', error: new Error("VAPID key missing in config") };
        }

        console.log('[FCM Setup] Attempting to get FCM token with VAPID key and SW registration...');
        const currentToken = await getToken(messaging, {
          vapidKey: vapidKey,
          serviceWorkerRegistration: swRegistration,
        });

        if (currentToken) {
          console.log('[FCM Setup] FCM Token obtained:', currentToken);
          console.log('FCM Token (for testing):', currentToken);

          const tokenRef = doc(db, 'users', userId, 'fcmTokens', currentToken);
          await setDoc(tokenRef, {
            token: currentToken,
            createdAt: serverTimestamp(),
            userAgent: navigator.userAgent,
          }, { merge: true });
          console.log('[FCM Setup] FCM token saved/updated in Firestore for user:', userId);
          return { status: 'granted', token: currentToken };
        } else {
          console.warn('[FCM Setup] No registration token available after permission grant. This usually indicates a problem with the service worker, VAPID key, or API permissions.');
          return { status: 'error', error: new Error("Token not obtained despite granted permission") };
        }
      } else if (permission === 'denied') {
        console.warn('[FCM Setup] Notification permission denied by user.');
        return { status: 'denied' };
      } else { // permission === 'default'
        console.warn('[FCM Setup] Notification permission not granted (dismissed or default). Status:', permission);
        return { status: 'default' };
      }
    } catch (error) {
      console.error('[FCM Setup] An error occurred while requesting permission or token: ', error);
      if (error instanceof Error) {
        if (error.name === 'FirebaseError' && (error as any).code === 'messaging/failed-serviceworker-registration') {
          console.error("[FCM Setup] Failed to register service worker. Ensure 'firebase-messaging-sw.js' is in the public folder and correctly configured.");
        } else if (error.message.includes("no active Service Worker") || error.message.includes("Subscription failed")) {
           console.error("[FCM Setup] getToken failed, likely because there's no active Service Worker or subscription failed. Ensure HTTPS and SW is correctly registered and activated.");
        }
      }
      return { status: 'error', error };
    }
  } else {
    console.warn('[FCM Setup] Push notifications or service workers not supported/available in this browser window context.');
    return { status: 'not-supported', error: new Error("Browser environment lacks Notification/ServiceWorker API") };
  }
};

export const onForegroundMessageListener = () =>
  new Promise(async (resolve) => { 
    const supported = await isSupported();
    if (supported && typeof window !== 'undefined' && 'serviceWorker' in navigator && window.Notification) {
      try {
        const messaging = getMessaging(app);
        onMessage(messaging, (payload) => {
          console.log('[FCM Setup] Foreground message received. ', payload);
          resolve(payload);
        });
      } catch (error) {
        console.error('[FCM Setup] Error initializing foreground message listener:', error);
        resolve(null);
      }
    } else {
      console.log('[FCM Setup] Foreground messages not supported or not in a suitable browser environment.');
      resolve(null);
    }
  });
