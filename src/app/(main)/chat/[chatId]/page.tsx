
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, updateDoc, serverTimestamp, writeBatch, Timestamp, where, increment, getDocs } from 'firebase/firestore';
import { db, auth as firebaseAuthInstance } from '@/lib/firebase';
import type { EventChat, EventChatMessage, EventAnnouncement } from '@/types';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { useToast } from '@/hooks/use-toast';
import { safeToDate } from '@/lib/dateUtils';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle as ShadAlertDialogTitle, 
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Send, UserX, CheckCircle, XCircle, Info, ShieldAlert, MessageSquareDashed, ChevronLeft, Ban, Contact as UserPlaceholderIcon, MoreVertical, EllipsisVertical } from 'lucide-react';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { AnnouncementBubble } from '@/components/chat/AnnouncementBubble';
import Link from 'next/link';

type ChatItem = (EventChatMessage & { itemType: 'message' }) | (EventAnnouncement & { itemType: 'announcement' });


export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const chatId = params.chatId as string;
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);


  const [chatDetails, setChatDetails] = useState<EventChat | null>(null);
  const [messages, setMessages] = useState<EventChatMessage[]>([]);
  const [announcements, setAnnouncements] = useState<EventAnnouncement[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoadingChat, setIsLoadingChat] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(firebaseAuthInstance, (user) => {
      setCurrentUser(user);
      if (!user) {
        router.push('/signin');
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  const handleUpdateUnreadCount = useCallback(async (currentChatDoc: EventChat) => {
    if (chatId && currentUser && currentChatDoc) {
      const chatDocRef = doc(db, "eventChats", chatId);
      const currentUnread = currentChatDoc.unreadCount?.[currentUser.uid] || 0;
      if (currentUnread > 0) {
        try {
          await updateDoc(chatDocRef, {
            [`unreadCount.${currentUser.uid}`]: 0,
            updatedAt: serverTimestamp(),
          });
        } catch (e) {
          console.error("Error updating unread count:", e);
        }
      }
    }
  }, [chatId, currentUser]);


  useEffect(() => {
    if (!chatId || !currentUser?.uid) return;

    setIsLoadingChat(true);
    setError(null);

    const chatDocRef = doc(db, "eventChats", chatId);
    const unsubscribeChat = onSnapshot(chatDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const formattedChat: EventChat = {
          id: docSnap.id,
          ...data,
          createdAt: safeToDate(data.createdAt),
          updatedAt: safeToDate(data.updatedAt),
          lastMessageTimestamp: data.lastMessageTimestamp ? safeToDate(data.lastMessageTimestamp) : undefined,
        } as EventChat;

        if (!formattedChat.participants.includes(currentUser.uid)) {
            setError(HEBREW_TEXT.general.error + ": " + "אינך משתתף בשיחה זו.");
            setChatDetails(null);
            setIsLoadingChat(false);
            return;
        }
        setChatDetails(formattedChat);
        handleUpdateUnreadCount(formattedChat);
      } else {
        setError(HEBREW_TEXT.chat.errorFetchingChat + ": " + "השיחה לא נמצאה.");
        setChatDetails(null);
      }
      setIsLoadingChat(false);
    }, (err) => {
      console.error("Error fetching chat details:", err);
      setError(HEBREW_TEXT.chat.errorFetchingChat);
      setIsLoadingChat(false);
    });

    const messagesColRef = collection(db, "eventChats", chatId, "messages");
    const messagesQuery = query(messagesColRef, orderBy("timestamp", "asc"));
    const unsubscribeMessages = onSnapshot(messagesQuery, (querySnapshot) => {
      const fetchedMessages: EventChatMessage[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedMessages.push({
          id: doc.id,
          ...data,
          timestamp: safeToDate(data.timestamp),
        } as EventChatMessage);
      });
      setMessages(fetchedMessages);
    }, (err) => {
      console.error("Error fetching messages:", err);
      setError(HEBREW_TEXT.chat.errorFetchingMessages);
    });

    return () => {
      unsubscribeChat();
      unsubscribeMessages();
    };
  }, [chatId, currentUser?.uid, handleUpdateUnreadCount]);

  // Fetch announcements
  useEffect(() => {
    if (!chatDetails?.eventId) return;

    const announcementsColRef = collection(db, "eventAnnouncements");
    const announcementsQuery = query(
      announcementsColRef,
      where("eventId", "==", chatDetails.eventId),
      orderBy("timestamp", "asc")
    );

    const unsubscribeAnnouncements = onSnapshot(announcementsQuery, (querySnapshot) => {
      const fetchedAnnouncements: EventAnnouncement[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<EventAnnouncement, 'id' | 'timestamp'> & { timestamp: Timestamp };
        fetchedAnnouncements.push({
          id: doc.id,
          ...data,
          timestamp: safeToDate(data.timestamp),
        } as EventAnnouncement);
      });
      setAnnouncements(fetchedAnnouncements);
    }, (err) => {
      console.error("Error fetching announcements:", err);
      // Optionally, set an error state for announcements
    });

    return () => unsubscribeAnnouncements();
  }, [chatDetails?.eventId]);

  const sortedChatItems = useMemo((): ChatItem[] => {
    const typedMessages: ChatItem[] = messages.map(msg => ({ ...msg, itemType: 'message' as const }));
    const typedAnnouncements: ChatItem[] = announcements.map(ann => ({ ...ann, itemType: 'announcement' as const }));
    
    const combined = [...typedMessages, ...typedAnnouncements];
    
    return combined.sort((a, b) => {
      const dateA = a.timestamp instanceof Date ? a.timestamp.getTime() : 0;
      const dateB = b.timestamp instanceof Date ? b.timestamp.getTime() : 0;
      return dateA - dateB;
    });
  }, [messages, announcements]);


  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chatDetails || !currentUser) return;
    if (chatDetails.status === 'closed' || chatDetails.status === 'request_rejected') {
        toast({ title: HEBREW_TEXT.general.error, description: HEBREW_TEXT.chat.chatClosedInfo, variant: "destructive"});
        return;
    }

    setIsSendingMessage(true);
    const messageText = newMessage.trim();
    setNewMessage("");

    const batch = writeBatch(db);
    const chatDocRef = doc(db, "eventChats", chatId);
    const newMessageRef = doc(collection(db, "eventChats", chatId, "messages"));

    const senderName = currentUser.displayName || currentUser.email || "משתמש";
    const senderProfileImageUrl = currentUser.photoURL || "";

    batch.set(newMessageRef, {
      chatId: chatId,
      senderId: currentUser.uid,
      text: messageText,
      timestamp: serverTimestamp(),
      senderInfo: {
        name: senderName,
        profileImageUrl: senderProfileImageUrl,
      },
    });

    const updatedUnreadCount = { ...(chatDetails.unreadCount || {}) };
    chatDetails.participants.forEach(participantId => {
      if (participantId !== currentUser.uid) {
        updatedUnreadCount[participantId] = (updatedUnreadCount[participantId] || 0) + 1;
      }
    });

    batch.update(chatDocRef, {
      lastMessageText: messageText,
      lastMessageTimestamp: serverTimestamp(),
      lastMessageSenderId: currentUser.uid,
      updatedAt: serverTimestamp(),
      unreadCount: updatedUnreadCount,
    });

    try {
      await batch.commit();
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    } catch (e) {
      console.error("Error sending message:", e);
      toast({ title: HEBREW_TEXT.general.error, description: HEBREW_TEXT.chat.failedToSendMessage, variant: "destructive" });
      setNewMessage(messageText);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleUpdateStatus = async (newStatus: EventChat['status'], successMessage: string) => {
    if (!chatDetails || !currentUser || !chatDetails.ownerUids.includes(currentUser.uid)) return;

    setIsUpdatingStatus(true);
    const chatDocRef = doc(db, "eventChats", chatId);
    
    try {
      await updateDoc(chatDocRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      toast({ title: HEBREW_TEXT.general.success, description: successMessage });
      if (newStatus === 'request_rejected') setShowDeclineDialog(false);
      if (newStatus === 'closed') setShowCloseDialog(false);
    } catch (e) {
      console.error("Error updating chat status:", e);
      toast({ title: HEBREW_TEXT.general.error, description: "שגיאה בעדכון סטטוס השיחה.", variant: "destructive" });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const isCurrentUserOwner = chatDetails?.ownerUids.includes(currentUser?.uid || "") || false;
  const canSendMessage = chatDetails && chatDetails.status !== 'closed' && chatDetails.status !== 'request_rejected';

  let headerTitleElement: React.ReactNode;
  let headerImage: string | undefined;
  let headerLink: string | undefined;

  if (isLoadingChat && !chatDetails) {
      headerTitleElement = <div className="font-semibold tracking-tight font-headline text-base md:text-lg leading-tight">{HEBREW_TEXT.chat.loadingChatDetails}</div>;
      headerImage = undefined;
  } else if (chatDetails) {
      if (isCurrentUserOwner) {
          headerTitleElement = <div className="font-semibold tracking-tight font-headline text-base md:text-lg leading-tight">{`${HEBREW_TEXT.chat.chatWith} ${chatDetails.guestInfo?.name || HEBREW_TEXT.chat.guest}`}</div>;
          headerImage = chatDetails.guestInfo?.profileImageUrl;
          headerLink = `/profile/${chatDetails.guestUid}`;
      } else {
          headerTitleElement = <div className="font-semibold tracking-tight font-headline text-base md:text-lg leading-tight">{chatDetails.eventInfo?.name || HEBREW_TEXT.event.eventNameGenericPlaceholder}</div>;
          headerImage = chatDetails.eventInfo?.imageUrl;
          headerLink = `/events/${chatDetails.eventId}`;
      }
  } else {
       headerTitleElement = <div className="font-semibold tracking-tight font-headline text-base md:text-lg leading-tight">{HEBREW_TEXT.chat.chatPageTitle}</div>;
  }


  const showOwnerActionBlock = isCurrentUserOwner && chatDetails?.status === 'pending_request';

  if (isLoadingChat && !chatDetails) {
    return (
      <div className="container mx-auto px-0 md:px-4 py-0 md:py-8 h-screen md:h-auto flex flex-col">
        <Card className="flex-1 flex flex-col max-w-3xl mx-auto w-full shadow-lg relative">
            <CardHeader className="border-b p-2 md:p-3">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="font-semibold tracking-tight font-headline text-base md:text-lg leading-tight"><Skeleton className="h-5 w-32" /></div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-3 md:p-4 overflow-y-auto">
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                            <Skeleton className={`h-16 w-3/5 rounded-lg ${i % 2 === 0 ? 'ml-auto' : 'mr-auto'}`} />
                        </div>
                    ))}
                </div>
            </CardContent>
            <CardFooter className="p-3 md:p-4 border-t">
                <Skeleton className="h-10 w-full" />
            </CardFooter>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-150px)]">
        <Alert variant="destructive" className="max-w-lg">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>{HEBREW_TEXT.general.error}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.back()} className="mt-6">
            <ChevronLeft className="ml-1 h-4 w-4"/>
            {HEBREW_TEXT.general.back}
        </Button>
      </div>
    );
  }

  if (!chatDetails) {
    return (
        <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-150px)]">
            <MessageSquareDashed className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{HEBREW_TEXT.chat.errorFetchingChat}</p>
             <Button onClick={() => router.back()} className="mt-6">
                <ChevronLeft className="ml-1 h-4 w-4"/>
                {HEBREW_TEXT.general.back}
            </Button>
        </div>
    );
  }

  const HeaderAvatar = () => (
    <Avatar className="h-8 w-8 border">
      {headerImage ? <AvatarImage src={headerImage} alt="Chat participant" data-ai-hint="chat participant"/> : <AvatarFallback><UserPlaceholderIcon className="h-5 w-5 text-muted-foreground" /></AvatarFallback>}
    </Avatar>
  );

  return (
    <div className="container mx-auto px-0 md:px-4 py-0 md:py-8 h-screen md:h-[calc(100vh-120px)] flex flex-col">
      <Card className="flex-1 flex flex-col max-w-3xl mx-auto w-full shadow-lg overflow-hidden relative">
        {/* Chat Header */}
        <CardHeader 
          className={cn(
            "border-b bg-background backdrop-blur-sm z-30",
            "fixed top-0 left-0 right-0", // Fixed for mobile
            "md:sticky md:top-0" // Sticky for desktop
          )}
        >
          <div className="flex items-center justify-between p-2 md:p-3 w-full max-w-3xl mx-auto"> {/* Inner div gets padding */}
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                 <Button variant="ghost" size="icon" onClick={() => router.back()} className="md:hidden mr-1 h-8 w-8"> {/* Adjusted icon size */}
                    <ChevronLeft className="h-5 w-5" />
                 </Button>
              {headerLink ? (
                <Link href={headerLink} passHref>
                  <HeaderAvatar />
                </Link>
              ) : (
                <HeaderAvatar />
              )}
              <div>
                {headerLink ? (
                    <Link href={headerLink} passHref className="hover:underline">
                        {headerTitleElement}
                    </Link>
                ) : (
                    headerTitleElement
                )}
                {chatDetails.status === 'pending_request' && isCurrentUserOwner && (
                    <p className="text-xs text-amber-600">{HEBREW_TEXT.chat.statusPending}</p>
                )}
                 {chatDetails.status === 'request_approved' && (
                    <p className="text-xs text-green-600">{HEBREW_TEXT.chat.statusApproved}</p>
                )}
                 {chatDetails.status === 'request_rejected' && (
                    <p className="text-xs text-destructive">{HEBREW_TEXT.chat.statusRejected}</p>
                )}
                 {chatDetails.status === 'closed' && (
                    <p className="text-xs text-muted-foreground">{HEBREW_TEXT.chat.statusClosed}</p>
                )}
              </div>
            </div>
            {isCurrentUserOwner && chatDetails.status !== 'closed' && chatDetails.status !== 'request_rejected' && (
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <EllipsisVertical className="h-5 w-5 text-muted-foreground" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setShowCloseDialog(true)} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer">
                            <Ban className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                            {HEBREW_TEXT.chat.closeChat}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <ShadAlertDialogTitle>{HEBREW_TEXT.chat.confirmAction}</ShadAlertDialogTitle>
                <AlertDialogDescription>{HEBREW_TEXT.chat.confirmCloseChatMessage}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-row-reverse">
                    <AlertDialogCancel disabled={isUpdatingStatus}>{HEBREW_TEXT.general.cancel}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => handleUpdateStatus('closed', HEBREW_TEXT.chat.chatClosedMessage)}
                        disabled={isUpdatingStatus}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                        {isUpdatingStatus && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                        {HEBREW_TEXT.chat.closeChat}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>


        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 bg-background/70">
           {/* Adjusted padding: pt-16 for mobile (64px), md:p-4 for desktop (standard padding, md:pt-4 will ensure it's fine with sticky header) */}
          <div className="px-3 pt-16 pb-36 md:p-4 md:pt-4 flex flex-col space-y-1">
            {showOwnerActionBlock && (
                <div className="my-3 p-3 bg-muted/60 dark:bg-muted/40 rounded-lg shadow-sm w-full self-center max-w-md mx-auto">
                  <div className="flex gap-3 justify-center">
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus('request_approved', HEBREW_TEXT.chat.requestApprovedMessage)}
                      disabled={isUpdatingStatus}
                      className="bg-green-600 hover:bg-green-700 text-white flex-1"
                    >
                      {isUpdatingStatus && <Loader2 className="ml-1.5 h-4 w-4 animate-spin" />}
                      <CheckCircle className="ml-1.5 h-4 w-4" />
                      {HEBREW_TEXT.chat.acceptRequest}
                    </Button>
                    <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
                      <AlertDialogTrigger asChild>
                          <Button
                              size="sm"
                              variant="destructive"
                              disabled={isUpdatingStatus}
                              className="flex-1"
                          >
                              <XCircle className="ml-1.5 h-4 w-4" />
                              {HEBREW_TEXT.chat.declineRequest}
                          </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <ShadAlertDialogTitle>{HEBREW_TEXT.chat.confirmDeclineRequestTitle}</ShadAlertDialogTitle>
                              <AlertDialogDescription>
                                  {HEBREW_TEXT.chat.confirmDeclineRequestMessage.replace('{guestName}', chatDetails.guestInfo?.name || HEBREW_TEXT.chat.guest)}
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-row-reverse">
                              <AlertDialogCancel disabled={isUpdatingStatus}>{HEBREW_TEXT.general.cancel}</AlertDialogCancel>
                              <AlertDialogAction
                                  onClick={() => handleUpdateStatus('request_rejected', HEBREW_TEXT.chat.requestDeclinedMessage)}
                                  disabled={isUpdatingStatus}
                                  className="bg-destructive hover:bg-destructive/90"
                              >
                                  {isUpdatingStatus && <Loader2 className="ml-1.5 h-4 w-4 animate-spin" />}
                                  {HEBREW_TEXT.chat.declineRequest}
                              </AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}
            {sortedChatItems.map((item) => (
              item.itemType === 'message' 
                ? <MessageBubble key={item.id} message={item} currentUser={currentUser} />
                : <AnnouncementBubble key={item.id} announcement={item} />
            ))}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        {/* Message Input Area */}
        {canSendMessage ? (
            <CardFooter 
              className={cn(
                "border-t bg-background z-40", 
                "fixed bottom-16 left-0 right-0 p-0", // Fixed for mobile (height of bottom nav)
                "md:sticky md:bottom-0 md:p-3 md:z-auto" // Sticky for desktop
              )}
            >
              <div className={cn(
                "w-full flex items-center space-x-2 rtl:space-x-reverse", 
                "max-w-3xl mx-auto p-2 bg-background", // Padding for mobile inner container
                "md:max-w-none md:mx-0 md:p-0" // No padding for desktop inner container
              )}>
                <Button 
                    type="button" 
                    size="icon" 
                    onClick={handleSendMessage} 
                    disabled={isSendingMessage || !newMessage.trim()}
                    className="order-1" // Ensure button is first visually in LTR, last in RTL due to space-x-reverse
                >
                  {isSendingMessage ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  <span className="sr-only">{HEBREW_TEXT.chat.sendMessage}</span>
                </Button>
                <Textarea
                  placeholder={HEBREW_TEXT.chat.typeYourMessage}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                      }
                  }}
                  rows={1}
                  className="min-h-[40px] max-h-[100px] resize-none order-2" // Ensure textarea is second
                  disabled={isSendingMessage}
                />
              </div>
            </CardFooter>
        ) : (
            <CardFooter 
              className={cn(
                "border-t bg-muted z-40", 
                "fixed bottom-16 left-0 right-0 p-0", 
                "md:sticky md:bottom-0 md:p-3 md:z-auto"
              )}
            >
                <div className={cn(
                  "w-full text-center",
                  "max-w-3xl mx-auto p-2", 
                  "md:max-w-none md:mx-0 md:p-0" 
                )}>
                    <p className="text-sm text-muted-foreground">
                        <Info className="inline-block ml-1 h-4 w-4" />
                        {chatDetails.status === 'closed' ? HEBREW_TEXT.chat.chatClosedInfo : HEBREW_TEXT.chat.requestRejectedInfo}
                    </p>
                </div>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
    
    
    
    
    
