
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db, auth as firebaseAuthInstance } from '@/lib/firebase';
import type { Event } from '@/types';
import { EventForm } from '@/components/events/EventForm';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";

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

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuthInstance, (user) => {
      setCurrentUser(user);
      // Only proceed to fetch event data if user is identified, for ownership check.
      if (!user && eventId) {
        setIsLoading(false);
        setFetchError("עליך להיות מחובר כדי לערוך אירוע.");
        router.push('/signin'); // Redirect if not logged in
      }
    });
    return () => unsubscribe();
  }, [router, eventId]);


  useEffect(() => {
    if (!eventId || !currentUser) { // Wait for currentUser to be set
        if(currentUser === null && !isLoading){ // if auth check is done and no user
            // Error or redirect already handled by auth observer
        } else if (!eventId) {
            setIsLoading(false);
            setFetchError("Event ID is missing.");
        }
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
           // Check for ownership
          if (!data.ownerUids || !data.ownerUids.includes(currentUser.uid)) {
            setFetchError("אינך מורשה לערוך אירוע זה.");
            setEventToEdit(null);
            setIsLoading(false);
            // router.push('/events'); // Optional: redirect if not owner
            return;
          }

          setEventToEdit({
            id: docSnap.id,
            ...data,
            ownerUids: data.ownerUids || [],
            dateTime: safeToDate(data.dateTime),
            createdAt: safeToDate(data.createdAt),
            updatedAt: safeToDate(data.updatedAt),
            name: data.name || "Unnamed Event",
            numberOfGuests: data.numberOfGuests || 0,
            paymentOption: data.paymentOption || "free",
            pricePerGuest: data.pricePerGuest,
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
          setEventToEdit(null);
        }
      } catch (error) {
        console.error("Error fetching event for edit:", error);
        setFetchError(HEBREW_TEXT.general.error + " " + (error instanceof Error ? error.message : String(error)));
        setEventToEdit(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventData();
  }, [eventId, currentUser, router, isLoading]); // isLoading is added to avoid re-fetch before auth check

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto space-y-6">
            <Skeleton className="h-16 w-3/4 mb-4" />
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <div className="grid md:grid-cols-2 gap-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
         <Alert variant="destructive" className="max-w-lg mx-auto">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="font-headline">{HEBREW_TEXT.general.error}</AlertTitle>
            <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!eventToEdit) {
    // This case might be covered by fetchError, but it's a fallback
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Alert variant="default" className="max-w-lg mx-auto">
            <Loader2 className="h-5 w-5 animate-spin" />
            <AlertTitle className="font-headline">טוען נתוני אירוע...</AlertTitle>
            <AlertDescription>אם הודעה זו נשארת, ייתכן שהאירוע לא נמצא או שאין לך הרשאה.</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const pageTitle = `${HEBREW_TEXT.event.editEvent}: ${eventToEdit.name}`;
  const submitButtonText = "שמור שינויים";


  return (
    <div className="container mx-auto px-4 py-12">
      <EventForm 
        initialEventData={eventToEdit} 
        isEditMode={true}
        pageTitle={pageTitle}
        submitButtonText={submitButtonText}
      />
    </div>
  );
}
