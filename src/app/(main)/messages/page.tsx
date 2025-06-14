
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; // Card for overall structure
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, MessageSquareText, Inbox, Briefcase, AlertCircle } from "lucide-react";
import { HEBREW_TEXT } from "@/constants/hebrew-text";
import type { EventChat, Event as EventType } from "@/types";
import { db, auth as firebaseAuthInstance } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { ChatListItem } from "@/components/chat/ChatListItem";
import { safeToDate } from '@/lib/dateUtils';


export default function MessagesPage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [ownedChats, setOwnedChats] = useState<EventChat[]>([]);
  const [requestedChats, setRequestedChats] = useState<EventChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("requested"); // Default to "My Requests"

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuthInstance, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const fetchChatsAndEvents = useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      // Fetch future owned events to determine default tab
      let hasFutureOwnedEvents = false;
      try {
        const futureEventsQuery = query(
          collection(db, "events"),
          where("ownerUids", "array-contains", currentUser.uid),
          where("dateTime", ">=", Timestamp.now())
        );
        const futureEventsSnapshot = await getDocs(futureEventsQuery);
        if (!futureEventsSnapshot.empty) {
          hasFutureOwnedEvents = true;
        }
      } catch (e) {
        console.error("Error fetching future owned events:", e);
        // Non-critical error for default tab, so we don't set main error state
      }
      
      setActiveTab(hasFutureOwnedEvents ? "owned" : "requested");

      // Fetch chats
      const chatsQuery = query(
        collection(db, "eventChats"),
        where("participants", "array-contains", currentUser.uid),
        orderBy("updatedAt", "desc")
      );
      const chatsSnapshot = await getDocs(chatsQuery);
      
      const fetchedOwnedChats: EventChat[] = [];
      const fetchedRequestedChats: EventChat[] = [];

      chatsSnapshot.forEach((doc) => {
        const chatData = doc.data() as Omit<EventChat, 'id' | 'createdAt' | 'updatedAt' | 'lastMessageTimestamp'> & { 
            createdAt: Timestamp, updatedAt: Timestamp, lastMessageTimestamp?: Timestamp 
        };
        
        const formattedChat: EventChat = {
          id: doc.id,
          ...chatData,
          createdAt: safeToDate(chatData.createdAt),
          updatedAt: safeToDate(chatData.updatedAt),
          lastMessageTimestamp: chatData.lastMessageTimestamp ? safeToDate(chatData.lastMessageTimestamp) : undefined,
        };

        if (formattedChat.ownerUids.includes(currentUser.uid)) {
          fetchedOwnedChats.push(formattedChat);
        } else if (formattedChat.guestUid === currentUser.uid) {
          fetchedRequestedChats.push(formattedChat);
        }
      });

      setOwnedChats(fetchedOwnedChats);
      setRequestedChats(fetchedRequestedChats);

    } catch (e: any) {
      console.error("Error fetching chats:", e);
      setError(HEBREW_TEXT.chat.errorFetchingChats + (e.message ? `: ${e.message}` : ''));
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchChatsAndEvents();
  }, [fetchChatsAndEvents]);

  const renderChatList = (chats: EventChat[], type: 'owned' | 'guest') => {
    if (chats.length === 0) {
      return (
        <div className="text-center py-10">
          <Inbox className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg">
            {type === 'owned' ? HEBREW_TEXT.chat.noChatsFoundOwner : HEBREW_TEXT.chat.noChatsFoundGuest}
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {chats.map((chat) => (
          <ChatListItem key={chat.id} chat={chat} currentUserId={currentUser!.uid} />
        ))}
      </div>
    );
  };
  
  const renderSkeletons = () => (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/4 mt-1 self-end" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  if (isLoading && !currentUser) { // Still waiting for auth
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-8 md:py-12">
      <Card className="max-w-3xl mx-auto shadow-lg">
        <CardHeader className="text-center md:text-right border-b">
          <div className="flex flex-col md:flex-row items-center justify-center md:justify-between">
            <div className="flex items-center mb-2 md:mb-0">
              <MessageSquareText className="h-7 w-7 md:h-8 md:w-8 text-primary ml-2" />
              <CardTitle className="font-headline text-2xl md:text-3xl">{HEBREW_TEXT.chat.messagesPageTitle}</CardTitle>
            </div>
            {/* Potentially add a global search or filter for chats here later */}
          </div>
        </CardHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full p-2 sm:p-4 md:p-6">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="owned" className="py-2.5 text-sm sm:text-base font-body">
              <Briefcase className="ml-1.5 h-4 w-4 sm:h-5 sm:w-5" />
              {HEBREW_TEXT.chat.eventsInMyOwnership}
            </TabsTrigger>
            <TabsTrigger value="requested" className="py-2.5 text-sm sm:text-base font-body">
              <Inbox className="ml-1.5 h-4 w-4 sm:h-5 sm:w-5" />
              {HEBREW_TEXT.chat.myRequests}
            </TabsTrigger>
          </TabsList>
          
          {error && (
            <Alert variant="destructive" className="my-4">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle>{HEBREW_TEXT.general.error}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <TabsContent value="owned">
            {isLoading ? renderSkeletons() : renderChatList(ownedChats, 'owned')}
          </TabsContent>
          <TabsContent value="requested">
            {isLoading ? renderSkeletons() : renderChatList(requestedChats, 'guest')}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
