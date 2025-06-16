
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { app, db } from './firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export const requestNotificationPermissionAndSaveToken = async (userId: string): Promise<string | null> => {
  // Check if messaging is supported by the browser
  const messagingSupported = await isSupported();
  console.log('Firebase Messaging isSupported():', messagingSupported); // Log support status

  if (!messagingSupported) {
    console.log('Firebase Messaging is not supported in this browser.');
    alert('Firebase Messaging is not supported in this browser.'); // Alert for visibility
    return null;
  }

  if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
    try {
      const messaging = getMessaging(app);
      const permission = await Notification.requestPermission();
      console.log('Notification.requestPermission() status:', permission); // Log permission status

      if (permission === 'granted') {
        console.log('Notification permission granted.');
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
            console.error("VAPID key is not defined. Push notifications will not work. Define NEXT_PUBLIC_FIREBASE_VAPID_KEY in your .env.local file.");
            alert("VAPID key is not configured. Notifications will not work.");
            return permission;
        }

        const currentToken = await getToken(messaging, {
          vapidKey: vapidKey,
        });

        if (currentToken) {
          console.log('FCM Token (copy for testing):', currentToken); // Log the token
          const tokenRef = doc(db, 'users', userId, 'fcmTokens', currentToken);
          await setDoc(tokenRef, {
            token: currentToken,
            createdAt: serverTimestamp(),
            userAgent: navigator.userAgent,
          }, { merge: true });
          console.log('FCM token saved/updated in Firestore for user:', userId);
          alert('Notification token registered: ' + currentToken.substring(0,10) + "...");
        } else {
          console.log('No registration token available. Request permission to generate one.');
          alert('Could not get notification token. Ensure permissions are granted and try again.');
        }
      } else {
        console.log('Unable to get permission to notify.');
        alert('Notification permission was not granted.');
      }
      return permission;
    } catch (error) {
      console.error('An error occurred while retrieving token or requesting permission. ', error);
      alert('Error setting up notifications: ' + (error instanceof Error ? error.message : String(error)));
      if (error instanceof Error && error.name === 'FirebaseError' && (error as any).code === 'messaging/failed-serviceworker-registration') {
        console.error("Failed to register service worker. Ensure 'firebase-messaging-sw.js' is in the public folder and correctly configured.");
      }
    }
  } else {
    console.log('Push notifications or service workers not supported in this browser.');
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
          console.log('Foreground message received. ', payload);
          resolve(payload);
        });
      } else {
        resolve(null);
      }
    });
  });

