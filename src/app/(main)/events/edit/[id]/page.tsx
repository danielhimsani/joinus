
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db, auth as firebaseAuthInstance } from '@/lib/firebase';
import type { Event, FoodType, KashrutType, WeddingType } from '@/types';
import { EventForm } from '@/components/events/EventForm';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { safeToDate } from '@/lib/dateUtils';


export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true); // General loading for auth check and initial setup
  const [isFetchingEvent, setIsFetchingEvent] = useState(false); // Specific loading for event data fetch
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuthInstance, (user) => {
      setCurrentUser(user);
      if (!user && eventId) {
        // Not logged in but trying to access edit page for a specific event
        setFetchError("עליך להיות מחובר כדי לערוך אירוע.");
        router.push('/signin');
      }
      setIsLoading(false); // Auth check is done, stop initial loading
    });
    return () => unsubscribe();
  }, [router, eventId]);


  useEffect(() => {
    if (isLoading) return; // Wait for auth check to complete

    if (!eventId) {
        setFetchError("Event ID is missing.");
        setEventToEdit(null);
        return;
    }

    if (!currentUser) {
        setFetchError("עליך להיות מחובר כדי לערוך אירוע.");
        setEventToEdit(null);
        return;
    }

    const fetchEventData = async () => {
      setIsFetchingEvent(true);
      setFetchError(null);
      try {
        const eventDocRef = doc(db, "events", eventId);
        const docSnap = await getDoc(eventDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (!data.ownerUids || !data.ownerUids.includes(currentUser.uid)) {
            setFetchError("אינך מורשה לערוך אירוע זה.");
            setEventToEdit(null);
          } else {
            // Basic data migration for old foodType and religionStyle if they exist
            let foodType: FoodType = data.foodType as FoodType || 'meat';
            let kashrut: KashrutType = data.kashrut as KashrutType || 'kosher';
            const weddingType: WeddingType = data.weddingType as WeddingType || (data as any).religionStyle as WeddingType || 'traditional';

            // If kashrut field is missing, try to infer from old foodType schema
            if (!data.kashrut && data.foodType) {
                switch(data.foodType) {
                    case 'kosherMeat':
                        foodType = 'meat'; kashrut = 'kosher'; break;
                    case 'kosherDairy':
                        foodType = 'dairy'; kashrut = 'kosher'; break;
                    case 'kosherParve':
                        foodType = 'vegetarian'; kashrut = 'kosher'; break; // Or vegan
                    case 'notKosher':
                        foodType = 'meatAndDairy'; kashrut = 'notKosher'; break; // A sensible default
                    default: // It's already one of the new food types, or unmapped old one
                        foodType = data.foodType as FoodType;
                        kashrut = 'kosher'; // Default if unmappable
                }
            }


            setEventToEdit({
              id: docSnap.id,
              ...data,
              ownerUids: data.ownerUids || [],
              dateTime: safeToDate(data.dateTime),
              createdAt: safeToDate(data.createdAt),
              updatedAt: safeToDate(data.updatedAt),
              name: data.name || "", 
              numberOfGuests: data.numberOfGuests || 0,
              paymentOption: data.paymentOption || "free",
              pricePerGuest: data.pricePerGuest,
              location: data.location || "No location specified",
              locationDisplayName: data.locationDisplayName || "",
              latitude: data.latitude || null,
              longitude: data.longitude || null,
              description: data.description || "",
              ageRange: Array.isArray(data.ageRange) && data.ageRange.length === 2 ? data.ageRange : [18, 99],
              foodType: foodType,
              kashrut: kashrut,
              weddingType: weddingType,
              imageUrl: data.imageUrl,
            } as Event);
          }
        } else {
          setFetchError(HEBREW_TEXT.event.noEventsFound);
          setEventToEdit(null);
        }
      } catch (error) {
        console.error("Error fetching event for edit:", error);
        setFetchError(HEBREW_TEXT.general.error + " " + (error instanceof Error ? error.message : String(error)));
        setEventToEdit(null);
      } finally {
        setIsFetchingEvent(false);
      }
    };

    if (eventId && currentUser) {
        fetchEventData();
    }
  }, [eventId, currentUser, isLoading, router]);

  if (isLoading || isFetchingEvent) { 
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
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Alert variant="default" className="max-w-lg mx-auto">
            <Loader2 className="h-5 w-5 animate-spin" />
            <AlertTitle className="font-headline">טוען נתוני אירוע...</AlertTitle>
            <AlertDescription>אם הודעה זו נשארת, ייתכן שהאירוע לא נמצא או שאין לך הרשאה לערוך אותו. בדוק את ההודעות למעלה אם קיימות.</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const pageTitle = eventToEdit.name 
    ? `${HEBREW_TEXT.event.editEvent}: ${eventToEdit.name}` 
    : HEBREW_TEXT.event.editEvent;
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

