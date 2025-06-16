
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { app, db } from './firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export const requestNotificationPermissionAndSaveToken = async (userId: string): Promise<string | null> => {
  console.log('[FCM Setup] Attempting to request permission and save token for user:', userId);

  const messagingSupported = await isSupported();
  console.log('[FCM Setup] Firebase Messaging isSupported():', messagingSupported);

  if (!messagingSupported) {
    console.warn('[FCM Setup] Firebase Messaging is not supported in this browser.');
    alert('Firebase Messaging is not supported in this browser.');
    return null;
  }

  if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
    try {
      console.log('[FCM Setup] Browser supports Notification and ServiceWorker.');

      // Log current service worker status
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        console.log('[FCM Setup] ServiceWorker registration found:', registration);
        if (registration.active) {
          console.log('[FCM Setup] Active ServiceWorker:', registration.active);
        } else if (registration.waiting) {
          console.log('[FCM Setup] Waiting ServiceWorker:', registration.waiting);
        } else if (registration.installing) {
          console.log('[FCM Setup] Installing ServiceWorker:', registration.installing);
        }
      } else {
        console.warn('[FCM Setup] No ServiceWorker registration found yet. This might be an issue if it persists.');
      }
      
      // Wait for the service worker to be ready and active
      console.log('[FCM Setup] Waiting for service worker to be ready...');
      const swRegistration = await navigator.serviceWorker.ready;
      console.log('[FCM Setup] Service worker is ready and active:', swRegistration.active);

      const messaging = getMessaging(app);
      const permission = await Notification.requestPermission();
      console.log('[FCM Setup] Notification.requestPermission() status:', permission);

      if (permission === 'granted') {
        console.log('[FCM Setup] Notification permission granted.');
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
          console.error("[FCM Setup] VAPID key is not defined. Push notifications will not work. Define NEXT_PUBLIC_FIREBASE_VAPID_KEY in your .env.local file.");
          alert("VAPID key is not configured. Notifications will not work.");
          return permission; 
        }

        console.log('[FCM Setup] Attempting to get FCM token...');
        const currentToken = await getToken(messaging, {
          vapidKey: vapidKey,
          serviceWorkerRegistration: swRegistration // Explicitly pass the registration
        });

        if (currentToken) {
          console.log('[FCM Setup] FCM Token obtained:', currentToken);
          // Log the token for easy testing
          console.log('FCM Token (for testing):', currentToken);
          alert('Notification token registered: ' + currentToken.substring(0, 10) + "...");

          const tokenRef = doc(db, 'users', userId, 'fcmTokens', currentToken);
          await setDoc(tokenRef, {
            token: currentToken,
            createdAt: serverTimestamp(),
            userAgent: navigator.userAgent,
          }, { merge: true });
          console.log('[FCM Setup] FCM token saved/updated in Firestore for user:', userId);
        } else {
          console.warn('[FCM Setup] No registration token available after permission grant. This usually indicates a problem with the service worker or VAPID key.');
          alert('Could not get notification token. Ensure permissions are granted and the service worker is active. Check console for details.');
        }
      } else {
        console.warn('[FCM Setup] Unable to get permission to notify. Status:', permission);
        alert('Notification permission was not granted. Status: ' + permission);
      }
      return permission;
    } catch (error) {
      console.error('[FCM Setup] An error occurred: ', error);
      alert('Error setting up notifications: ' + (error instanceof Error ? error.message : String(error)));
      if (error instanceof Error) {
        if (error.name === 'FirebaseError' && (error as any).code === 'messaging/failed-serviceworker-registration') {
          console.error("[FCM Setup] Failed to register service worker. Ensure 'firebase-messaging-sw.js' is in the public folder and correctly configured.");
        } else if (error.message.includes("no active Service Worker")) {
           console.error("[FCM Setup] getToken failed because there's no active Service Worker. Ensure HTTPS and SW is correctly registered and activated.");
        }
      }
    }
  } else {
    console.warn('[FCM Setup] Push notifications or service workers not supported/available in this browser window context.');
    alert('Push notifications or service workers not supported in this browser.');
  }
  return null;
};

export const onForegroundMessageListener = () =>
  new Promise((resolve) => {
    isSupported().then(supported => {
      if (supported && typeof window !== 'undefined') {
        const messaging = getMessaging(app);
        onMessage(messaging, (payload) => {
          console.log('[FCM Setup] Foreground message received. ', payload);
          resolve(payload);
        });
      } else {
        resolve(null); // Resolve with null if not supported or not in browser
      }
    });
  });
