
"use client";

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link'; // Import Link
import { useEffect, useState, useCallback } from 'react';
import type { Event, EventOwnerInfo } from '@/types'; // Ensured EventOwnerInfo is imported
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, MapPin, Users, Tag, Utensils, MessageSquare, Edit3, CheckCircle, XCircle, Clock, Info, Loader2, AlertCircle, Trash2, MessageCircleMore } from 'lucide-react';
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
  AlertDialogTitle as ShadAlertDialogTitle, // Renamed to avoid conflict
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Import Tooltip components


import { RequestToJoinModal } from '@/components/events/RequestToJoinModal';

import { db, auth as firebaseAuthInstance, storage } from "@/lib/firebase";
import { doc, getDoc, Timestamp, deleteDoc, collection, query, where, getCountFromServer } from "firebase/firestore";
import { ref as storageRef, deleteObject } from "firebase/storage";
import type { User as FirebaseUser } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { safeToDate } from '@/lib/dateUtils';


const getFoodTypeLabel = (foodType: Event['foodType']) => {
    switch (foodType) {
        case 'kosherMeat': return HEBREW_TEXT.event.kosherMeat;
        case 'kosherDairy': return HEBREW_TEXT.event.kosherDairy;
        case 'kosherParve': return HEBREW_TEXT.event.kosherParve;
        case 'notKosher': return HEBREW_TEXT.event.notKosher;
        default: return '';
    }
}

