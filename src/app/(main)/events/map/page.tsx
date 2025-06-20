
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from 'next/navigation';
import { GoogleMapComponent, type MapLocation } from "@/components/maps/GoogleMapComponent";
import { HEBREW_TEXT } from "@/constants/hebrew-text";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, MapPin, AlertCircle, ChevronRight } from "lucide-react"; // Changed ChevronLeft to ChevronRight
import { Button } from "@/components/ui/button";
import { db, auth as firebaseAuthInstance } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, Timestamp, where, getCountFromServer } from "firebase/firestore";
import { safeToDate } from '@/lib/dateUtils';
import type { Event, EventOwnerInfo } from "@/types";
import { useJsApiLoader } from '@react-google-maps/api';
import type { User as FirebaseUser } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";

const libraries: ("places" | "marker")[] = ['places', 'marker'];


export default function FullMapPage() {
  const router = useRouter();
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [approvedCountsMap, setApprovedCountsMap] = useState<Map<string, number>>(new Map());
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingApprovedCounts, setIsLoadingApprovedCounts] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(true); 

  const { isLoaded: isMapsApiLoaded, loadError: mapsApiLoadError } = useJsApiLoader({
    id: 'app-google-maps-script', // Standardized ID
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
    language: 'iw',
    region: 'IL',
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(firebaseAuthInstance, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
  }, []);

  const fetchApprovedCountsForEvents = useCallback(async (eventsToQuery: Event[]) => {
    if (eventsToQuery.length === 0) {
      setApprovedCountsMap(new Map());
      setIsLoadingApprovedCounts(false);
      return;
    }
    setIsLoadingApprovedCounts(true);
    const newCountsMap = new Map<string, number>();
    try {
      const countPromises = eventsToQuery.map(async (event) => {
        const chatsRef = collection(db, "eventChats");
        const q = query(chatsRef, where("eventId", "==", event.id), where("status", "==", "request_approved"));
        const snapshot = await getCountFromServer(q);
        return { eventId: event.id, count: snapshot.data().count };
      });
      const counts = await Promise.all(countPromises);
      counts.forEach(item => newCountsMap.set(item.eventId, item.count));
      setApprovedCountsMap(newCountsMap);
    } catch (error) {
      console.error("Error fetching approved counts for map:", error);
    } finally {
      setIsLoadingApprovedCounts(false);
    }
  }, []);

  const fetchAllEventsForMap = useCallback(async () => {
    setIsLoadingEvents(true);
    setFetchError(null);
    try {
      const eventsCollectionRef = collection(db, "events");
      const q = query(eventsCollectionRef, orderBy("dateTime", "asc")); 
      const querySnapshot = await getDocs(q);
      
      const fetchedEventsData: Event[] = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        
        return {
          id: docSnap.id,
          ...data,
          ownerUids: data.ownerUids || [], // Ensure ownerUids is always an array
          dateTime: safeToDate(data.dateTime),
          name: data.name || HEBREW_TEXT.event.eventNameGenericPlaceholder,
          numberOfGuests: data.numberOfGuests || 0,
          location: data.location || "No location specified",
          locationDisplayName: data.locationDisplayName || "",
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          imageUrl: data.imageUrl, 
        } as Event;
      });
      setAllEvents(fetchedEventsData);
      await fetchApprovedCountsForEvents(fetchedEventsData);
    } catch (error) {
      console.error("Error fetching events for map:", error);
      setFetchError(HEBREW_TEXT.general.error + " " + HEBREW_TEXT.general.tryAgainLater);
    } finally {
      setIsLoadingEvents(false);
    }
  }, [fetchApprovedCountsForEvents]);

  useEffect(() => {
    fetchAllEventsForMap();

    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationError(null);
          setIsFetchingLocation(false);
        },
        (error) => {
          console.error("Error getting location for map:", error);
          setLocationError(HEBREW_TEXT.map.locationError);
          setIsFetchingLocation(false);
          
          setCurrentLocation({ lat: 31.7683, lng: 35.2137 }); 
        }
      );
    } else {
      setLocationError(HEBREW_TEXT.map.geolocationNotSupported);
      setIsFetchingLocation(false);
      
      setCurrentLocation({ lat: 31.7683, lng: 35.2137 });
    }
  }, [fetchAllEventsForMap]);

  const mapEventLocations: MapLocation[] = useMemo(() => {
    let eventsToProcess = [...allEvents];
    const now = new Date();

    // Filter out past events
    eventsToProcess = eventsToProcess.filter(e => {
        const eventDate = new Date(e.dateTime);
        return eventDate >= now;
    });

    // Filter out user's own events
    if (currentUser) {
        eventsToProcess = eventsToProcess.filter(e => !e.ownerUids.includes(currentUser.uid));
    }

    return eventsToProcess
      .filter(e => e.latitude != null && e.longitude != null)
      .map(e => ({
        id: e.id,
        lat: e.latitude!,
        lng: e.longitude!,
        eventName: e.name || HEBREW_TEXT.event.eventNameGenericPlaceholder,
        locationDisplayName: e.locationDisplayName || e.location,
        dateTime: e.dateTime,
        numberOfGuests: e.numberOfGuests - (approvedCountsMap.get(e.id) || 0),
      }))
      // Also filter out events with no available spots for the map
      .filter(e => e.numberOfGuests > 0);
  }, [allEvents, approvedCountsMap, currentUser]);

  const isLoading = isLoadingEvents || isLoadingApprovedCounts || isFetchingLocation || !isMapsApiLoaded;

  if (mapsApiLoadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
        <Alert variant="destructive" className="max-w-md text-center">
          <MapPin className="h-5 w-5 mx-auto mb-2" />
          <AlertTitle>{HEBREW_TEXT.map.errorTitle}</AlertTitle>
          <AlertDescription>{HEBREW_TEXT.map.loadError}</AlertDescription>
        </Alert>
        <Button onClick={() => router.back()} className="mt-6">
            <ChevronRight className="ml-1 h-4 w-4"/> 
            {HEBREW_TEXT.general.back}
        </Button>
      </div>
    );
  }
  
  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
        <Alert variant="destructive" className="max-w-md text-center">
          <MapPin className="h-5 w-5 mx-auto mb-2" />
          <AlertTitle>{HEBREW_TEXT.map.errorTitle}</AlertTitle>
          <AlertDescription>{HEBREW_TEXT.map.apiKeyMissing}</AlertDescription>
        </Alert>
         <Button onClick={() => router.back()} className="mt-6">
            <ChevronRight className="ml-1 h-4 w-4"/>
            {HEBREW_TEXT.general.back}
        </Button>
      </div>
    );
  }


  return (
    <div className="h-screen w-screen flex flex-col">
      <header className="bg-background border-b p-3 flex items-center justify-between shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label={HEBREW_TEXT.general.back}>
          <ChevronRight className="h-6 w-6" />
        </Button>
        <h1 className="font-headline text-lg text-foreground">{HEBREW_TEXT.map.title}</h1>
        <div className="w-10"></div> {/* Spacer */}
      </header>

      <main className="flex-grow relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        )}
        {fetchError && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <Alert variant="destructive">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle>{HEBREW_TEXT.general.error}</AlertTitle>
              <AlertDescription>{fetchError}</AlertDescription>
            </Alert>
          </div>
        )}
        {!fetchError && currentLocation && isMapsApiLoaded && (
          <GoogleMapComponent
            center={currentLocation}
            mapContainerStyle={{ width: '100%', height: '100%', borderRadius: '0' }}
            eventLocations={mapEventLocations}
            zoom={locationError ? 8 : 12} 
          />
        )}
         {!fetchError && !currentLocation && !isLoading && isMapsApiLoaded && (
             <div className="absolute inset-0 flex items-center justify-center p-4">
                <Alert>
                    <MapPin className="h-5 w-5"/>
                    <AlertTitle>{HEBREW_TEXT.map.locationUnavailable}</AlertTitle>
                    <AlertDescription>לא הצלחנו לקבוע את מיקומך או שאין אירועים זמינים.</AlertDescription>
                </Alert>
            </div>
         )}
      </main>
    </div>
  );
}

    
