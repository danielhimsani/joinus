
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle as ShadAlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, MessageSquareText, Inbox, Briefcase, AlertCircle, Filter, ListFilter, CheckCircle, XCircle, AlertTriangle, Radio, CircleSlash, Search, ChevronLeft, ChevronRight } from "lucide-react"; // Added ListFilter & Search, ChevronLeft, ChevronRight
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Added Input
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle as ShadDialogTitle,
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
import { cn } from "@/lib/utils";


type ChatStatusFilter = 'all' | EventChat['status'];
type ChatTimeFilter = 'all' | 'future' | 'past';

const statusFilterOptions: { value: ChatStatusFilter; label: string; icon?: React.ElementType }[] = [
    { value: 'all', label: HEBREW_TEXT.chat.allStatuses },
    { value: 'pending_request', label: HEBREW_TEXT.chat.pendingRequests, icon: AlertTriangle },
    { value: 'request_approved', label: HEBREW_TEXT.chat.approvedRequests, icon: CheckCircle },
    { value: 'active', label: HEBREW_TEXT.chat.activeChats, icon: Radio },
    { value: 'request_rejected', label: HEBREW_TEXT.chat.rejectedRequests, icon: XCircle },
    { value: 'closed', label: HEBREW_TEXT.chat.closedChats, icon: CircleSlash },
];

const defaultChatTimeFilter: ChatTimeFilter = 'future';
const defaultChatStatusFilter: ChatStatusFilter = 'all';
const defaultSimpleSearchQuery: string = "";
const CHATS_PER_PAGE = 10;

const countActiveMessageFilters = (
  timeFilter: ChatTimeFilter,
  statusFilter: ChatStatusFilter
): number => {
  let count = 0;
  if (timeFilter !== defaultChatTimeFilter) count++;
  if (statusFilter !== defaultChatStatusFilter) count++;
  return count;
};


