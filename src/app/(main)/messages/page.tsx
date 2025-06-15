
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, MessageSquareText, Inbox, Briefcase, AlertCircle, Filter as FilterIcon, CheckCircle, XCircle, AlertTriangle, Radio, CircleSlash } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { HEBREW_TEXT } from "@/constants/hebrew-text";
import type { EventChat, Event as EventType } from "@/types";
import { db, auth as firebaseAuthInstance } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { ChatListItem } from "@/components/chat/ChatListItem";
import { safeToDate } from '@/lib/dateUtils';


type ChatStatusFilter = 'all' | EventChat['status'];

const statusFilterOptions: { value: ChatStatusFilter; label: string; icon?: React.ElementType }[] = [
    { value: 'all', label: HEBREW_TEXT.chat.allStatuses },
    { value: 'pending_request', label: HEBREW_TEXT.chat.pendingRequests, icon: AlertTriangle },
    { value: 'request_approved', label: HEBREW_TEXT.chat.approvedRequests, icon: CheckCircle },
    { value: 'active', label: HEBREW_TEXT.chat.activeChats, icon: Radio },
    { value: 'request_rejected', label: HEBREW_TEXT.chat.rejectedRequests, icon: XCircle },
    { value: 'closed', label: HEBREW_TEXT.chat.closedChats, icon: CircleSlash },
];


