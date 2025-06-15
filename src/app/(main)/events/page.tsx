
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from 'next/image';
import { EventCard } from "@/components/events/EventCard";
import { EventFilters, type Filters } from "@/components/events/EventFilters";
import type { Event } from "@/types";
import { HEBREW_TEXT } from "@/constants/hebrew-text";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MapPin, SearchX, Loader2, Search, Filter as FilterIcon, ChevronDown, ChevronUp, AlertCircle, ArrowDown, RefreshCw } from "lucide-react";
import { GoogleMapComponent, type MapLocation } from "@/components/maps/GoogleMapComponent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, Timestamp, where,getCountFromServer } from "firebase/firestore";
import { safeToDate } from '@/lib/dateUtils';


const PULL_TO_REFRESH_THRESHOLD = 70; // Pixels to pull to trigger refresh
const PULL_INDICATOR_TRAVEL = 60; // Max pixels the indicator travels down

export default function EventsPage() {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [approvedCountsMap, setApprovedCountsMap] = useState<Map<string, number>>(new Map());
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingApprovedCounts, setIsLoadingApprovedCounts] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<Filters>({});
  const [simpleSearchQuery, setSimpleSearchQuery] = useState("");
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [isMapSectionOpen, setIsMapSectionOpen] = useState(false);

  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  // Pull to refresh states
  const [isMobileView, setIsMobileView] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [pullStart, setPullStart] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshingViaPull, setIsRefreshingViaPull] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)"); // Tailwind 'md' breakpoint is 768px
    const handleResize = () => setIsMobileView(mediaQuery.matches);
    handleResize(); // Initial check
    mediaQuery.addEventListener('change', handleResize);
    return () => mediaQuery.removeEventListener('change', handleResize);
  }, []);

  const fetchApprovedCountsForEvents = useCallback(async (eventsToQuery: Event[]) => {
    if (eventsToQuery.length === 0) {
      setApprovedCountsMap(new Map());
      setIsLoadingApprovedCounts(false);
      return;
    }
    setIsLoadingApprovedCounts(true);
    const newApprovedCountsMap = new Map<string, number>();
    try {
      const countPromises = eventsToQuery.map(async (event) => {
        const chatsRef = collection(db, "eventChats");
        const q = query(chatsRef, where("eventId", "==", event.id), where("status", "==", "request_approved"));
        const snapshot = await getCountFromServer(q);
        return { eventId: event.id, count: snapshot.data().count };
      });
      const counts = await Promise.all(countPromises);
      counts.forEach(item => newApprovedCountsMap.set(item.eventId, item.count));
      setApprovedCountsMap(newApprovedCountsMap);
    } catch (error) {
      console.error("Error fetching approved counts:", error);
      // Not setting fetchError here as it's for main event fetching
      setApprovedCountsMap(new Map()); // Reset or keep stale data? Reset for now.
    } finally {
      setIsLoadingApprovedCounts(false);
    }
  }, []);


  const fetchEventsFromFirestore = useCallback(async () => {
    setIsLoadingEvents(true);
    setIsLoadingApprovedCounts(true); // Also set this true initially
    setFetchError(null);
    try {
      const eventsCollectionRef = collection(db, "events");
      const q = query(
        eventsCollectionRef,
        where("numberOfGuests", ">", 0), // Fetch events that have capacity > 0
        orderBy("numberOfGuests", "asc")
        // Removed: orderBy("dateTime", "asc") // To simplify and avoid needing a specific composite index for now.
                                          // For original sorting (by spots then date), create the index suggested by Firebase.
      );
      const querySnapshot = await getDocs(q);
      const fetchedEvents = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          dateTime: safeToDate(data.dateTime),
          createdAt: safeToDate(data.createdAt),
          updatedAt: safeToDate(data.updatedAt),
          name: data.name || "",
          numberOfGuests: data.numberOfGuests || 0, // This is total capacity
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
        } as Event;
      });
      setAllEvents(fetchedEvents);
      await fetchApprovedCountsForEvents(fetchedEvents); // Fetch counts after events are fetched
    } catch (error) {
      console.error("Error fetching events from Firestore:", error);
      setFetchError(HEBREW_TEXT.general.error + " " + HEBREW_TEXT.general.tryAgainLater);
      setAllEvents([]);
      setApprovedCountsMap(new Map());
      setIsLoadingApprovedCounts(false); // Ensure this is false on error too
    } finally {
      setIsLoadingEvents(false);
      // setIsLoadingApprovedCounts will be set by fetchApprovedCountsForEvents
      setIsRefreshingViaPull(false);
    }
  }, [fetchApprovedCountsForEvents]);

  useEffect(() => {
    fetchEventsFromFirestore();
  }, [fetchEventsFromFirestore]);


  useEffect(() => {
    if (isLoadingEvents || isLoadingApprovedCounts) { // Don't filter until counts are loaded
        setFilteredEvents([]); // Or keep stale data, but empty is safer
        return;
    }

    let eventsToFilter = [...allEvents];

    // Primary filter: only show events with available spots
    eventsToFilter = eventsToFilter.filter(event => {
        const approvedCount = approvedCountsMap.get(event.id) || 0;
        return (event.numberOfGuests - approvedCount) > 0;
    });

    if (simpleSearchQuery.trim()) {
      const queryText = simpleSearchQuery.toLowerCase().trim();
      eventsToFilter = eventsToFilter.filter(event =>
          (event.name?.toLowerCase() || '').includes(queryText) ||
          (event.description?.toLowerCase() || '').includes(queryText) ||
          (event.locationDisplayName?.toLowerCase() || '').includes(queryText) ||
          (event.location?.toLowerCase() || '').includes(queryText)
      );
    }

    if (advancedFilters.searchTerm && advancedFilters.searchTerm.trim()) {
      const advancedQueryText = advancedFilters.searchTerm.toLowerCase().trim();
       eventsToFilter = eventsToFilter.filter(event =>
          (event.name?.toLowerCase() || '').includes(advancedQueryText) ||
          (event.description?.toLowerCase() || '').includes(advancedQueryText)
      );
    }
    if (advancedFilters.location && advancedFilters.location.trim()) {
      const advancedLocationQuery = advancedFilters.location.toLowerCase().trim();
      eventsToFilter = eventsToFilter.filter(event =>
          (event.locationDisplayName?.toLowerCase() || '').includes(advancedLocationQuery) ||
          (event.location?.toLowerCase() || '').includes(advancedLocationQuery)
      );
    }
    if (advancedFilters.date) {
      const filterDateString = advancedFilters.date.toDateString();
      eventsToFilter = eventsToFilter.filter(event => {
          return new Date(event.dateTime).toDateString() === filterDateString;
      });
    }
    if (advancedFilters.priceRange && advancedFilters.priceRange !== "any") {
        if (advancedFilters.priceRange === "free") {
            eventsToFilter = eventsToFilter.filter(e => e.paymentOption === "free");
        } else {
            eventsToFilter = eventsToFilter.filter(e => {
                if (e.paymentOption === "fixed" && e.pricePerGuest != null) {
                    if (advancedFilters.priceRange === "0-100") {
                        return e.pricePerGuest >= 0 && e.pricePerGuest <= 100;
                    } else if (advancedFilters.priceRange === "100-200") {
                        return e.pricePerGuest >= 100 && e.pricePerGuest <= 200;
                    } else if (advancedFilters.priceRange === "200+") {
                        return e.pricePerGuest >= 200;
                    }
                }
                return false;
            });
        }
    }
     if (advancedFilters.foodType && advancedFilters.foodType !== "any") {
      eventsToFilter = eventsToFilter.filter(event => event.foodType === advancedFilters.foodType);
    }

    setFilteredEvents(eventsToFilter);

  }, [allEvents, approvedCountsMap, simpleSearchQuery, advancedFilters, isLoadingEvents, isLoadingApprovedCounts]);


  useEffect(() => {
    if (isMapSectionOpen && !currentLocation && !locationError && !isFetchingLocation) {
      setIsFetchingLocation(true);
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
            console.error("Error getting location:", error);
            setLocationError(HEBREW_TEXT.map.locationError);
            setIsFetchingLocation(false);
          }
        );
      } else {
        setLocationError(HEBREW_TEXT.map.geolocationNotSupported);
        setIsFetchingLocation(false);
      }
    }
  }, [isMapSectionOpen, currentLocation, locationError, isFetchingLocation]);

  // Pull to refresh event handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0 && !isRefreshingViaPull && !isLoadingEvents && !isLoadingApprovedCounts) {
      setPullStart(e.touches[0].clientY);
      setIsPulling(true);
      setPullDistance(0); // Reset pull distance
    }
  }, [isRefreshingViaPull, isLoadingEvents, isLoadingApprovedCounts]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling) return;
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - pullStart);
    setPullDistance(distance);

    if (distance > 0 && window.scrollY === 0) {
        // e.preventDefault(); // This requires { passive: false } on listener
    }
  }, [isPulling, pullStart]);

  const handleTouchEnd = useCallback(() => {
    if (!isPulling) return;
    setIsPulling(false);
    if (pullDistance > PULL_TO_REFRESH_THRESHOLD) {
      setIsRefreshingViaPull(true);
      fetchEventsFromFirestore(); // This will also trigger re-fetch of approved counts
    }
    setTimeout(() => setPullDistance(0), 200);
  }, [isPulling, pullDistance, fetchEventsFromFirestore]);

  useEffect(() => {
    if (!isMobileView || !bodyRef.current) return;

    const el = bodyRef.current.parentElement;
    if (!el) return;

    const options = { passive: true };

    el.addEventListener("touchstart", handleTouchStart, options);
    el.addEventListener("touchmove", handleTouchMove, options);
    el.addEventListener("touchend", handleTouchEnd, options);
    el.addEventListener("touchcancel", handleTouchEnd, options);

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [isMobileView, handleTouchStart, handleTouchMove, handleTouchEnd]);


  const handleAdvancedFilterChange = (newFilters: Filters) => {
    setAdvancedFilters(newFilters);
    setShowFiltersModal(false);
  };

  const handleSimpleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSimpleSearchQuery(event.target.value);
  };

  const toggleMapSection = () => {
    setIsMapSectionOpen(prev => !prev);
  };

  const renderSkeletons = () => (
    Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="flex flex-col space-y-3">
        <Skeleton className="h-[125px] w-full rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      </div>
    ))
  );

  const mapEventLocations: MapLocation[] = filteredEvents
    .filter(e => e.latitude != null && e.longitude != null)
    .map(e => ({
      id: e.id,
      lat: e.latitude!,
      lng: e.longitude!,
      eventName: e.name || "",
      locationDisplayName: e.locationDisplayName || e.location,
      dateTime: e.dateTime,
      numberOfGuests: e.numberOfGuests - (approvedCountsMap.get(e.id) || 0), // Available spots
    }));

  const canActuallyRefresh = pullDistance > PULL_TO_REFRESH_THRESHOLD;
  const indicatorVisible = isPulling || isRefreshingViaPull;
  const indicatorY = isRefreshingViaPull ? 20 : Math.min(pullDistance, PULL_INDICATOR_TRAVEL) * 0.5;
  const indicatorOpacity = isRefreshingViaPull ? 1 : Math.min(1, pullDistance / PULL_TO_REFRESH_THRESHOLD);


  return (
    <div ref={bodyRef} className="relative min-h-screen">
      {isMobileView && (
        <div
          style={{
            position: 'fixed',
            top: isRefreshingViaPull || isPulling ? `${Math.max(0, indicatorY - 20)}px` : '-60px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            padding: '10px',
            background: 'hsl(var(--background))',
            borderRadius: '50%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'top 0.3s ease-out, opacity 0.3s ease-out',
            opacity: indicatorOpacity,
            visibility: indicatorVisible ? 'visible' : 'hidden',
          }}
        >
          {isRefreshingViaPull ? (
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          ) : canActuallyRefresh ? (
            <RefreshCw className="h-6 w-6 text-primary" style={{ transform: `rotate(${pullDistance}deg)` }}/>
          ) : (
            <ArrowDown className="h-6 w-6 text-muted-foreground" style={{ transform: `rotate(${pullDistance*0.5}deg)` }} />
          )}
        </div>
      )}

      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="flex flex-row-reverse sm:flex-row items-center gap-2 flex-grow">
            <Dialog open={showFiltersModal} onOpenChange={setShowFiltersModal}>
              <DialogTrigger asChild>
                <Button variant="outline" className="shrink-0">
                  <FilterIcon className="ml-2 h-4 w-4" />
                  {HEBREW_TEXT.event.filters}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[650px]">
                <DialogHeader>
                  <DialogTitle className="font-headline text-xl">{HEBREW_TEXT.event.filters}</DialogTitle>
                </DialogHeader>
                <EventFilters onFilterChange={handleAdvancedFilterChange} initialFilters={advancedFilters} />
              </DialogContent>
            </Dialog>
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                <Input
                    type="search"
                    placeholder={HEBREW_TEXT.general.searchEventsSimplePlaceholder}
                    className="w-full pl-10 pr-3"
                    value={simpleSearchQuery}
                    onChange={handleSimpleSearchChange}
                />
            </div>
          </div>

          <div className="flex-shrink-0 md:hidden">
            <Image src="/app_logo.png" alt={HEBREW_TEXT.appName} width={100} height={30} data-ai-hint="app logo"/>
          </div>
        </div>

        <div className="mb-8 p-4 bg-muted rounded-lg">
          <div className="flex justify-between items-center mb-3 cursor-pointer" onClick={toggleMapSection}>
              <h2 className="font-headline text-xl font-semibold text-center sm:text-right">
                  {HEBREW_TEXT.map.searchOnMapTitle}
              </h2>
              <Button variant="ghost" size="icon">
                  {isMapSectionOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </Button>
          </div>

          {isMapSectionOpen && (
              <div>
                  {isFetchingLocation && (
                      <div className="flex items-center text-muted-foreground pt-2">
                          <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                          {HEBREW_TEXT.map.fetchingLocation}
                      </div>
                  )}
                  {locationError && (
                      <Alert variant="default" className="mt-2">
                          <MapPin className="h-5 w-5"/>
                          <AlertTitle>{HEBREW_TEXT.map.errorTitleShort}</AlertTitle>
                          <AlertDescription>{locationError}</AlertDescription>
                      </Alert>
                  )}
                  {currentLocation && !locationError && (
                    <div className="mt-2 rounded-lg overflow-hidden shadow-md">
                      <GoogleMapComponent
                          center={currentLocation}
                          eventLocations={mapEventLocations}
                      />
                    </div>
                  )}
                  {!isFetchingLocation && !currentLocation && !locationError && (
                      <div className="flex items-center justify-center h-[400px] bg-gray-200 rounded-lg">
                          <p className="text-muted-foreground">{HEBREW_TEXT.map.locationUnavailable}</p>
                      </div>
                  )}
              </div>
          )}
        </div>

        <Separator className="my-8"/>

        {fetchError && !(isLoadingEvents || isLoadingApprovedCounts) && (
          <Alert variant="destructive" className="my-8">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="font-headline">{HEBREW_TEXT.general.error}</AlertTitle>
            <AlertDescription>{fetchError}</AlertDescription>
          </Alert>
        )}

        {(isLoadingEvents || isLoadingApprovedCounts) && !isRefreshingViaPull ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {renderSkeletons()}
          </div>
        ) : !fetchError && filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEvents.map(event => {
               const availableSpots = event.numberOfGuests - (approvedCountsMap.get(event.id) || 0);
               return <EventCard key={event.id} event={event} availableSpots={availableSpots} />;
            })}
          </div>
        ) : !fetchError && filteredEvents.length === 0 && !(isLoadingEvents || isLoadingApprovedCounts) ? (
          <Alert variant="default" className="mt-8">
              <SearchX className="h-5 w-5" />
            <AlertTitle className="font-headline">{HEBREW_TEXT.event.noEventsFound}</AlertTitle>
            <AlertDescription>
              {HEBREW_TEXT.general.tryAgainLater}
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
    </div>
  );
}
