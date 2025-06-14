
"use client";

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { Event, UserProfile as GuestProfile } from '@/types';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, MapPin, Users, Tag, Utensils, MessageSquare, Edit3, ThumbsUp, ThumbsDown, CheckCircle, XCircle, Clock, Info, Loader2, AlertCircle, Trash2 } from 'lucide-react';
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
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { db, auth as firebaseAuthInstance, storage } from "@/lib/firebase";
import { doc, getDoc, Timestamp, deleteDoc } from "firebase/firestore";
import { ref as storageRef, deleteObject } from "firebase/storage";
import type { User as FirebaseUser } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";


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

const safeToDate = (timestampField: any): Date => {
    if (timestampField && typeof timestampField.toDate === 'function') {
      return (timestampField as Timestamp).toDate();
    }
    if (timestampField instanceof Date) return timestampField;
    if (typeof timestampField === 'string' || typeof timestampField === 'number') {
        const d = new Date(timestampField);
        if (!isNaN(d.getTime())) return d;
    }
    console.warn("safeToDate received unhandled type or invalid date:", timestampField);
    return new Date(); 
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

  const [joinRequests, setJoinRequests] = useState<GuestProfile[]>([]); 
  const [approvedGuests, setApprovedGuests] = useState<GuestProfile[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuthInstance, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!eventId) {
        setIsLoading(false);
        setFetchError("Event ID is missing.");
        return;
    }

    const fetchEventData = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const eventDocRef = doc(db, "events", eventId);
        const docSnap = await getDoc(eventDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setEvent({
            id: docSnap.id,
            ...data,
            ownerUids: data.ownerUids || [],
            dateTime: safeToDate(data.dateTime),
            createdAt: safeToDate(data.createdAt),
            updatedAt: safeToDate(data.updatedAt),
            name: data.name || "Unnamed Event",
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
        } else {
          setFetchError(HEBREW_TEXT.event.noEventsFound);
          setEvent(null);
        }
      } catch (error) {
        console.error("Error fetching event:", error);
        setFetchError(HEBREW_TEXT.general.error + " " + (error instanceof Error ? error.message : String(error)));
        setEvent(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventData();
  }, [eventId]);

  const isOwner = event && currentUser && event.ownerUids.includes(currentUser.uid);

  const handleRequestToJoin = () => {
    toast({ title: HEBREW_TEXT.general.success, description: "בקשתך להצטרף נשלחה (דמה)!" });
  };

  const handleApproveRequest = (guestId: string) => {
    toast({ title: HEBREW_TEXT.general.success, description: `בקשת האורח אושרה (דמה).` });
  };

  const handleRejectRequest = (guestId: string) => {
    toast({ title: HEBREW_TEXT.general.success, description: `בקשת האורח נדחתה (דמה).` });
  };

  const handleRateGuest = (guestId: string, rating: 'positive' | 'negative') => {
    toast({
      title: HEBREW_TEXT.general.success,
      description: `האורח דורג ${rating === 'positive' ? HEBREW_TEXT.emojis.thumbsUp : HEBREW_TEXT.emojis.thumbsDown} (דמה)`,
    });
  };

  const handleDeleteEvent = async () => {
    if (!event || !event.id || !isOwner) {
      toast({ title: HEBREW_TEXT.general.error, description: "אינך מורשה למחוק אירוע זה או שפרטי האירוע חסרים.", variant: "destructive"});
      return;
    }
    setIsDeleting(true);
    try {
      // Delete image from Firebase Storage if it exists and is not a placeholder
      if (event.imageUrl && event.imageUrl.includes("firebasestorage.googleapis.com")) {
        try {
          const imageStorageRef = storageRef(storage, event.imageUrl);
          await deleteObject(imageStorageRef);
        } catch (storageError: any) {
          if (storageError.code === 'storage/object-not-found') {
            console.log("Image not found in storage (already deleted or never existed). This is okay.");
          } else {
            // More critical error, like permissions
            console.error("Error deleting image from storage:", storageError);
            toast({
              title: HEBREW_TEXT.general.error,
              description: HEBREW_TEXT.event.errorDeletingImageFromStorage + (storageError.message ? `: ${storageError.message}` : '. אנא בדוק הרשאות אחסון ב-Firebase.'),
              variant: "destructive",
              duration: 7000, // Longer duration for important errors
            });
            // Depending on policy, you might want to stop here or continue to delete Firestore doc.
            // For now, we'll log and continue, but the user is notified.
          }
        }
      }

      // Delete event document from Firestore
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


  if (isLoading) {
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
                    {/* Skeleton for buttons that were previously here */}
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
                {fetchError || HEBREW_TEXT.event.noEventsFound}
            </AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/events')} className="mt-4">{HEBREW_TEXT.general.back} {HEBREW_TEXT.navigation.events}</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="overflow-hidden shadow-lg">
        <div className="relative w-full h-64 md:h-96">
          <Image
            src={event.imageUrl || "https://placehold.co/800x400.png"}
            alt={event.name}
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
                <div className="flex items-start"><Users className="ml-2 h-5 w-5 text-primary flex-shrink-0 mt-0.5" /> <span><strong>{HEBREW_TEXT.event.numberOfGuests}:</strong> {event.numberOfGuests}</span></div>
                <div className="flex items-start"><Tag className="ml-2 h-5 w-5 text-primary flex-shrink-0 mt-0.5" /> <span><strong>{HEBREW_TEXT.event.paymentOptions}:</strong> {getPriceDisplay(event)}</span></div>
                <div className="flex items-start"><Utensils className="ml-2 h-5 w-5 text-primary flex-shrink-0 mt-0.5" /> <span><strong>{HEBREW_TEXT.event.foodType}:</strong> {getFoodTypeLabel(event.foodType)}</span></div>
                <div className="flex items-start"><Info className="ml-2 h-5 w-5 text-primary flex-shrink-0 mt-0.5" /> <span><strong>{HEBREW_TEXT.event.religionStyle}:</strong> {event.religionStyle}</span></div>
                <div className="flex items-start"><Clock className="ml-2 h-5 w-5 text-primary flex-shrink-0 mt-0.5" /> <span><strong>{HEBREW_TEXT.event.ageRange}:</strong> {event.ageRange[0]} - {event.ageRange[1]}</span></div>
              </div>
            </div>

            <div className="md:col-span-1 space-y-4">
              {!isOwner && (
                <Button className="w-full font-body text-lg py-3" onClick={handleRequestToJoin}>
                  {HEBREW_TEXT.event.requestToJoin}
                </Button>
              )}
              <Button variant="outline" className="w-full font-body">
                <MessageSquare className="ml-2 h-4 w-4" />
                שתף אירוע
              </Button>
            </div>
          </div>

          {isOwner && (
            <>
              <Separator className="my-8" />
              <section>
                <h3 className="font-headline text-2xl font-semibold mb-4">{HEBREW_TEXT.event.guestRequests}</h3>
                {joinRequests.length > 0 ? (
                  <div className="space-y-4">
                    {joinRequests.map(guest => (
                      <Card key={guest.id} className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center">
                          <Avatar className="ml-3 h-10 w-10">
                            <AvatarImage src={guest.profileImageUrl} alt={guest.name} data-ai-hint="guest avatar" />
                            <AvatarFallback>{guest.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{guest.name} {guest.isVerified && <Badge variant="default" className="mr-1 bg-green-500 hover:bg-green-600">מאומת</Badge>}</p>
                            <p className="text-xs text-muted-foreground">{guest.bio || "אין ביו זמין"}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2 rtl:space-x-reverse self-end sm:self-center">
                          <Button size="sm" variant="default" onClick={() => handleApproveRequest(guest.id)}><CheckCircle className="ml-1 h-4 w-4"/> {HEBREW_TEXT.event.approve}</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleRejectRequest(guest.id)}><XCircle className="ml-1 h-4 w-4"/> {HEBREW_TEXT.event.reject}</Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">{HEBREW_TEXT.event.noPendingRequests} (תכונה זו תורחב בהמשך)</p>
                )}
              </section>

              <Separator className="my-8" />
              <section>
                <h3 className="font-headline text-2xl font-semibold mb-4">{HEBREW_TEXT.event.approvedGuests}</h3>
                 {approvedGuests.length > 0 ? (
                  <div className="space-y-4">
                    {approvedGuests.map(guest => (
                      <Card key={guest.id} className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center">
                          <Avatar className="ml-3 h-10 w-10">
                            <AvatarImage src={guest.profileImageUrl} alt={guest.name} data-ai-hint="guest avatar"/>
                            <AvatarFallback>{guest.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                             <p className="font-medium">{guest.name} {guest.isVerified && <Badge variant="default" className="mr-1 bg-green-500 hover:bg-green-600">מאומת</Badge>}</p>
                            <p className="text-xs text-muted-foreground">{guest.bio || "אין ביו זמין"}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2 rtl:space-x-reverse self-end sm:self-center">
                          <Button size="icon" variant="ghost" onClick={() => handleRateGuest(guest.id, 'positive')} title="דרג חיובי">
                            <ThumbsUp className="h-5 w-5 text-green-500"/>
                          </Button>
                           <Button size="icon" variant="ghost" onClick={() => handleRateGuest(guest.id, 'negative')} title="דרג שלילי">
                            <ThumbsDown className="h-5 w-5 text-red-500"/>
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">{HEBREW_TEXT.event.noApprovedGuests} (תכונה זו תורחב בהמשך)</p>
                )}
                 <Button variant="outline" className="mt-4 w-full md:w-auto" disabled> 
                    <MessageSquare className="ml-2 h-4 w-4" />
                    {HEBREW_TEXT.event.broadcastMessage} (בקרוב)
                 </Button>
              </section>
            </>
          )}
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
                        <AlertDialogTitle className="text-right font-headline">{HEBREW_TEXT.event.deleteConfirmationTitle}</AlertDialogTitle>
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
    </div>
  );
}

