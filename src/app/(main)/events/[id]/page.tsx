
"use client";

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import type { Event, EventOwnerInfo, FoodType, KashrutType, WeddingType, ApprovedGuestData, EventChat } from '@/types';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarDays, MapPin, Users, Tag, Utensils, MessageSquare, Edit3, CheckCircle, XCircle, Clock, Info, Loader2, AlertCircle, Trash2, MessageCircleMore, ListChecks, Share2, FileText, ShieldCheck, Heart, Contact as UserPlaceholderIcon } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { RequestToJoinModal } from '@/components/events/RequestToJoinModal';
import { ApprovedGuestListItem } from '@/components/events/ApprovedGuestListItem';

import { db, auth as firebaseAuthInstance, storage } from "@/lib/firebase";
import { doc, getDoc, Timestamp, deleteDoc, collection, query, where, getDocs, getCountFromServer, limit } from "firebase/firestore";
import { ref as storageRef, deleteObject } from "firebase/storage";
import type { User as FirebaseUser } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { safeToDate } from '@/lib/dateUtils';


const getFoodTypeLabel = (foodType: FoodType | undefined) => {
    if (!foodType) return '';
    switch (foodType) {
        case 'meat': return HEBREW_TEXT.event.meat;
        case 'dairy': return HEBREW_TEXT.event.dairy;
        case 'meatAndDairy': return HEBREW_TEXT.event.meatAndDairy;
        case 'vegetarian': return HEBREW_TEXT.event.vegetarian;
        case 'vegan': return HEBREW_TEXT.event.vegan;
        case 'kosherParve': return HEBREW_TEXT.event.kosherParve;
        default: return foodType;
    }
};

const getKashrutLabel = (kashrut: KashrutType | undefined) => {
    if (!kashrut) return '';
    switch (kashrut) {
        case 'kosher': return HEBREW_TEXT.event.kosher;
        case 'notKosher': return HEBREW_TEXT.event.notKosher;
        default: return kashrut;
    }
};

const getWeddingTypeLabel = (weddingType: WeddingType | undefined) => {
    if (!weddingType) return '';
    switch (weddingType) {
        case 'traditional': return HEBREW_TEXT.event.traditional;
        case 'civil': return HEBREW_TEXT.event.civil;
        case 'harediWithSeparation': return HEBREW_TEXT.event.harediWithSeparation;
        default: return weddingType;
    }
};

const getPriceDisplay = (event: Event) => {
    switch (event.paymentOption) {
        case 'payWhatYouWant': return HEBREW_TEXT.event.payWhatYouWant;
        case 'fixed': return `₪${event.pricePerGuest || 0} ${HEBREW_TEXT.event.pricePerGuest}`;
        default: return '';
    }
};