export default function MessagesPage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [allFetchedChats, setAllFetchedChats] = useState<EventChat[]>([]);
  const [eventDetailsMap, setEventDetailsMap] = useState<Map<string, { dateTime: Date }>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("requested");
  
  // Filter states
  const [chatTimeFilter, setChatTimeFilter] = useState<'all' | 'future' | 'past'>('future');
  const [chatStatusFilter, setChatStatusFilter] = useState<ChatStatusFilter>('all');
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuthInstance, (user) => {
      setCurrentUser(user);
      if (!user) {
        setIsLoading(false); 
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchChatsAndEvents = useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      setAllFetchedChats([]);
      setEventDetailsMap(new Map());
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const chatsQuery = query(
        collection(db, "eventChats"),
        where("participants", "array-contains", currentUser.uid),
        orderBy("updatedAt", "desc")
      );
      const chatsSnapshot = await getDocs(chatsQuery);
      
      const fetchedChatsForUser: EventChat[] = [];
      chatsSnapshot.forEach((doc) => {
        const chatData = doc.data() as Omit<EventChat, 'id' | 'createdAt' | 'updatedAt' | 'lastMessageTimestamp'> & { 
            createdAt: Timestamp, updatedAt: Timestamp, lastMessageTimestamp?: Timestamp 
        };
        fetchedChatsForUser.push({
          id: doc.id,
          ...chatData,
          createdAt: safeToDate(chatData.createdAt),
          updatedAt: safeToDate(chatData.updatedAt),
          lastMessageTimestamp: chatData.lastMessageTimestamp ? safeToDate(chatData.lastMessageTimestamp) : undefined,
        });
      });
      setAllFetchedChats(fetchedChatsForUser);

      const eventIds = [...new Set(fetchedChatsForUser.map(chat => chat.eventId))];
      const tempEventDetailsMap = new Map<string, { dateTime: Date }>();

      if (eventIds.length > 0) {
        const MAX_IDS_PER_QUERY = 30;
        for (let i = 0; i < eventIds.length; i += MAX_IDS_PER_QUERY) {
            const chunkEventIds = eventIds.slice(i, i + MAX_IDS_PER_QUERY);
            if (chunkEventIds.length > 0) {
                const eventsQuery = query(collection(db, "events"), where("__name__", "in", chunkEventIds));
                const eventsSnapshot = await getDocs(eventsQuery);
                eventsSnapshot.forEach(eventDoc => {
                    const eventData = eventDoc.data();
                    if (eventData.dateTime) {
                         tempEventDetailsMap.set(eventDoc.id, { dateTime: safeToDate(eventData.dateTime) });
                    }
                });
            }
        }
      }
      setEventDetailsMap(tempEventDetailsMap);
      
      let hasFutureOwnedChats = false;
      for (const chat of fetchedChatsForUser) {
          if (chat.ownerUids.includes(currentUser.uid)) {
              const eventDate = tempEventDetailsMap.get(chat.eventId)?.dateTime;
              if (eventDate && eventDate >= new Date()) {
                  hasFutureOwnedChats = true;
                  break;
              }
          }
      }
      setActiveTab(hasFutureOwnedChats ? "owned" : "requested");

    } catch (e: any) {
      console.error("Error fetching chats or events:", e);
      setError(HEBREW_TEXT.chat.errorFetchingChats + (e.message ? `: ${e.message}` : ''));
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchChatsAndEvents();
  }, [fetchChatsAndEvents]);

  const { displayOwnedChats, displayRequestedChats } = useMemo(() => {
    if (!currentUser) return { displayOwnedChats: [], displayRequestedChats: [] };

    const now = new Date();
    let filteredChats = allFetchedChats;

    // Filter by time
    if (chatTimeFilter !== 'all') {
        filteredChats = filteredChats.filter(chat => {
            const eventDateTime = eventDetailsMap.get(chat.eventId)?.dateTime;
            if (!eventDateTime) return chatTimeFilter === 'all'; // Include if filter is 'all' and no date
            if (chatTimeFilter === 'future') return eventDateTime >= now;
            if (chatTimeFilter === 'past') return eventDateTime < now;
            return true;
        });
    }

    // Filter by status
    if (chatStatusFilter !== 'all') {
        filteredChats = filteredChats.filter(chat => chat.status === chatStatusFilter);
    }
    
    const owned: EventChat[] = [];
    const requested: EventChat[] = [];

    filteredChats.forEach(chat => {
      if (chat.ownerUids.includes(currentUser.uid)) {
        owned.push(chat);
      } else if (chat.guestUid === currentUser.uid) {
        requested.push(chat);
      }
    });
    return { displayOwnedChats: owned, displayRequestedChats: requested };
  }, [allFetchedChats, eventDetailsMap, chatTimeFilter, chatStatusFilter, currentUser]);


  const renderChatList = (chats: EventChat[], type: 'owned' | 'guest') => {
    if (chats.length === 0) {
      let noChatsMessage = HEBREW_TEXT.chat.noChatsFound; 
        if (type === 'owned') {
            noChatsMessage = HEBREW_TEXT.chat.noChatsFoundOwner;
        } else { 
            noChatsMessage = HEBREW_TEXT.chat.noChatsFoundGuest;
        }
      return (
        <div className="text-center py-10">
          <Inbox className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg">{noChatsMessage}</p>
          <p className="text-sm text-muted-foreground/80 mt-1">נסה לשנות את אפשרויות הסינון.</p>
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

  const handleClearFilters = () => {
    setChatTimeFilter('future');
    setChatStatusFilter('all');
  };

  if (isLoading && !currentUser && !allFetchedChats.length) { 
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
            <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="mt-2 md:mt-0">
                  <FilterIcon className="ml-2 h-4 w-4" />
                  סינון שיחות
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="font-headline text-xl">סינון שיחות</DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div>
                        <Label htmlFor="chat-time-filter" className="mb-2 block text-sm font-medium text-muted-foreground">
                            {HEBREW_TEXT.chat.chatTimeFilter}
                        </Label>
                        <Select 
                            value={chatTimeFilter} 
                            onValueChange={(value) => setChatTimeFilter(value as 'all' | 'future' | 'past')}
                            disabled={isLoading}
                        >
                            <SelectTrigger id="chat-time-filter" className="w-full">
                                <SelectValue placeholder={HEBREW_TEXT.chat.chatTimeFilter} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="future">{HEBREW_TEXT.chat.futureEventChats}</SelectItem>
                                <SelectItem value="past">{HEBREW_TEXT.chat.pastEventChats}</SelectItem>
                                <SelectItem value="all">{HEBREW_TEXT.chat.allChats}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="chat-status-filter" className="mb-2 block text-sm font-medium text-muted-foreground">
                            {HEBREW_TEXT.chat.chatStatusFilter}
                        </Label>
                        <Select
                            value={chatStatusFilter}
                            onValueChange={(value) => setChatStatusFilter(value as ChatStatusFilter)}
                            disabled={isLoading}
                        >
                            <SelectTrigger id="chat-status-filter" className="w-full">
                                <SelectValue placeholder={HEBREW_TEXT.chat.chatStatusFilter} />
                            </SelectTrigger>
                            <SelectContent>
                                {statusFilterOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                        <div className="flex items-center">
                                            {option.icon && <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />}
                                            {option.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter className="sm:justify-between">
                    <Button type="button" variant="ghost" onClick={handleClearFilters}>
                        {HEBREW_TEXT.general.clearFilters}
                    </Button>
                    <DialogClose asChild>
                        <Button type="button" variant="default">
                            {HEBREW_TEXT.general.close}
                        </Button>
                    </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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

          {isLoading ? (
            renderSkeletons()
          ) : (
            <>
              <TabsContent value="owned">
                {renderChatList(displayOwnedChats, 'owned')}
              </TabsContent>
              <TabsContent value="requested">
                {renderChatList(displayRequestedChats, 'guest')}
              </TabsContent>
            </>
          )}
        </Tabs>
      </Card>
    </div>
  );
}

