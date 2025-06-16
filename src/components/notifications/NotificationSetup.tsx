
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
    const unsubscribeAuth = firebaseAuthInstance.onAuthStateChanged(async (user: FirebaseUser | null) => {
      if (user) {
        console.log("User authenticated, attempting to set up notifications for:", user.uid);
        await requestNotificationPermissionAndSaveToken(user.uid);
      }
    });

    onForegroundMessageListener().then(messagePayload => { // Renamed to avoid confusion with outer 'payload' if any
      if (messagePayload && typeof messagePayload === 'object' && messagePayload !== null) {
        // The structure of the payload can vary slightly depending on how it's sent.
        // Common structures include `notification` and `data` properties directly on the payload.
        const notification = (messagePayload as any).notification;
        const data = (messagePayload as any).data;

        console.log('Foreground message received:', messagePayload);
        
        let title = HEBREW_TEXT.notifications.newMessage;
        let body = "You have a new message."; // Default body

        if (notification) {
          title = notification.title || title;
          body = notification.body || body;
        } else if (data) {
          // If no 'notification' part, try to get from 'data'
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
    }).catch(err => console.error("Error setting up foreground message listener:", err));

    return () => {
      unsubscribeAuth();
    };
  }, [toast, router]);

  return null;
}
