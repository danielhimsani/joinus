
"use client";

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import type { Event, UserProfile, EventChat, EventAnnouncement } from '@/types';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription as ShadAlertDescription } from '@/components/ui/alert'; // Renamed to avoid conflict
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from '@/components/ui/scroll-area';
import { db, auth as firebaseAuthInstance } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy, addDoc, serverTimestamp, Timestamp, updateDoc } from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { safeToDate, calculateAge } from '@/lib/dateUtils';
import { Edit3, Users, FileText, Send, Loader2, AlertCircle, ChevronLeft, ChevronRight, Contact as UserPlaceholderIcon, MessageSquare, CalendarDays, MoreVertical, UserX } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle as ShadAlertDialogTitle, // Using alias for Shadcn's title
} from "@/components/ui/alert-dialog";
import { getDisplayInitial } from '@/lib/textUtils'; // Import the helper


const GUESTS_PER_PAGE = 10;

interface ApprovedGuestWithProfile extends UserProfile {
  chatId: string;
}

interface DisplayAnnouncement extends EventAnnouncement {
  ownerDisplayName?: string;
  ownerDisplayImage?: string;
}

export default function ManageEventGuestsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [approvedGuests, setApprovedGuests] = useState<ApprovedGuestWithProfile[]>([]);
  const [announcements, setAnnouncements] = useState<DisplayAnnouncement[]>([]);
  const [ownerProfiles, setOwnerProfiles] = useState<Map<string, UserProfile>>(new Map());

  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [isSendingAnnouncement, setIsSendingAnnouncement] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const totalGuestPages = Math.ceil(approvedGuests.length / GUESTS_PER_PAGE);
  const paginatedGuests = approvedGuests.slice((currentPage - 1) * GUESTS_PER_PAGE, currentPage * GUESTS_PER_PAGE);

  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [guestToRevoke, setGuestToRevoke] = useState<ApprovedGuestWithProfile | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuthInstance, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const fetchPageData = useCallback(async () => {
    if (!currentUser || !eventId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setFetchError(null);

    try {
      // 1. Fetch Event Details & Verify Ownership
      const eventDocRef = doc(db, "events", eventId);
      const eventSnap = await getDoc(eventDocRef);
      if (!eventSnap.exists()) {
        setFetchError(HEBREW_TEXT.event.noEventsFound);
        throw new Error(HEBREW_TEXT.event.noEventsFound);
      }
      const eventData = { id: eventSnap.id, ...eventSnap.data(), dateTime: safeToDate(eventSnap.data()?.dateTime) } as Event;
      if (!eventData.ownerUids.includes(currentUser.uid)) {
        setFetchError("אינך מורשה לנהל אירוע זה.");
        router.push(`/events/${eventId}`);
        throw new Error("Unauthorized access attempt.");
      }
      setEvent(eventData);

      // Fetch owner profiles for announcements later
      const tempOwnerProfiles = new Map<string, UserProfile>();
      for (const ownerUid of eventData.ownerUids) {
        const userDocRef = doc(db, "users", ownerUid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          tempOwnerProfiles.set(ownerUid, { id: userSnap.id, ...userSnap.data() } as UserProfile);
        }
      }
      setOwnerProfiles(tempOwnerProfiles);

      // 2. Fetch Approved Guests and their Profiles
      const chatsQuery = query(
        collection(db, "eventChats"),
        where("eventId", "==", eventId),
        where("status", "==", "request_approved")
      );
      const chatsSnapshot = await getDocs(chatsQuery);
      const guestFetchPromises: Promise<ApprovedGuestWithProfile | null>[] = [];

      chatsSnapshot.forEach((chatDoc) => {
        const chatData = chatDoc.data() as EventChat;
        if (chatData.guestUid) {
          guestFetchPromises.push(
            getDoc(doc(db, "users", chatData.guestUid)).then(userDoc => {
              if (userDoc.exists()) {
                return { ...userDoc.data(), id: userDoc.id, firebaseUid: userDoc.id, chatId: chatDoc.id } as ApprovedGuestWithProfile;
              }
              return null;
            })
          );
        }
      });
      const fetchedGuestsRaw = await Promise.all(guestFetchPromises);
      setApprovedGuests(fetchedGuestsRaw.filter(g => g !== null) as ApprovedGuestWithProfile[]);

      // 3. Fetch Announcements
      const announcementsQuery = query(
        collection(db, "eventAnnouncements"),
        where("eventId", "==", eventId),
        orderBy("timestamp", "desc")
      );
      const announcementsSnapshot = await getDocs(announcementsQuery);
      const fetchedAnnouncements: DisplayAnnouncement[] = announcementsSnapshot.docs.map(annDoc => {
        const annData = annDoc.data() as Omit<EventAnnouncement, 'id' | 'timestamp'> & { timestamp: Timestamp };
        const ownerProfile = tempOwnerProfiles.get(annData.ownerUid);
        return {
          id: annDoc.id,
          ...annData,
          timestamp: safeToDate(annData.timestamp),
          ownerDisplayName: ownerProfile?.name || annData.ownerUid.substring(0, 6),
          ownerDisplayImage: ownerProfile?.profileImageUrl
        } as DisplayAnnouncement;
      });
      setAnnouncements(fetchedAnnouncements);

    } catch (error: any) {
      console.error("Error fetching management page data:", error);
      if (!fetchError) { 
         setFetchError(HEBREW_TEXT.general.error + ": " + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, eventId, router, fetchError]);

  useEffect(() => {
    if (currentUser && eventId) {
      fetchPageData();
    }
  }, [currentUser, eventId, fetchPageData]);


  const handleExportCSV = () => {
    if (approvedGuests.length === 0) {
      toast({ title: HEBREW_TEXT.event.noGuestsToExport, variant: "default" });
      return;
    }
    setIsExportingCsv(true);
    try {
      const headers = [HEBREW_TEXT.event.fullName, HEBREW_TEXT.profile.email, HEBREW_TEXT.profile.phone, HEBREW_TEXT.profile.age];
      const rows = approvedGuests.map(guest => [
        guest.name || "",
        guest.email || "",
        guest.phone || "",
        guest.birthday ? (calculateAge(guest.birthday)?.toString() || "") : ""
      ]);

      let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // \uFEFF for BOM for Excel UTF-8
      csvContent += headers.join(",") + "\n";
      rows.forEach(rowArray => {
        const row = rowArray.map(field => `"${String(field || '').replace(/"/g, '""')}"`).join(","); // Escape quotes
        csvContent += row + "\n";
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `event_${eventId}_guests.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: HEBREW_TEXT.general.success, description: HEBREW_TEXT.event.guestsExportedSuccessfully });
    } catch (error: any) {
      console.error("Error exporting CSV:", error);
      toast({ title: HEBREW_TEXT.general.error, description: HEBREW_TEXT.event.errorExportingGuests + `: ${error.message}`, variant: "destructive" });
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleSendAnnouncement = async () => {
    if (!newAnnouncement.trim() || !currentUser || !event) return;
    setIsSendingAnnouncement(true);
    try {
      const ownerProfile = ownerProfiles.get(currentUser.uid);
      const announcementData: Omit<EventAnnouncement, 'id' | 'timestamp'> = {
        eventId: event.id,
        ownerUid: currentUser.uid,
        ownerName: ownerProfile?.name || currentUser.displayName || "בעל אירוע",
        ownerProfileImageUrl: ownerProfile?.profileImageUrl || currentUser.photoURL || "",
        messageText: newAnnouncement.trim(),
      };
      await addDoc(collection(db, "eventAnnouncements"), {
        ...announcementData,
        timestamp: serverTimestamp()
      });
      toast({ title: HEBREW_TEXT.general.success, description: HEBREW_TEXT.event.announcementSentSuccessfully });
      setNewAnnouncement("");
      fetchPageData(); 
    } catch (error: any) {
      console.error("Error sending announcement:", error);
      toast({ title: HEBREW_TEXT.general.error, description: HEBREW_TEXT.event.errorSendingAnnouncement + `: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSendingAnnouncement(false);
    }
  };

  const handleRevokeApproval = async () => {
    if (!guestToRevoke || !event) return;
    setIsRevoking(true);
    try {
      const chatDocRef = doc(db, "eventChats", guestToRevoke.chatId);
      await updateDoc(chatDocRef, {
        status: 'request_rejected',
        updatedAt: serverTimestamp()
      });
      toast({ title: HEBREW_TEXT.general.success, description: HEBREW_TEXT.event.guestApprovalRevoked.replace('{guestName}', guestToRevoke.name || HEBREW_TEXT.chat.guest) });
      fetchPageData(); // Refresh the guest list
    } catch (error: any) {
      console.error("Error revoking guest approval:", error);
      toast({ title: HEBREW_TEXT.general.error, description: HEBREW_TEXT.event.errorRevokingApproval + (error.message ? `: ${error.message}` : ''), variant: "destructive" });
    } finally {
      setIsRevoking(false);
      setShowRevokeDialog(false);
      setGuestToRevoke(null);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-1" />
            <Skeleton className="h-5 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-8">
            <div>
              <Skeleton className="h-7 w-40 mb-3" />
              <Skeleton className="h-10 w-32 mb-4" />
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-md" />)}
              </div>
            </div>
            <Separator />
            <div>
              <Skeleton className="h-7 w-52 mb-3" />
              <Skeleton className="h-24 w-full mb-4" />
              <Skeleton className="h-10 w-32" />
              <div className="space-y-3 mt-4">
                 <Skeleton className="h-12 w-full rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Alert variant="destructive" className="max-w-lg mx-auto">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>{HEBREW_TEXT.general.error}</AlertTitle>
            <ShadAlertDescription>{fetchError}</ShadAlertDescription>
        </Alert>
         <Button onClick={() => router.push('/events')} className="mt-6">
            <ChevronLeft className="ml-1 h-4 w-4"/>
            {HEBREW_TEXT.navigation.events}
        </Button>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Alert variant="default" className="max-w-lg mx-auto">
            <Users className="h-5 w-5" />
            <AlertTitle>{HEBREW_TEXT.event.noEventsFound}</AlertTitle>
        </Alert>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-4xl mx-auto shadow-lg">
          <CardHeader className="border-b">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <CardTitle className="font-headline text-2xl md:text-3xl">{event.name}</CardTitle>
                <CardDescription className="flex items-center mt-1">
                  <CalendarDays className="ml-1.5 h-4 w-4 text-muted-foreground" />
                  {format(event.dateTime, 'PPPPp', { locale: he })}
                </CardDescription>
              </div>
              <Button asChild variant="outline">
                <Link href={`/events/edit/${event.id}`}>
                  <Edit3 className="ml-2 h-4 w-4" />
                  {HEBREW_TEXT.event.editEvent}
                </Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-10">
            {/* Approved Guests Section */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-headline text-xl font-semibold flex items-center">
                  <Users className="ml-2 h-6 w-6 text-primary" />
                  {HEBREW_TEXT.event.approvedGuests} ({approvedGuests.length})
                </h2>
                <Button
                  onClick={handleExportCSV}
                  disabled={isExportingCsv || approvedGuests.length === 0}
                  variant="outline"
                  size="sm"
                >
                  {isExportingCsv ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <FileText className="ml-2 h-4 w-4" />}
                  {HEBREW_TEXT.event.exportToCsv}
                </Button>
              </div>
              {approvedGuests.length > 0 ? (
                <div className="space-y-3">
                  {paginatedGuests.map(guest => {
                    const guestInitialDisplay = getDisplayInitial(guest.name);
                    return (
                      <Card key={guest.id} className="p-3 shadow-sm">
                        <div className="flex items-center justify-between space-x-3 rtl:space-x-reverse">
                          <div className="flex items-center space-x-3 rtl:space-x-reverse flex-1 min-w-0">
                            <Link href={`/profile/${guest.firebaseUid}`} passHref>
                              <Avatar className="h-10 w-10 border cursor-pointer">
                                <AvatarImage src={guest.profileImageUrl} alt={guest.name} data-ai-hint="guest avatar" />
                                <AvatarFallback className="bg-muted">
                                  {guestInitialDisplay || <UserPlaceholderIcon className="h-6 w-6 text-muted-foreground"/>}
                                </AvatarFallback>
                              </Avatar>
                            </Link>
                            <Link href={`/profile/${guest.firebaseUid}`} passHref className="flex-1 min-w-0">
                              <p className="font-medium truncate cursor-pointer hover:underline">{guest.name}</p>
                              {guest.email && <p className="text-xs text-muted-foreground truncate">{guest.email}</p>}
                            </Link>
                          </div>
                          <div className="flex items-center space-x-1 rtl:space-x-reverse">
                              <Button asChild variant="ghost" size="sm" className="text-xs">
                                  <Link href={`/chat/${guest.chatId}`}>
                                      <MessageSquare className="ml-1.5 h-3 w-3"/>
                                      {HEBREW_TEXT.chat.title}
                                  </Link>
                              </Button>
                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                      </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                      <DropdownMenuItem 
                                          onSelect={() => { setGuestToRevoke(guest); setShowRevokeDialog(true); }}
                                          className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                                      >
                                          <UserX className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                                          {HEBREW_TEXT.event.revokeApproval}
                                      </DropdownMenuItem>
                                  </DropdownMenuContent>
                              </DropdownMenu>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                   {totalGuestPages > 1 && (
                    <div className="flex justify-center items-center space-x-2 rtl:space-x-reverse mt-6">
                        <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        >
                        <ChevronRight className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            עמוד {currentPage} מתוך {totalGuestPages}
                        </span>
                        <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(prev => Math.min(totalGuestPages, prev + 1))}
                        disabled={currentPage === totalGuestPages}
                        >
                        <ChevronLeft className="h-4 w-4" />
                        </Button>
                    </div>
                    )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">{HEBREW_TEXT.event.noApprovedGuestsYet}</p>
              )}
            </section>

            <Separator />

            {/* Broadcast Announcements Section */}
            <section>
              <h2 className="font-headline text-xl font-semibold mb-4 flex items-center">
                <Send className="ml-2 h-6 w-6 text-primary transform scale-x-[-1]" /> {/* Mirrored Send icon */}
                {HEBREW_TEXT.event.broadcastAnnouncements}
              </h2>
              <Card className="bg-muted/30 p-4">
                <CardTitle className="text-lg font-medium mb-1">{HEBREW_TEXT.event.sendNewAnnouncement}</CardTitle>
                <Textarea
                  value={newAnnouncement}
                  onChange={(e) => setNewAnnouncement(e.target.value)}
                  placeholder={HEBREW_TEXT.event.announcementMessagePlaceholder}
                  rows={3}
                  className="mb-3 bg-background"
                  disabled={isSendingAnnouncement}
                />
                <Button
                  onClick={handleSendAnnouncement}
                  disabled={isSendingAnnouncement || !newAnnouncement.trim()}
                >
                  {isSendingAnnouncement && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  {HEBREW_TEXT.event.sendAnnouncement}
                </Button>
              </Card>

              <div className="mt-6">
                <h3 className="font-semibold text-md text-muted-foreground mb-3">{HEBREW_TEXT.event.latestAnnouncements}</h3>
                {announcements.length > 0 ? (
                  <ScrollArea className="h-72 pr-3">
                    <div className="space-y-4">
                      {announcements.map(ann => {
                        const announcerInitial = getDisplayInitial(ann.ownerDisplayName);
                        return (
                          <Card key={ann.id} className="p-3 shadow-sm">
                            <p className="text-sm text-foreground whitespace-pre-line" dir="rtl">{ann.messageText}</p>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                              <div className='flex items-center text-xs text-muted-foreground'>
                                  <Avatar className="h-6 w-6 ml-1.5 border">
                                      <AvatarImage src={ann.ownerDisplayImage} alt={ann.ownerDisplayName} data-ai-hint="owner avatar" />
                                      <AvatarFallback className="text-xs">{announcerInitial || "A"}</AvatarFallback>
                                  </Avatar>
                                  {ann.ownerDisplayName || HEBREW_TEXT.event.eventOwner}
                              </div>
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <span className="text-xs text-muted-foreground">{format(ann.timestamp, 'dd/MM/yy HH:mm', { locale: he })}</span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                      <p>{format(ann.timestamp, 'PPPPp', { locale: he })}</p>
                                  </TooltipContent>
                              </Tooltip>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-muted-foreground text-center py-4">{HEBREW_TEXT.event.noAnnouncementsYet}</p>
                )}
              </div>
            </section>
          </CardContent>
        </Card>
      </div>

      {/* Revoke Approval Confirmation Dialog */}
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <ShadAlertDialogTitle>{HEBREW_TEXT.event.confirmRevokeApprovalTitle}</ShadAlertDialogTitle>
            <AlertDialogDescription>
              {HEBREW_TEXT.event.confirmRevokeApprovalMessage.replace('{guestName}', guestToRevoke?.name || HEBREW_TEXT.chat.guest)}
              <br />
              {HEBREW_TEXT.event.revokeConsequenceMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse">
            <AlertDialogCancel disabled={isRevoking} onClick={() => setGuestToRevoke(null)}>{HEBREW_TEXT.general.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeApproval}
              disabled={isRevoking}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isRevoking && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              {HEBREW_TEXT.event.confirmRevoke}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
    
