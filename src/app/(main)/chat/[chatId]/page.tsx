
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, updateDoc, serverTimestamp, writeBatch, Timestamp, where, increment } from 'firebase/firestore';
import { db, auth as firebaseAuthInstance } from '@/lib/firebase';
import type { EventChat, EventChatMessage } from '@/types';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { useToast } from '@/hooks/use-toast';
import { safeToDate } from '@/lib/dateUtils';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

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
  AlertDialogTitle as ShadAlertDialogTitle, // Renamed
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Send, UserX, CheckCircle, XCircle, Info, ShieldAlert, MessageSquareDashed, ChevronLeft, Ban, Contact as UserPlaceholderIcon, MoreVertical } from 'lucide-react';
import { MessageBubble } from '@/components/chat/MessageBubble';
import Link from 'next/link';


export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const chatId = params.chatId as string;
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);


  const [chatDetails, setChatDetails] = useState<EventChat | null>(null);
  const [messages, setMessages] = useState<EventChatMessage[]>([]);
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

  const updateUnreadCount = useCallback(async () => {
    if (chatId && currentUser && chatDetails) {
      const chatDocRef = doc(db, "eventChats", chatId);
      const currentUnread = chatDetails.unreadCount?.[currentUser.uid] || 0;
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
  }, [chatId, currentUser, chatDetails]);


  useEffect(() => {
    if (!chatId || !currentUser) return;

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
        updateUnreadCount();
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
  }, [chatId, currentUser, updateUnreadCount]);


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

      // No longer decrementing event.numberOfGuests here

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
      headerTitleElement = <CardTitle className="font-headline text-lg md:text-xl leading-tight">{HEBREW_TEXT.chat.loadingChatDetails}</CardTitle>;
      headerImage = undefined;
  } else if (chatDetails) {
      if (isCurrentUserOwner) {
          headerTitleElement = <CardTitle className="font-headline text-lg md:text-xl leading-tight">{`${HEBREW_TEXT.chat.chatWith} ${chatDetails.guestInfo?.name || HEBREW_TEXT.chat.guest}`}</CardTitle>;
          headerImage = chatDetails.guestInfo?.profileImageUrl;
          headerLink = `/profile/${chatDetails.guestUid}`;
      } else {
          headerTitleElement = <CardTitle className="font-headline text-lg md:text-xl leading-tight">{`${HEBREW_TEXT.event.eventName}: ${chatDetails.eventInfo?.name || HEBREW_TEXT.event.eventNameGenericPlaceholder}`}</CardTitle>;
          headerImage = chatDetails.eventInfo?.imageUrl;
          headerLink = `/events/${chatDetails.eventId}`;
      }
  } else {
       headerTitleElement = <CardTitle className="font-headline text-lg md:text-xl leading-tight">{HEBREW_TEXT.chat.chatPageTitle}</CardTitle>;
  }


  const showOwnerActionBlock = isCurrentUserOwner && chatDetails?.status === 'pending_request';

  if (isLoadingChat && !chatDetails) {
    return (
      <div className="container mx-auto px-0 md:px-4 py-0 md:py-8 h-screen md:h-auto flex flex-col">
        <Card className="flex-1 flex flex-col max-w-3xl mx-auto w-full shadow-lg relative">
            <CardHeader className="border-b p-3 md:p-4">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="font-headline text-lg md:text-xl leading-tight"><Skeleton className="h-6 w-40" /></div>
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
    <Avatar className="h-10 w-10 border">
      {headerImage ? <AvatarImage src={headerImage} alt="Chat participant" data-ai-hint="chat participant"/> : <AvatarFallback><UserPlaceholderIcon className="h-6 w-6 text-muted-foreground" /></AvatarFallback>}
    </Avatar>
  );

  return (
    <div className="container mx-auto px-0 md:px-4 py-0 md:py-8 h-screen md:h-[calc(100vh-120px)] flex flex-col">
      <Card className="flex-1 flex flex-col max-w-3xl mx-auto w-full shadow-lg overflow-hidden relative">
        {/* Chat Header */}
        <CardHeader className="border-b p-3 md:p-4 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
                 <Button variant="ghost" size="icon" onClick={() => router.back()} className="md:hidden mr-1">
                    <ChevronLeft className="h-6 w-6" />
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
                        <Button variant="ghost" size="icon">
                            <MoreVertical className="h-5 w-5 text-muted-foreground" />
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
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-3 md:p-4 bg-background/70">
          <div className="flex flex-col space-y-1">
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
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} currentUser={currentUser} />
            ))}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        {/* Message Input Area */}
        {canSendMessage ? (
            <CardFooter className="p-3 md:p-4 border-t bg-background sticky bottom-0">
            <div className="flex w-full items-center space-x-2 rtl:space-x-reverse">
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
                className="min-h-[40px] max-h-[100px] resize-none"
                disabled={isSendingMessage}
                />
                <Button type="button" size="icon" onClick={handleSendMessage} disabled={isSendingMessage || !newMessage.trim()}>
                {isSendingMessage ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                <span className="sr-only">{HEBREW_TEXT.chat.sendMessage}</span>
                </Button>
            </div>
            </CardFooter>
        ) : (
            <CardFooter className="p-3 md:p-4 border-t bg-muted sticky bottom-0">
                <p className="text-sm text-muted-foreground text-center w-full">
                    <Info className="inline-block ml-1 h-4 w-4" />
                    {chatDetails.status === 'closed' ? HEBREW_TEXT.chat.chatClosedInfo : HEBREW_TEXT.chat.requestRejectedInfo}
                </p>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}

    