export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRequestToJoinModal, setShowRequestToJoinModal] = useState(false);
  const [approvedGuestsCount, setApprovedGuestsCount] = useState(0);
  const [isLoadingApprovedCount, setIsLoadingApprovedCount] = useState(true);

  const [approvedGuestsData, setApprovedGuestsData] = useState<ApprovedGuestData[]>([]);
  const [isLoadingApprovedGuestsData, setIsLoadingApprovedGuestsData] = useState(false);
  const [existingChatId, setExistingChatId] = useState<string | null>(null);
  const [isLoadingExistingChat, setIsLoadingExistingChat] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuthInstance, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const fetchEventAndRelatedData = useCallback(async () => {
    if (!eventId) {
        setIsLoading(false);
        setIsLoadingApprovedCount(false);
        setIsLoadingApprovedGuestsData(false);
        setIsLoadingExistingChat(false);
        setFetchError("Event ID is missing.");
        return;
    }

    setIsLoading(true);
    setIsLoadingApprovedCount(true);
    setIsLoadingApprovedGuestsData(true);
    setIsLoadingExistingChat(true);
    setEvent(null);
    setApprovedGuestsCount(0);
    setApprovedGuestsData([]);
    setExistingChatId(null);
    setFetchError(null);

    try {
      const eventDocRef = doc(db, "events", eventId);
      const docSnap = await getDoc(eventDocRef);

      let fetchedEvent: Event | null = null;
      if (docSnap.exists()) {
        const data = docSnap.data();
        const ownerData: EventOwnerInfo[] = data.ownerUids && Array.isArray(data.ownerUids)
          ? await Promise.all(data.ownerUids.map(async (uid: string) => {
              const userDoc = await getDoc(doc(db, "users", uid));
              if (userDoc.exists()) {
                  const userData = userDoc.data();
                  return {
                      uid: uid,
                      name: userData.name || "Unknown Owner",
                      profileImageUrl: userData.profileImageUrl || ""
                  };
              }
              return { uid: uid, name: "Unknown Owner", profileImageUrl: "" };
          }))
          : [];

        fetchedEvent = {
          id: docSnap.id,
          ...data,
          ownerUids: data.ownerUids || [],
          owners: ownerData,
          dateTime: safeToDate(data.dateTime),
          createdAt: safeToDate(data.createdAt),
          updatedAt: safeToDate(data.updatedAt),
          name: data.name || HEBREW_TEXT.event.eventNameGenericPlaceholder,
          numberOfGuests: data.numberOfGuests || 0,
          paymentOption: data.paymentOption || "free",
          location: data.location || "No location specified",
          locationDisplayName: data.locationDisplayName || "",
          placeId: data.placeId || undefined,
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          description: data.description || "",
          ageRange: Array.isArray(data.ageRange) && data.ageRange.length === 2 ? data.ageRange : [18, 99],
          foodType: data.foodType as FoodType || "meat",
          kashrut: data.kashrut as KashrutType || "kosher",
          weddingType: data.weddingType || (data as any).religionStyle || "traditional",
          imageUrl: data.imageUrl,
        } as Event;
        setEvent(fetchedEvent);

        const chatsRef = collection(db, "eventChats");
        const qCount = query(chatsRef, where("eventId", "==", eventId), where("status", "==", "request_approved"));
        const countSnapshot = await getCountFromServer(qCount);
        setApprovedGuestsCount(countSnapshot.data().count);
        setIsLoadingApprovedCount(false);

        const currentIsOwnerCheck = fetchedEvent && currentUser && fetchedEvent.ownerUids.includes(currentUser.uid);

        if (currentIsOwnerCheck) {
          setIsLoadingExistingChat(false);
          const qApprovedData = query(chatsRef, where("eventId", "==", eventId), where("status", "==", "request_approved"));
          const approvedSnapshot = await getDocs(qApprovedData);
          const guests: ApprovedGuestData[] = [];
          approvedSnapshot.forEach(docData => {
            const chatData = docData.data() as EventChat;
            if (chatData.guestInfo && chatData.guestUid) {
              guests.push({
                guestUid: chatData.guestUid,
                guestInfo: chatData.guestInfo,
                chatId: docData.id
              });
            }
          });
          setApprovedGuestsData(guests);
          setIsLoadingApprovedGuestsData(false);
        } else { // Not owner
          setIsLoadingApprovedGuestsData(false);
          if (currentUser && eventId) {
              const existingChatQuery = query(
                  chatsRef,
                  where("eventId", "==", eventId),
                  where("guestUid", "==", currentUser.uid),
                  limit(1)
              );
              const existingChatSnapshot = await getDocs(existingChatQuery);
              if (!existingChatSnapshot.empty) {
                  setExistingChatId(existingChatSnapshot.docs[0].id);
              } else {
                  setExistingChatId(null);
              }
          } else {
             setExistingChatId(null);
          }
          setIsLoadingExistingChat(false);
        } // End of currentIsOwnerCheck block
      } else { // docSnap does not exist
        setFetchError(HEBREW_TEXT.event.noEventsFound);
        setEvent(null);
        // Ensure all specific loading states are false here
        setIsLoadingApprovedCount(false);
        setIsLoadingApprovedGuestsData(false);
        setIsLoadingExistingChat(false);
      } // End of docSnap.exists() block
    } catch (error) { // Catch block
      console.error("Error fetching event or related data:", error);
      setFetchError(HEBREW_TEXT.general.error + " " + (error instanceof Error ? error.message : String(error)));
      setEvent(null);
      // Ensure all specific loading states are false in catch
      setIsLoadingApprovedCount(false);
      setIsLoadingApprovedGuestsData(false);
      setIsLoadingExistingChat(false);
    } finally { // Finally block
      setIsLoading(false); // General loading state
      // Unconditionally set specific loading states to false
      setIsLoadingApprovedCount(false);
      setIsLoadingApprovedGuestsData(false);
      setIsLoadingExistingChat(false);
    }
  }, [eventId, currentUser, toast, router]);


  useEffect(() => {
    fetchEventAndRelatedData();
  }, [fetchEventAndRelatedData]);

  const isOwner = !!(event && currentUser && event.ownerUids.includes(currentUser.uid));
  const availableSpots = event ? event.numberOfGuests - approvedGuestsCount : 0;

  const handleOpenRequestToJoinModal = () => {
    if (!currentUser) {
        toast({ title: HEBREW_TEXT.general.error, description: "עליך להתחבר כדי לבקש להצטרף.", variant: "destructive" });
        router.push('/signin');
        return;
    }
    if (event && currentUser) {
        if (availableSpots <= 0) {
            toast({ title: HEBREW_TEXT.event.noSpotsAvailableTitle, description: HEBREW_TEXT.event.noSpotsAvailableMessage, variant: "default" });
            return;
        }
        setShowRequestToJoinModal(true);
    }
  };

  const handleDeleteEvent = async () => {
    if (!event || !event.id || !isOwner) {
      toast({ title: HEBREW_TEXT.general.error, description: "אינך מורשה למחוק אירוע זה או שפרטי האירוע חסרים.", variant: "destructive"});
      return;
    }
    setIsDeleting(true);
    try {
      if (event.imageUrl && event.imageUrl.includes("firebasestorage.googleapis.com")) {
        try {
          const imageStorageRef = storageRef(storage, event.imageUrl);
          await deleteObject(imageStorageRef);
        } catch (storageError: any) {
          if (storageError.code === 'storage/object-not-found') {
            console.log("Image not found in storage (already deleted or never existed). This is okay.");
          } else {
            console.error("Error deleting image from storage:", storageError);
            toast({
              title: HEBREW_TEXT.general.error,
              description: HEBREW_TEXT.event.errorDeletingImageFromStorage + (storageError.message ? `: ${storageError.message}` : '. אנא בדוק הרשאות אחסון ב-Firebase.'),
              variant: "destructive",
              duration: 7000,
            });
            // Decide if you want to proceed with deleting the Firestore document if image deletion fails.
            // For now, we continue.
          }
        }
      }

      const eventDocRef = doc(db, "events", event.id);
      await deleteDoc(eventDocRef);

      toast({ title: HEBREW_TEXT.general.success, description: HEBREW_TEXT.event.eventDeletedSuccessfully });
      router.push('/events');
    } catch (error) {
      console.error("Error deleting event (Firestore or other):", error);
      toast({ title: HEBREW_TEXT.general.error, description: HEBREW_TEXT.event.errorDeletingEvent + (error instanceof Error ? `: ${error.message}` : ''), variant: "destructive"});
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleShareEvent = async () => {
    if (navigator.share && event) {
      try {
        await navigator.share({
          title: event.name || HEBREW_TEXT.event.eventNameGenericPlaceholder,
          text: `${HEBREW_TEXT.event.checkOutEvent}: ${event.name || HEBREW_TEXT.event.eventNameGenericPlaceholder}\n${event.description || ''}`.substring(0, 250) + "...",
          url: window.location.href,
        });
        toast({
          title: HEBREW_TEXT.general.success,
          description: HEBREW_TEXT.event.eventSharedSuccessfully,
        });
        return; 
      } catch (shareError) {
        console.error('Web Share API attempt failed:', shareError);
        // Fallback to clipboard copy if Web Share API fails or is not available
      }
    }

    // Fallback to clipboard copy
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: HEBREW_TEXT.general.success,
        description: HEBREW_TEXT.event.linkCopiedToClipboard,
      });
    } catch (clipboardError) {
      console.error('Error copying link to clipboard:', clipboardError);
      toast({
        title: HEBREW_TEXT.general.error,
        description: HEBREW_TEXT.event.errorCopyingLink,
        variant: 'destructive',
      });
    }
  };


  if (isLoading || isLoadingApprovedCount) { // isLoadingApprovedCount check is important here
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="overflow-hidden">
            <Skeleton className="h-64 md:h-96 w-full rounded-t-lg" />
            <CardHeader>
                <Skeleton className="h-8 w-3/4 mb-2" />
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-5 w-40" />
                </div>
            </CardHeader>
            <CardContent>
            <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                    <div>
                        <Skeleton className="h-6 w-1/4 mb-2" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                    <div>
                        <Skeleton className="h-6 w-1/3 mb-3" />
                        <div className="grid sm:grid-cols-2 gap-4">
                            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
                        </div>
                    </div>
                </div>
                <div className="md:col-span-1 space-y-4">
                     <Skeleton className="h-12 w-full" />
                     <Skeleton className="h-10 w-full" />
                </div>
            </div>
            </CardContent>
        </Card>
      </div>
    );
  }

  if (fetchError || !event) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Alert variant="destructive" className="max-w-lg mx-auto mb-6">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="font-headline">{fetchError ? HEBREW_TEXT.general.error : HEBREW_TEXT.event.noEventsFound}</AlertTitle>
            <AlertDescription>
                {fetchError || HEBREW_TEXT.event.noEventsFoundMessage}
            </AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/events')} className="mt-4">{HEBREW_TEXT.general.back} {HEBREW_TEXT.navigation.events}</Button>
      </div>
    );
  }

  const imageToDisplay = event.imageUrl || "/onboarding/slide-2.png";

  let googleMapsLink: string;
  if (event.placeId) {
    const queryParam = encodeURIComponent(event.locationDisplayName || event.name || event.location);
    googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${queryParam}&query_place_id=${event.placeId}`;
  } else {
    let queryForMap: string;
    if (event.locationDisplayName && event.locationDisplayName.trim() !== "") {
      queryForMap = event.locationDisplayName;
    } else if (event.location && event.location.trim() !== "") {
      queryForMap = event.location;
    } else if (event.latitude != null && event.longitude != null) {
      queryForMap = `${event.latitude},${event.longitude}`;
    } else {
      queryForMap = event.name || HEBREW_TEXT.event.eventNameGenericPlaceholder;
    }
    googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryForMap)}`;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="overflow-hidden shadow-lg">
        <div className="relative w-full h-64 md:h-96">
          <Image
            src={imageToDisplay}
            alt={event.name || HEBREW_TEXT.event.eventNameGenericPlaceholder}
            layout="fill"
            objectFit="cover"
            data-ai-hint="wedding detail"
            priority
            key={imageToDisplay}
          />
          <Button
            variant="outline"
            size="icon"
            className="absolute top-4 right-4 z-10 bg-background/80 hover:bg-background focus-visible:bg-background focus-visible:outline-none focus-visible:ring-0 text-foreground rounded-full shadow-md"
            onClick={handleShareEvent}
            title={HEBREW_TEXT.event.shareEventTitle}
          >
            <Share2 className="h-5 w-5" />
          </Button>
           <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
        </div>
        <CardHeader className="relative z-10 -mt-16 md:-mt-20 p-6 bg-background/80 backdrop-blur-sm rounded-t-lg md:mx-4">
          <CardTitle className="font-headline text-3xl md:text-4xl text-foreground">{event.name || ""}</CardTitle>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-muted-foreground mt-2">
            <span className="flex items-center"><CalendarDays className="ml-1.5 h-5 w-5 text-primary" /> {format(new Date(event.dateTime), 'PPPPp', { locale: he })}</span>
            <Link
              href={googleMapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center hover:underline text-muted-foreground hover:text-primary transition-colors"
              title="פתח בגוגל מפות"
            >
              <MapPin className="ml-1.5 h-5 w-5 text-primary" />
              {event.locationDisplayName || event.location}
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              {event.owners && event.owners.length > 0 && (
                <>
                  <div>
                    <h3 className="font-headline text-xl font-semibold mb-3">{HEBREW_TEXT.event.owners}</h3>
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <TooltipProvider>
                        {event.owners.map(owner => (
                          <Tooltip key={owner.uid}>
                            <TooltipTrigger asChild>
                              <Link href={`/profile/${owner.uid}`} passHref>
                                <Avatar className="h-10 w-10 border cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                                  {owner.profileImageUrl ? (
                                    <AvatarImage src={owner.profileImageUrl} alt={owner.name} data-ai-hint="organizer avatar"/>
                                  ) : (
                                    <AvatarFallback className="bg-muted">
                                      <UserPlaceholderIcon className="h-6 w-6 text-muted-foreground" />
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{owner.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </TooltipProvider>
                    </div>
                  </div>
                  <Separator className="my-6" />
                </>
              )}

              <h3 className="font-headline text-xl font-semibold mb-3">{HEBREW_TEXT.event.description}</h3>
              <p className="text-foreground/80 leading-relaxed whitespace-pre-line">{event.description || "לא סופק תיאור."}</p>

              <Separator className="my-6" />

              <h3 className="font-headline text-xl font-semibold mb-4">פרטים נוספים</h3>
              <div className="grid sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div className="flex items-start"><Users className="ml-2 h-5 w-5 text-primary flex-shrink-0 mt-0.5" /> <span><strong>{HEBREW_TEXT.event.availableSpots}:</strong> {availableSpots > 0 ? availableSpots : HEBREW_TEXT.event.noSpotsAvailableShort}</span></div>
                <div className="flex items-start"><Tag className="ml-2 h-5 w-5 text-primary flex-shrink-0 mt-0.5" /> <span><strong>{HEBREW_TEXT.event.paymentOptions}:</strong> {getPriceDisplay(event)}</span></div>
                <div className="flex items-start"><Utensils className="ml-2 h-5 w-5 text-primary flex-shrink-0 mt-0.5" /> <span><strong>{HEBREW_TEXT.event.foodType}:</strong> {getFoodTypeLabel(event.foodType)}</span></div>
                <div className="flex items-start"><ShieldCheck className="ml-2 h-5 w-5 text-primary flex-shrink-0 mt-0.5" /> <span><strong>{HEBREW_TEXT.event.kashrut}:</strong> {getKashrutLabel(event.kashrut)}</span></div>
                <div className="flex items-start"><Heart className="ml-2 h-5 w-5 text-primary flex-shrink-0 mt-0.5" /> <span><strong>{HEBREW_TEXT.event.weddingType}:</strong> {getWeddingTypeLabel(event.weddingType)}</span></div>
                <div className="flex items-start"><Clock className="ml-2 h-5 w-5 text-primary flex-shrink-0 mt-0.5" /> <span><strong>{HEBREW_TEXT.event.ageRange}:</strong> {event.ageRange[0]} - {event.ageRange[1]}</span></div>
              </div>

             {isOwner && (
                <>
                  <Separator className="my-8" />
                  <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-headline text-xl font-semibold flex items-center">
                            <ListChecks className="ml-2 h-6 w-6 text-primary" />
                            {HEBREW_TEXT.event.approvedGuests} ({approvedGuestsData.length})
                        </h3>
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/events/manage/${event.id}`}>
                                <Users className="ml-1.5 h-4 w-4" />
                                {HEBREW_TEXT.event.manageGuestsTitle}
                            </Link>
                        </Button>
                    </div>
                    {isLoadingApprovedGuestsData ? (
                      <div className="space-y-3">
                        {[...Array(2)].map((_, i) => (
                           <Card key={i} className="p-3 shadow-sm">
                                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="flex-1 space-y-1">
                                        <Skeleton className="h-4 w-2/4" />
                                        <Skeleton className="h-3 w-1/4" />
                                    </div>
                                    <Skeleton className="h-8 w-20 rounded-md" />
                                </div>
                            </Card>
                        ))}
                      </div>
                    ) : approvedGuestsData.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {approvedGuestsData.slice(0, 4).map(guest => (
                          <ApprovedGuestListItem key={guest.guestUid} guest={guest} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">{HEBREW_TEXT.event.noApprovedGuestsYet}</p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="md:col-span-1 space-y-4">
            {isLoadingExistingChat ? (
              <Button className="w-full font-body text-lg py-3" disabled>
                <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                {HEBREW_TEXT.general.loading}...
              </Button>
            ) : existingChatId ? (
              <Button asChild className="w-full font-body text-lg py-3">
                <Link href={`/chat/${existingChatId}`}>
                  <MessageSquare className="ml-2 h-5 w-5" />
                  {HEBREW_TEXT.chat.viewChat}
                </Link>
              </Button>
            ) : !isOwner && currentUser ? (
              availableSpots > 0 ? (
                <Button className="w-full font-body text-lg py-3" onClick={handleOpenRequestToJoinModal}>
                  <MessageCircleMore className="ml-2 h-5 w-5" />
                  {HEBREW_TEXT.event.requestToJoin}
                </Button>
              ) : (
                <Button className="w-full font-body text-lg py-3" disabled>
                  <XCircle className="ml-2 h-5 w-5" />
                  {HEBREW_TEXT.event.noSpotsAvailableTitle}
                </Button>
              )
            ) : !currentUser ? (
              <Button className="w-full font-body text-lg py-3" onClick={() => router.push('/signin')}>
                <MessageCircleMore className="ml-2 h-5 w-5" />
                התחבר כדי לבקש להצטרף
              </Button>
            ) : null}
            </div>
          </div>
        </CardContent>
        {isOwner && (
            <CardFooter className="border-t px-6 py-4 flex flex-col sm:flex-row sm:justify-end gap-3">
                <Button
                    variant="outline"
                    onClick={() => router.push(`/events/edit/${event.id}`)}
                    className="w-full sm:w-auto font-body"
                    disabled={isDeleting}
                >
                    <Edit3 className="ml-2 h-4 w-4" />
                    {HEBREW_TEXT.event.editEvent}
                </Button>
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="outline"
                            className="w-full sm:w-auto font-body border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={isDeleting}
                        >
                            {isDeleting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Trash2 className="ml-2 h-4 w-4" />}
                            {HEBREW_TEXT.event.deleteEvent}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <ShadAlertDialogTitle className="text-right font-headline">{HEBREW_TEXT.event.deleteConfirmationTitle}</ShadAlertDialogTitle>
                        <AlertDialogDescription className="text-right">
                            {HEBREW_TEXT.event.deleteConfirmationMessage}
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-row-reverse sm:flex-row-reverse">
                            <AlertDialogCancel disabled={isDeleting}>{HEBREW_TEXT.general.cancel}</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteEvent}
                                disabled={isDeleting}
                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            >
                                {isDeleting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
                                {HEBREW_TEXT.general.delete}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        )}
      </Card>

      {event && currentUser && !isOwner && !existingChatId && (
        <RequestToJoinModal
          isOpen={showRequestToJoinModal}
          onOpenChange={setShowRequestToJoinModal}
          event={event}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
    

    