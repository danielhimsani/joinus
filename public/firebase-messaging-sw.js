// Import and initialize the Firebase SDK
// These scripts are imported by the browser.
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAwpzWSRcpFbjazKym8MfpbCPyKavFrnpQ",
  authDomain: "join-us-p1u7f.firebaseapp.com",
  projectId: "join-us-p1u7f",
  storageBucket: "join-us-p1u7f.appspot.com",
  messagingSenderId: "901177101115",
  appId: "1:901177101115:web:199032597540089b1fc51e"
  // measurementId: "YOUR_MEASUREMENT_ID" // Optional
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  // Customize notification here
  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message.',
    icon: payload.notification?.icon || '/app_logo.png', // Default icon if not provided in payload
    data: payload.data // This allows passing data for click_action
  };

  // Optional: if you want to navigate to a specific URL when notification is clicked
  // self.addEventListener('notificationclick', function(event) {
  //   event.notification.close();
  //   const targetUrl = event.notification.data && event.notification.data.FCM_MSG && event.notification.data.FCM_MSG.notification && event.notification.data.FCM_MSG.notification.click_action
  //     ? event.notification.data.FCM_MSG.notification.click_action
  //     : event.notification.data && event.notification.data.click_action // Check top-level data if FCM_MSG is not present
  //     ? event.notification.data.click_action
  //     : '/'; // Default URL
  //
  //   event.waitUntil(
  //     clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
  //       // Check if there is already a window/tab open with the target URL
  //       for (var i = 0; i < windowClients.length; i++) {
  //         var client = windowClients[i];
  //         if (client.url === targetUrl && 'focus' in client) {
  //           return client.focus();
  //         }
  //       }
  //       // If not, open a new window/tab
  //       if (clients.openWindow) {
  //         return clients.openWindow(targetUrl);
  //       }
  //     })
  //   );
  // });


  return self.registration.showNotification(notificationTitle, notificationOptions);
});
