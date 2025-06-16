
// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

console.log('[Firebase FSW] Service Worker script loading.');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId
// These credentials are PUBLIC and safe to be in client-side code.
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


// Retrieve an instance of Firebase Messaging so that it can handle background messages.
let messaging;
try {
  if (firebase.messaging.isSupported()) {
    messaging = firebase.messaging();
    console.log('[Firebase FSW] Firebase Messaging instance retrieved.');

    messaging.onBackgroundMessage((payload) => {
      console.log('[Firebase FSW] Received background message ', payload);

      // Customize notification here
      const notificationTitle = payload.notification?.title || 'New Message';
      const notificationOptions = {
        body: payload.notification?.body || 'You have a new message.',
        icon: payload.notification?.icon || '/app_logo_192.png', // Default icon
        data: payload.data // Pass along data for click actions
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  } else {
    console.log('[Firebase FSW] Firebase Messaging is not supported in this SW environment.');
  }
} catch (e) {
  console.error('[Firebase FSW] Error getting Firebase Messaging instance or setting background handler:', e);
}

self.addEventListener('install', (event) => {
  console.log('[Firebase FSW] Service Worker installed.');
  // event.waitUntil(self.skipWaiting()); // Optional: forces the waiting service worker to become the active service worker.
});

self.addEventListener('activate', (event) => {
  console.log('[Firebase FSW] Service Worker activated.');
  // event.waitUntil(self.clients.claim()); // Optional: ensures that updates to the service worker take effect immediately.
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Firebase FSW] Notification click Received.', event.notification);
  event.notification.close();

  const chatPath = event.notification.data?.chatId ? `/chat/${event.notification.data.chatId}` : '/messages';
  
  // This looks to see if the current is already open and focuses it.
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        // Attempt to parse the client URL to check the pathname
        let clientPathName;
        try {
            const url = new URL(client.url);
            clientPathName = url.pathname;
        } catch (e) {
            console.warn("[Firebase FSW] Could not parse client URL:", client.url, e);
            // If parsing fails, we can't reliably check if it's the target path.
            // We might fall back to opening a new window or focusing the first available client.
            // For simplicity here, we'll just proceed to potentially open a new window.
        }

        // Check if client is already on the target path (or a more general path like '/messages')
        // and if it can be focused.
        if (clientPathName === chatPath && 'focus' in client) {
          return client.focus();
        }
        // Fallback: if a client for the app's origin exists and can be focused,
        // but isn't on the exact chatPath, we could navigate it.
        // Or, more simply, just focus it if it's part of our app.
        // This example will focus any open client of our app.
        const appOrigin = self.location.origin;
        if (client.url.startsWith(appOrigin) && 'focus' in client) {
             // If we focus a client not on chatPath, it won't navigate there by default.
             // Navigation would require client.navigate(appOrigin + chatPath)
             // and then client.focus(). For simplicity now, just focus.
             // The user might need to navigate manually if a different page of the app is focused.
            return client.focus(); // Or client.navigate(appOrigin + chatPath).then(() => client.focus());
        }
      }
      // If no existing window is found or focused, open a new one.
      if (clients.openWindow) {
        return clients.openWindow(chatPath);
      }
    })
  );
});

// This is a basic service worker.
// Ensure your firebaseConfig is correctly set up above.