export default function MessagesPage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [allFetchedChats, setAllFetchedChats] = useState<EventChat[]>([]);
  const [eventDetailsMap, setEventDetailsMap] = useState<Map<string, { dateTime: Date }>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("requested");
  
  const [simpleSearchQuery, setSimpleSearchQuery] = useState(defaultSimpleSearchQuery);
  const [chatTimeFilter, setChatTimeFilter] = useState<ChatTimeFilter>(defaultChatTimeFilter);
  const [chatStatusFilter, setChatStatusFilter] = useState<ChatStatusFilter>(defaultChatStatusFilter);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  
  // New state for dialog filters
  const [tempTimeFilter, setTempTimeFilter] = useState<ChatTimeFilter>(defaultChatTimeFilter);
  const [tempStatusFilter, setTempStatusFilter] = useState<ChatStatusFilter>(defaultChatStatusFilter);


  const [currentPageOwned, setCurrentPageOwned] = useState(1);
  const [currentPageRequested, setCurrentPageRequested] = useState(1);


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
  
  // Sync temp filters when dialog opens
  useEffect(() => {
    if (isFilterDialogOpen) {
      setTempTimeFilter(chatTimeFilter);
      setTempStatusFilter(chatStatusFilter);
    }
  }, [isFilterDialogOpen, chatTimeFilter, chatStatusFilter]);


  useEffect(() => {
    setCurrentPageOwned(1);
    setCurrentPageRequested(1);
  }, [simpleSearchQuery, chatTimeFilter, chatStatusFilter]);


  const { 
    paginatedOwnedChats, 
    totalPagesOwned,
    paginatedRequestedChats,
    totalPagesRequested,
    ownedUnreadCount, 
    requestedUnreadCount 
  } = useMemo(() => {
    if (!currentUser) return { 
        paginatedOwnedChats: [], totalPagesOwned: 0, 
        paginatedRequestedChats: [], totalPagesRequested: 0, 
        ownedUnreadCount: 0, requestedUnreadCount: 0 
    };

    const now = new Date();
    let filteredChats = [...allFetchedChats]; 

    if (simpleSearchQuery.trim()) {
      const queryText = simpleSearchQuery.toLowerCase().trim();
      filteredChats = filteredChats.filter(chat =>
        (chat.eventInfo?.name?.toLowerCase() || '').includes(queryText) ||
        (chat.guestInfo?.name?.toLowerCase() || '').includes(queryText) ||
        (chat.lastMessageText?.toLowerCase() || '').includes(queryText) 
      );
    }

    if (chatTimeFilter !== 'all') {
        filteredChats = filteredChats.filter(chat => {
            const eventDateTime = eventDetailsMap.get(chat.eventId)?.dateTime;
            if (!eventDateTime) return chatTimeFilter === 'all'; 
            if (chatTimeFilter === 'future') return eventDateTime >= now;
            if (chatTimeFilter === 'past') return eventDateTime < now;
            return true;
        });
    }

    if (chatStatusFilter !== 'all') {
        filteredChats = filteredChats.filter(chat => chat.status === chatStatusFilter);
    }
    
    const owned: EventChat[] = [];
    const requested: EventChat[] = [];
    let tempOwnedUnread = 0;
    let tempRequestedUnread = 0;

    filteredChats.forEach(chat => {
      const unreadForThisChat = chat.unreadCount?.[currentUser.uid] || 0;
      if (chat.ownerUids.includes(currentUser.uid)) {
        owned.push(chat);
        if (unreadForThisChat > 0) tempOwnedUnread += unreadForThisChat;
      } else if (chat.guestUid === currentUser.uid) {
        requested.push(chat);
        if (unreadForThisChat > 0) tempRequestedUnread += unreadForThisChat;
      }
    });

    const calcTotalPagesOwned = Math.ceil(owned.length / CHATS_PER_PAGE);
    const calcTotalPagesRequested = Math.ceil(requested.length / CHATS_PER_PAGE);
    
    const finalCurrentPageOwned = (currentPageOwned > calcTotalPagesOwned && calcTotalPagesOwned > 0) ? calcTotalPagesOwned : currentPageOwned;
    const finalCurrentPageRequested = (currentPageRequested > calcTotalPagesRequested && calcTotalPagesRequested > 0) ? calcTotalPagesRequested : currentPageRequested;


    const startIndexOwned = (finalCurrentPageOwned - 1) * CHATS_PER_PAGE;
    const paginatedOwned = owned.slice(startIndexOwned, startIndexOwned + CHATS_PER_PAGE);

    const startIndexRequested = (finalCurrentPageRequested - 1) * CHATS_PER_PAGE;
    const paginatedRequested = requested.slice(startIndexRequested, startIndexRequested + CHATS_PER_PAGE);

    return { 
        paginatedOwnedChats: paginatedOwned, 
        totalPagesOwned: calcTotalPagesOwned,
        paginatedRequestedChats: paginatedRequested,
        totalPagesRequested: calcTotalPagesRequested,
        ownedUnreadCount: tempOwnedUnread,
        requestedUnreadCount: tempRequestedUnread
    };
  }, [allFetchedChats, eventDetailsMap, chatTimeFilter, chatStatusFilter, simpleSearchQuery, currentUser, currentPageOwned, currentPageRequested]);


  const renderChatList = (chats: EventChat[], type: 'owned' | 'guest', currentPage: number, totalPages: number, onPageChange: (page: number) => void) => {
    if (chats.length === 0) {
      let noChatsMessage = HEBREW_TEXT.chat.noChatsFound; 
      if (simpleSearchQuery.trim() || chatTimeFilter !== defaultChatTimeFilter || chatStatusFilter !== defaultChatStatusFilter) {
        noChatsMessage = HEBREW_TEXT.chat.noChatsFound;
      } else if (type === 'owned') {
        noChatsMessage = HEBREW_TEXT.chat.noChatsFoundOwner;
      } else { 
        noChatsMessage = HEBREW_TEXT.chat.noChatsFoundGuest;
      }
      return (
        <div className="text-center py-10">
          <Inbox className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg">{noChatsMessage}</p>
          <p className="text-sm text-muted-foreground/80 mt-1">נסה לשנות את אפשרויות החיפוש והסינון.</p>
        </div>
      );
    }
    return (
      <>
        <div className="space-y-3">
          {chats.map((chat) => (
            <ChatListItem key={chat.id} chat={chat} currentUserId={currentUser!.uid} />
          ))}
        </div>
        {totalPages > 1 && (
            <div className="mt-6 flex justify-center items-center space-x-2 rtl:space-x-reverse">
                <Button
                    variant="outline"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                >
                    <ChevronRight className="h-4 w-4" />
                    {HEBREW_TEXT.general.previous}
                </Button>
                <span className="text-sm text-muted-foreground">
                    עמוד {currentPage} מתוך {totalPages}
                </span>
                <Button
                    variant="outline"
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                >
                    {HEBREW_TEXT.general.next}
                    <ChevronLeft className="h-4 w-4" />
                </Button>
            </div>
        )}
      </>
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

  const handleApplyFilters = () => {
    setChatTimeFilter(tempTimeFilter);
    setChatStatusFilter(tempStatusFilter);
    setIsFilterDialogOpen(false);
  };

  const handleClearFiltersInDialog = () => {
    setTempTimeFilter(defaultChatTimeFilter);
    setTempStatusFilter(defaultChatStatusFilter);
  };

  if (isLoading && !currentUser && !allFetchedChats.length) { 
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const activeFilterCount = countActiveMessageFilters(chatTimeFilter, chatStatusFilter);
  const filtersApplied = activeFilterCount > 0;
  const FilterButtonIcon = filtersApplied ? ListFilter : Filter;


  return (
    <div className="container mx-auto px-2 sm:px-4 py-8 md:py-12">
      <Card className="max-w-3xl mx-auto shadow-lg">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full p-2 sm:p-4 md:p-6">
          <TabsList className="grid w-full grid-cols-2 mb-4 h-12">
            <TabsTrigger value="owned" className="py-2.5 text-sm sm:text-base font-body flex items-center justify-center">
              {HEBREW_TEXT.chat.eventsInMyOwnership}
              {ownedUnreadCount > 0 && (
                <span className="text-xs bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center ml-1.5 rtl:mr-1.5">
                  {ownedUnreadCount}
                </span>
              )}
              <Briefcase className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </TabsTrigger>
            <TabsTrigger value="requested" className="py-2.5 text-sm sm:text-base font-body flex items-center justify-center">
              {HEBREW_TEXT.chat.myRequests}
              {requestedUnreadCount > 0 && (
                <span className="text-xs bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center ml-1.5 rtl:mr-1.5">
                  {requestedUnreadCount}
                </span>
              )}
              <Inbox className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none rtl:right-3 rtl:left-auto" />
                <Input
                    type="search"
                    placeholder={HEBREW_TEXT.general.search}
                    className="w-full pl-10 pr-3 h-9 rtl:pr-10 rtl:pl-3"
                    value={simpleSearchQuery}
                    onChange={(e) => setSimpleSearchQuery(e.target.value)}
                    disabled={isLoading}
                    dir="rtl"
                />
            </div>
            <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
              <DialogTrigger asChild>
                <Button variant={filtersApplied ? "secondary" : "outline"} size="icon" className="h-9 w-9 flex-shrink-0 relative" aria-label={HEBREW_TEXT.event.filters}>
                  <FilterButtonIcon className="h-4 w-4" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-1 ring-background" />
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <ShadDialogTitle className="font-headline text-xl">סינון בקשות</ShadDialogTitle>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div>
                        <Label htmlFor="chat-time-filter" className="mb-2 block text-sm font-medium text-muted-foreground">
                            {HEBREW_TEXT.chat.chatTimeFilter}
                        </Label>
                        <Select 
                            value={tempTimeFilter} 
                            onValueChange={(value) => setTempTimeFilter(value as ChatTimeFilter)}
                            disabled={isLoading}
                            dir="rtl"
                        >
                            <SelectTrigger id="chat-time-filter" className="w-full" dir="rtl">
                                <SelectValue placeholder={HEBREW_TEXT.chat.chatTimeFilter} />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
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
                            value={tempStatusFilter}
                            onValueChange={(value) => setTempStatusFilter(value as ChatStatusFilter)}
                            disabled={isLoading}
                            dir="rtl"
                        >
                            <SelectTrigger id="chat-status-filter" className="w-full" dir="rtl">
                                <SelectValue placeholder={HEBREW_TEXT.chat.chatStatusFilter} />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                                {statusFilterOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                        <div className="flex items-center">
                                            {option.icon && <option.icon className="mr-2 h-4 w-4 text-muted-foreground rtl:ml-2 rtl:mr-0" />}
                                            {option.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter className="sm:justify-between pt-4 border-t">
                    <Button type="button" variant="ghost" onClick={handleClearFiltersInDialog} disabled={isLoading}>
                        {HEBREW_TEXT.general.clearFilters}
                    </Button>
                    <Button type="button" variant="default" disabled={isLoading} onClick={handleApplyFilters}>
                        {HEBREW_TEXT.event.applyFilters}
                    </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {error && (
            <Alert variant="destructive" className="my-4">
              <AlertCircle className="h-5 w-5" />
              <ShadAlertTitle>{HEBREW_TEXT.general.error}</ShadAlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            renderSkeletons()
          ) : (
            <>
              <TabsContent value="owned">
                {renderChatList(paginatedOwnedChats, 'owned', currentPageOwned, totalPagesOwned, setCurrentPageOwned)}
              </TabsContent>
              <TabsContent value="requested">
                {renderChatList(paginatedRequestedChats, 'guest', currentPageRequested, totalPagesRequested, setCurrentPageRequested)}
              </TabsContent>
            </>
          )}
        </Tabs>
      </Card>
    </div>
  );
}
