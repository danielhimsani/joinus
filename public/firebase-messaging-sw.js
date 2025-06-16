
// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

console.log('[Firebase FSW] Service Worker script loading...');

// Ensure this config matches your main app's Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAwpzWSRcpFbjazKym8MfpbCPyKavFrnpQ",
  authDomain: "join-us-p1u7f.firebaseapp.com",
  projectId: "join-us-p1u7f",
  storageBucket: "join-us-p1u7f.appspot.com",
  messagingSenderId: "901177101115",
  appId: "1:901177101115:web:199032597540089b1fc51e"
};

try {
  firebase.initializeApp(firebaseConfig);
  console.log('[Firebase FSW] Firebase app initialized in Service Worker.');
} catch (e) {
  console.error('[Firebase FSW] Error initializing Firebase app in Service Worker:', e);
}

let messaging;
try {
  if (firebase.messaging.isSupported()) {
    messaging = firebase.messaging();
    console.log('[Firebase FSW] Firebase Messaging initialized in Service Worker.');

    // Optional: Set a background message handler
    messaging.onBackgroundMessage((payload) => {
      console.log('[Firebase FSW] Received background message: ', payload);
      // Customize notification here
      const notificationTitle = payload.notification?.title || 'New Message';
      const notificationOptions = {
        body: payload.notification?.body || 'You have a new message.',
        icon: payload.notification?.icon || '/app_logo_192.png', // Ensure you have an icon here
        data: payload.data // Pass along data for click actions
      };
      // Important: Check for self.registration before trying to show notification
      if (self.registration) {
        return self.registration.showNotification(notificationTitle, notificationOptions);
      } else {
        console.warn('[Firebase FSW] self.registration is not available. Cannot show notification.');
        return Promise.resolve();
      }
    });
  } else {
    console.log('[Firebase FSW] Firebase Messaging is not supported in this Service Worker environment.');
  }
} catch (e) {
  console.error('[Firebase FSW] Error initializing Firebase Messaging in Service Worker:', e);
}

self.addEventListener('install', (event) => {
  console.log('[Firebase FSW] Service Worker installing.');
  // Optionally, skip waiting to activate the new service worker immediately.
  // event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('[Firebase FSW] Service Worker activating.');
  // Optionally, claim clients to take control of existing pages immediately.
  // event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('[Firebase FSW] Push event received:', event);
  // This is another place where you could handle push events if onBackgroundMessage doesn't cover all cases,
  // but typically onBackgroundMessage is sufficient for FCM.
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Firebase FSW] Notification click Received.', event.notification);
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/'; // Use data.url if present, otherwise fallback

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        // If a window for the app is already open and matches the target, focus it.
        // You might need more sophisticated URL matching if targetUrl can vary significantly.
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open or matches, open a new one.
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