const getPriceDisplay = (event: Event) => {
    switch (event.paymentOption) {
        case 'free': return HEBREW_TEXT.event.free;
        case 'payWhatYouWant': return HEBREW_TEXT.event.payWhatYouWant;
        case 'fixed': return `₪${event.pricePerGuest || 0} ${HEBREW_TEXT.event.pricePerGuest}`;
        default: return '';
    }
}


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


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuthInstance, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);


  const fetchEventAndApprovedCount = useCallback(async () => {
    if (!eventId) {
        setIsLoading(false);
        setIsLoadingApprovedCount(false);
        setFetchError("Event ID is missing.");
        return;
    }

    setIsLoading(true);
    setIsLoadingApprovedCount(true);
    setFetchError(null);

    try {
      // Fetch Event Data
      const eventDocRef = doc(db, "events", eventId);
      const docSnap = await getDoc(eventDocRef);

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

        setEvent({
          id: docSnap.id,
          ...data,
          ownerUids: data.ownerUids || [],
          owners: ownerData,
          dateTime: safeToDate(data.dateTime),
          createdAt: safeToDate(data.createdAt),
          updatedAt: safeToDate(data.updatedAt),
          name: data.name, // Name is now guaranteed to be a string
          numberOfGuests: data.numberOfGuests || 0, 
          paymentOption: data.paymentOption || "free",
          location: data.location || "No location specified",
          locationDisplayName: data.locationDisplayName || "",
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          description: data.description || "",
          ageRange: Array.isArray(data.ageRange) && data.ageRange.length === 2 ? data.ageRange : [18, 99],
          foodType: data.foodType || "notKosher",
          religionStyle: data.religionStyle || "mixed",
          imageUrl: data.imageUrl,
        } as Event);

        // Fetch Approved Guests Count
        const chatsRef = collection(db, "eventChats");
        const q = query(chatsRef, where("eventId", "==", eventId), where("status", "==", "request_approved"));
        const countSnapshot = await getCountFromServer(q);
        setApprovedGuestsCount(countSnapshot.data().count);

      } else {
        setFetchError(HEBREW_TEXT.event.noEventsFound);
        setEvent(null);
      }
    } catch (error) {
      console.error("Error fetching event or approved count:", error);
      setFetchError(HEBREW_TEXT.general.error + " " + (error instanceof Error ? error.message : String(error)));
      setEvent(null);
    } finally {
      setIsLoading(false);
      setIsLoadingApprovedCount(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEventAndApprovedCount();
  }, [fetchEventAndApprovedCount]);

  const isOwner = event && currentUser && event.ownerUids.includes(currentUser.uid);
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
          }
        }
      }

      const eventDocRef = doc(db, "events", event.id);
      await deleteDoc(eventDocRef);

      toast({ title: HEBREW_TEXT.general.success, description: HEBREW_TEXT.event.eventDeletedSuccessfully });
      router.push('/events'); 
    } catch (error)
    {
      console.error("Error deleting event (Firestore or other):", error);
      toast({ title: HEBREW_TEXT.general.error, description: HEBREW_TEXT.event.errorDeletingEvent + (error instanceof Error ? `: ${error.message}` : ''), variant: "destructive"});
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };


  if (isLoading || isLoadingApprovedCount) {
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
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
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
  
  const placeholderImageSrc = `https://placehold.co/800x400.png${event.name ? `?text=${encodeURIComponent(event.name)}` : ''}`;

  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="overflow-hidden shadow-lg">
        <div className="relative w-full h-64 md:h-96">
          <Image
            src={event.imageUrl || placeholderImageSrc}
            alt={event.name || HEBREW_TEXT.event.eventNameGenericPlaceholder}
            layout="fill"
            objectFit="cover"
            data-ai-hint="wedding detail"
            priority
          />
           <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
        </div>
        <CardHeader className="relative z-10 -mt-16 md:-mt-20 p-6 bg-background/80 backdrop-blur-sm rounded-t-lg md:mx-4">
          <CardTitle className="font-headline text-3xl md:text-4xl text-foreground">{event.name}</CardTitle>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-muted-foreground mt-2">
            <span className="flex items-center"><CalendarDays className="ml-1.5 h-5 w-5 text-primary" /> {format(new Date(event.dateTime), 'PPPPp', { locale: he })}</span>
            <span className="flex items-center"><MapPin className="ml-1.5 h-5 w-5 text-primary" /> {event.locationDisplayName || event.location}</span>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <h3 className="font-headline text-xl font-semibold mb-3">{HEBREW_TEXT.event.description}</h3>
              <p className="text-foreground/80 leading-relaxed whitespace-pre-line">{event.description || "לא סופק תיאור."}</p>

              <Separator className="my-6" />

              <h3 className="font-headline text-xl font-semibold mb-4">פרטים נוספים</h3>
              <div className="grid sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div className="flex items-start"><Users className="ml-2 h-5 w-5 text-primary flex-shrink-0 mt-0.5" /> <span><strong>{HEBREW_TEXT.event.availableSpots}:</strong> {availableSpots > 0 ? availableSpots : HEBREW_TEXT.event.noSpotsAvailableShort}</span></div>
                <div className="flex items-start"><Tag className="ml-2 h-5 w-5 text-primary flex-shrink-0 mt-0.5" /> <span><strong>{HEBREW_TEXT.event.paymentOptions}:</strong> {getPriceDisplay(event)}</span></div>
                <div className="flex items-start"><Utensils className="ml-2 h-5 w-5 text-primary flex-shrink-0 mt-0.5" /> <span><strong>{HEBREW_TEXT.event.foodType}:</strong> {getFoodTypeLabel(event.foodType)}</span></div>
                <div className="flex items-start"><Info className="ml-2 h-5 w-5 text-primary flex-shrink-0 mt-0.5" /> <span><strong>{HEBREW_TEXT.event.religionStyle}:</strong> {event.religionStyle}</span></div>
                <div className="flex items-start"><Clock className="ml-2 h-5 w-5 text-primary flex-shrink-0 mt-0.5" /> <span><strong>{HEBREW_TEXT.event.ageRange}:</strong> {event.ageRange[0]} - {event.ageRange[1]}</span></div>
              </div>
              
              {event.owners && event.owners.length > 0 && (
                <>
                  <Separator className="my-6" />
                  <div>
                    <h3 className="font-headline text-xl font-semibold mb-3">{HEBREW_TEXT.event.owners}</h3>
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <TooltipProvider>
                        {event.owners.map(owner => (
                          <Tooltip key={owner.uid}>
                            <TooltipTrigger asChild>
                              <Link href={`/profile/${owner.uid}`} passHref>
                                <Avatar className="h-10 w-10 border cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                                  <AvatarImage src={owner.profileImageUrl} alt={owner.name} data-ai-hint="organizer avatar" />
                                  <AvatarFallback>{owner.name?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
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
                </>
              )}
            </div>

            <div className="md:col-span-1 space-y-4">
              {!isOwner && currentUser && (
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
              )}
               {!currentUser && ( 
                <Button className="w-full font-body text-lg py-3" onClick={() => router.push('/signin')}>
                    <MessageCircleMore className="ml-2 h-5 w-5" />
                    התחבר כדי לבקש להצטרף
                </Button>
              )}
              <Button variant="outline" className="w-full font-body">
                <MessageSquare className="ml-2 h-4 w-4" />
                שתף אירוע
              </Button>
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

      {event && currentUser && (
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

