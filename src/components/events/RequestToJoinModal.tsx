
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import type { Event } from '@/types';
import type { User as FirebaseUser } from "firebase/auth";
import { db, auth } from '@/lib/firebase'; // Assuming auth is firebaseAuthInstance
import { doc, setDoc, getDoc, Timestamp, collection, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface RequestToJoinModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  event: Event;
  currentUser: FirebaseUser;
}

export function RequestToJoinModal({ isOpen, onOpenChange, event, currentUser }: RequestToJoinModalProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmitRequest = async () => {
    if (!message.trim()) {
      toast({
        title: HEBREW_TEXT.general.error,
        description: HEBREW_TEXT.chat.messageRequired,
        variant: "destructive",
      });
      return;
    }
    if (!currentUser || !event || !event.id || !event.ownerUids || event.ownerUids.length === 0) {
      toast({ title: HEBREW_TEXT.general.error, description: "נתוני משתמש או אירוע חסרים.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    const chatId = `${event.id}_${currentUser.uid}`;
    const chatDocRef = doc(db, "eventChats", chatId);

    try {
      const chatDocSnap = await getDoc(chatDocRef);

      if (chatDocSnap.exists()) {
        // Chat already exists, navigate to it
        toast({ title: HEBREW_TEXT.chat.chatAlreadyExists, duration: 3000 });
        router.push(`/chat/${chatId}`);
        onOpenChange(false); // Close modal
        return;
      }

      // Chat doesn't exist, create it and the first message
      const guestName = currentUser.displayName || currentUser.email || "אורח";
      const guestProfileImageUrl = currentUser.photoURL || `https://placehold.co/100x100.png?text=${guestName.charAt(0)}`;

      const batch = writeBatch(db);

      const newChatData = {
        eventId: event.id,
        guestUid: currentUser.uid,
        ownerUids: event.ownerUids,
        participants: [currentUser.uid, ...event.ownerUids],
        status: 'pending_request' as const,
        lastMessageText: message,
        lastMessageTimestamp: serverTimestamp(),
        lastMessageSenderId: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        eventInfo: {
          name: event.name,
          imageUrl: event.imageUrl || "",
        },
        guestInfo: {
          name: guestName,
          profileImageUrl: guestProfileImageUrl,
        },
        unreadCount: event.ownerUids.reduce((acc, ownerUid) => {
          acc[ownerUid] = 1; // Initial unread message for each owner
          return acc;
        }, {} as { [key: string]: number }),
      };
      batch.set(chatDocRef, newChatData);

      const firstMessageRef = doc(collection(db, "eventChats", chatId, "messages"));
      const firstMessageData = {
        chatId: chatId,
        senderId: currentUser.uid,
        text: message,
        timestamp: serverTimestamp(),
        senderInfo: {
          name: guestName,
          profileImageUrl: guestProfileImageUrl,
        },
      };
      batch.set(firstMessageRef, firstMessageData);

      await batch.commit();

      toast({ title: HEBREW_TEXT.general.success, description: HEBREW_TEXT.chat.chatCreatedSuccessfully, duration: 3000 });
      router.push(`/chat/${chatId}`);
      onOpenChange(false); // Close modal
      setMessage(""); // Clear message for next time

    } catch (error) {
      console.error("Error creating chat or sending first message:", error);
      toast({
        title: HEBREW_TEXT.general.error,
        description: HEBREW_TEXT.chat.errorCreatingChat + (error instanceof Error ? `: ${error.message}` : ''),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) setMessage(""); // Clear message if modal is closed
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl">{HEBREW_TEXT.chat.requestToJoinEventTitle}</DialogTitle>
          <DialogDescription>
            {HEBREW_TEXT.event.eventName}: {event.name}
            <br />
            {HEBREW_TEXT.chat.introduceYourselfPlaceholder}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="initial-message" className="text-right">
              {HEBREW_TEXT.chat.messageToOwners}
            </Label>
            <Textarea
              id="initial-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="שלום, אני [שמך], אשמח להצטרף לאירוע שלכם..."
              rows={4}
              className="resize-none"
              disabled={isSubmitting}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {HEBREW_TEXT.general.cancel}
          </Button>
          <Button onClick={handleSubmitRequest} disabled={isSubmitting || !message.trim()}>
            {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            {HEBREW_TEXT.chat.sendRequest}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    