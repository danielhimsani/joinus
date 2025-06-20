
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from 'next/image';
import Link from 'next/link';
import { EventCard } from "@/components/events/EventCard";
import { EventFilters, type Filters } from "@/components/events/EventFilters";
import type { Event, EventOwnerInfo, FoodType, KashrutType, WeddingType } from "@/types";
import { HEBREW_TEXT } from "@/constants/hebrew-text";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MapPin, SearchX, Loader2, Search, Filter, ListFilter, ChevronDown, ChevronUp, AlertCircle, ArrowDown, RefreshCw, ChevronLeft, ChevronRight, Map as MapIcon } from "lucide-react";
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
import { db, auth as firebaseAuthInstance } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, Timestamp, where, getCountFromServer, doc } from "firebase/firestore";
import { safeToDate } from '@/lib/dateUtils';
import { cn } from "@/lib/utils";
import type { User as FirebaseUser } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";


const PULL_TO_REFRESH_THRESHOLD = 70; // Pixels to pull to trigger refresh
const PULL_INDICATOR_TRAVEL = 60; // Max pixels the indicator travels down
const EVENTS_PER_PAGE = 10;

const defaultAdvancedFilters: Filters = {
  date: undefined,
  priceRange: "any",
  foodType: "any",
  kashrut: "any",
  weddingType: "any",
  minAvailableSpots: 1,
  showAppliedEvents: false,
};

const countActiveEventFilters = (currentFilters: Filters): number => {
  let count = 0;
  if (currentFilters.date) count++;
  if (currentFilters.priceRange && currentFilters.priceRange !== defaultAdvancedFilters.priceRange) count++;
  if (currentFilters.foodType && currentFilters.foodType !== defaultAdvancedFilters.foodType) count++;
  if (currentFilters.kashrut && currentFilters.kashrut !== defaultAdvancedFilters.kashrut) count++;
  if (currentFilters.weddingType && currentFilters.weddingType !== defaultAdvancedFilters.weddingType) count++;
  if (currentFilters.minAvailableSpots !== undefined && currentFilters.minAvailableSpots !== defaultAdvancedFilters.minAvailableSpots && currentFilters.minAvailableSpots !== 1) count++;
  if (currentFilters.showAppliedEvents === true) count++;
  return count;
};

const checkAreEventsFiltersActive = (currentFilters: Filters): boolean => {
  return countActiveEventFilters(currentFilters) > 0;
};


export default function EventsPage() {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [filteredAndPaginatedEvents, setFilteredAndPaginatedEvents] = useState<Event[]>([]);
  const [approvedCountsMap, setApprovedCountsMap] = useState<Map<string, number>>(new Map());
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingApprovedCounts, setIsLoadingApprovedCounts] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<Filters>({...defaultAdvancedFilters});
  const [simpleSearchQuery, setSimpleSearchQuery] = useState("");
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  const [isMobileView, setIsMobileView] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [pullStart, setPullStart] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshingViaPull, setIsRefreshingViaPull] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [appliedEventIds, setAppliedEventIds] = useState<string[]>([]);
  const [isLoadingAppliedEventIds, setIsLoadingAppliedEventIds] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(firebaseAuthInstance, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const fetchAppliedEvents = async () => {
      if (!currentUser) {
        setAppliedEventIds([]);
        setIsLoadingAppliedEventIds(false);
        return;
      }
      setIsLoadingAppliedEventIds(true);
      try {
        const chatsRef = collection(db, "eventChats");
        const q = query(chatsRef, where("guestUid", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);
        const ids = querySnapshot.docs.map(doc => doc.data().eventId as string);
        setAppliedEventIds(ids);
      } catch (error) {
        console.error("Error fetching applied event IDs:", error);
        setAppliedEventIds([]);
      } finally {
        setIsLoadingAppliedEventIds(false);
      }
    };
    fetchAppliedEvents();
  }, [currentUser]);


  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const handleResize = () => setIsMobileView(mediaQuery.matches);
    handleResize();
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
      setApprovedCountsMap(new Map());
    } finally {
      setIsLoadingApprovedCounts(false);
    }
  }, []);


  const fetchEventsFromFirestore = useCallback(async () => {
    setIsLoadingEvents(true);
    setIsLoadingApprovedCounts(true);
    setFetchError(null);
    try {
      const eventsCollectionRef = collection(db, "events");
      const q = query(eventsCollectionRef, orderBy("dateTime", "asc"));
      const querySnapshot = await getDocs(q);

      const fetchedEventsData = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          ownerUids: data.ownerUids || [],
          dateTime: safeToDate(data.dateTime),
          createdAt: safeToDate(data.createdAt),
          updatedAt: safeToDate(data.updatedAt),
          name: data.name || HEBREW_TEXT.event.eventNameGenericPlaceholder,
          numberOfGuests: data.numberOfGuests || 0,
          paymentOption: data.paymentOption || "free",
          location: data.location || "No location specified",
          locationDisplayName: data.locationDisplayName || "",
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          description: data.description || "",
          ageRange: Array.isArray(data.ageRange) && data.ageRange.length === 2 ? data.ageRange : [18, 99],
          foodType: data.foodType as FoodType || "meat",
          kashrut: data.kashrut as KashrutType || "kosher",
          weddingType: data.weddingType as WeddingType || (data as any).religionStyle as WeddingType || "traditional",
          imageUrl: data.imageUrl,
        } as Omit<Event, 'owners'> & { ownerUids: string[] };
      });

      const allOwnerUids = [...new Set(fetchedEventsData.flatMap(event => event.ownerUids || []))];
      const ownerProfilesMap = new Map<string, EventOwnerInfo>();

      if (allOwnerUids.length > 0) {
        const MAX_IDS_PER_QUERY = 30;
        for (let i = 0; i < allOwnerUids.length; i += MAX_IDS_PER_QUERY) {
            const uidsChunk = allOwnerUids.slice(i, i + MAX_IDS_PER_QUERY);
            if (uidsChunk.length > 0) {
                const usersQuery = query(collection(db, "users"), where("__name__", "in", uidsChunk));
                const usersSnapshot = await getDocs(usersQuery);
                usersSnapshot.forEach(userDoc => {
                    const userData = userDoc.data();
                    ownerProfilesMap.set(userDoc.id, {
                        uid: userDoc.id,
                        name: userData.name || "Unknown Owner",
                        profileImageUrl: userData.profileImageUrl || "",
                    });
                });
            }
        }
      }

      const eventsWithPopulatedOwners: Event[] = fetchedEventsData.map(eventData => {
          const owners: EventOwnerInfo[] = (eventData.ownerUids || []).map(uid =>
              ownerProfilesMap.get(uid) || { uid, name: "Unknown Owner", profileImageUrl: "" }
          );
          return { ...eventData, owners } as Event;
      });

      setAllEvents(eventsWithPopulatedOwners);
      await fetchApprovedCountsForEvents(eventsWithPopulatedOwners);

    } catch (error) {
      console.error("Error fetching events from Firestore:", error);
      setFetchError(HEBREW_TEXT.general.error + " " + HEBREW_TEXT.general.tryAgainLater + (error instanceof Error && (error as any).code === 'failed-precondition' ? " (ייתכן שחסר אינדקס ב-Firestore. בדוק את הודעת השגיאה המלאה בקונסולה.)" : ""));
      setAllEvents([]);
      setApprovedCountsMap(new Map());
      setIsLoadingApprovedCounts(false);
    } finally {
      setIsLoadingEvents(false);
      setIsRefreshingViaPull(false);
    }
  }, [fetchApprovedCountsForEvents]);

  useEffect(() => {
    fetchEventsFromFirestore();
  }, [fetchEventsFromFirestore]);


  useEffect(() => {
    if (isLoadingEvents || isLoadingApprovedCounts || isLoadingAppliedEventIds) {
        setFilteredAndPaginatedEvents([]);
        return;
    }

    let eventsToFilter = [...allEvents];

    // Filter out past events
    const now = new Date();
    eventsToFilter = eventsToFilter.filter(event => {
        const eventDate = new Date(event.dateTime);
        return eventDate >= now;
    });

    // Filter out user's own events
    if (currentUser) {
        eventsToFilter = eventsToFilter.filter(event => !event.ownerUids.includes(currentUser.uid));
    }

    if (!advancedFilters.showAppliedEvents && appliedEventIds.length > 0) {
        eventsToFilter = eventsToFilter.filter(event => !appliedEventIds.includes(event.id));
    }

    eventsToFilter = eventsToFilter.filter(event => {
        const approvedCount = approvedCountsMap.get(event.id) || 0;
        const availableSpots = event.numberOfGuests - approvedCount;
        return availableSpots > 0;
    });

    if (advancedFilters.minAvailableSpots !== undefined && advancedFilters.minAvailableSpots > 0) {
        eventsToFilter = eventsToFilter.filter(event => {
            const approvedCount = approvedCountsMap.get(event.id) || 0;
            const availableSpots = event.numberOfGuests - approvedCount;
            return availableSpots >= advancedFilters.minAvailableSpots!;
        });
    }

    if (simpleSearchQuery.trim()) {
      const queryText = simpleSearchQuery.toLowerCase().trim();
      eventsToFilter = eventsToFilter.filter(event =>
          (event.name?.toLowerCase() || '').includes(queryText) ||
          (event.description?.toLowerCase() || '').includes(queryText) ||
          (event.locationDisplayName?.toLowerCase() || '').includes(queryText) ||
          (event.location?.toLowerCase() || '').includes(queryText)
      );
    }

    if (advancedFilters.date) {
      const filterDateString = advancedFilters.date.toDateString();
      eventsToFilter = eventsToFilter.filter(event => {
          return new Date(event.dateTime).toDateString() === filterDateString;
      });
    }

    if (advancedFilters.priceRange && advancedFilters.priceRange !== "any") {
        if (advancedFilters.priceRange === "payWhatYouWant") {
            eventsToFilter = eventsToFilter.filter(e => e.paymentOption === "payWhatYouWant");
        } else if (advancedFilters.priceRange === "fixed_0-100") {
            eventsToFilter = eventsToFilter.filter(e => e.paymentOption === "fixed" && e.pricePerGuest != null && e.pricePerGuest >= 0 && e.pricePerGuest <= 100);
        } else if (advancedFilters.priceRange === "fixed_101-200") {
            eventsToFilter = eventsToFilter.filter(e => e.paymentOption === "fixed" && e.pricePerGuest != null && e.pricePerGuest >= 101 && e.pricePerGuest <= 200);
        } else if (advancedFilters.priceRange === "fixed_201+") {
            eventsToFilter = eventsToFilter.filter(e => e.paymentOption === "fixed" && e.pricePerGuest != null && e.pricePerGuest >= 201);
        }
    }

     if (advancedFilters.foodType && advancedFilters.foodType !== "any") {
      eventsToFilter = eventsToFilter.filter(event => event.foodType === advancedFilters.foodType);
    }
    if (advancedFilters.kashrut && advancedFilters.kashrut !== "any") {
      eventsToFilter = eventsToFilter.filter(event => event.kashrut === advancedFilters.kashrut);
    }
    if (advancedFilters.weddingType && advancedFilters.weddingType !== "any") {
      eventsToFilter = eventsToFilter.filter(event => event.weddingType === advancedFilters.weddingType);
    }

    const newTotalPages = Math.ceil(eventsToFilter.length / EVENTS_PER_PAGE);
    setTotalPages(newTotalPages);

    const newCurrentPage = (currentPage > newTotalPages && newTotalPages > 0) ? newTotalPages : (currentPage === 0 && newTotalPages > 0 ? 1 : currentPage);
    if (currentPage !== newCurrentPage && newTotalPages > 0) {
        setCurrentPage(newCurrentPage);
    } else if (newTotalPages === 0) {
        setCurrentPage(1);
    }

    const startIndex = (newCurrentPage - 1) * EVENTS_PER_PAGE;
    const endIndex = startIndex + EVENTS_PER_PAGE;
    setFilteredAndPaginatedEvents(eventsToFilter.slice(startIndex, endIndex));

  }, [allEvents, approvedCountsMap, simpleSearchQuery, advancedFilters, isLoadingEvents, isLoadingApprovedCounts, isLoadingAppliedEventIds, appliedEventIds, currentPage, currentUser]);


  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0 && !isRefreshingViaPull && !isLoadingEvents && !isLoadingApprovedCounts && !isLoadingAppliedEventIds) {
      setPullStart(e.touches[0].clientY);
      setIsPulling(true);
      setPullDistance(0);
    }
  }, [isRefreshingViaPull, isLoadingEvents, isLoadingApprovedCounts, isLoadingAppliedEventIds]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling) return;
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - pullStart);
    setPullDistance(distance);

    if (distance > 0 && window.scrollY === 0) {
    }
  }, [isPulling, pullStart]);

  const handleTouchEnd = useCallback(() => {
    if (!isPulling) return;
    setIsPulling(false);
    if (pullDistance > PULL_TO_REFRESH_THRESHOLD) {
      setIsRefreshingViaPull(true);
      setCurrentPage(1);
      fetchEventsFromFirestore();
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
    setCurrentPage(1);
    setShowFiltersModal(false);
  };

  const handleSimpleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSimpleSearchQuery(event.target.value);
    setCurrentPage(1);
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

  const canActuallyRefresh = pullDistance > PULL_TO_REFRESH_THRESHOLD;
  const indicatorVisible = isPulling || isRefreshingViaPull;
  const indicatorY = isRefreshingViaPull ? 20 : Math.min(pullDistance, PULL_INDICATOR_TRAVEL) * 0.5;
  const indicatorOpacity = isRefreshingViaPull ? 1 : Math.min(1, pullDistance / PULL_TO_REFRESH_THRESHOLD);

  const areFiltersApplied = checkAreEventsFiltersActive(advancedFilters);
  const activeEventFilterCount = countActiveEventFilters(advancedFilters);
  const FilterButtonIcon = areFiltersApplied ? ListFilter : Filter;

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
        <div className="hidden md:flex mb-6 justify-center">
          <Image src="/app_logo.png" alt={HEBREW_TEXT.appName} width={150} height={45} data-ai-hint="app logo"/>
        </div>

        <div className="mb-8 flex items-center gap-2 rtl:space-x-reverse">
          <Button asChild variant="outline" size="icon" className="flex-shrink-0">
            <Link href="/events/map">
              <MapIcon className="h-5 w-5" />
              <span className="sr-only">{HEBREW_TEXT.map.openFullMap}</span>
            </Link>
          </Button>
          <Dialog open={showFiltersModal} onOpenChange={setShowFiltersModal}>
              <DialogTrigger asChild>
                <Button
                  variant={areFiltersApplied ? "secondary" : "outline"}
                  size="icon"
                  className="flex-shrink-0 relative"
                  aria-label={HEBREW_TEXT.event.filters}
                >
                  <FilterButtonIcon className="h-5 w-5" />
                   {activeEventFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                        {activeEventFilterCount}
                    </span>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[650px]">
                <DialogHeader>
                  <DialogTitle className="font-headline text-xl"></DialogTitle>
                </DialogHeader>
                <EventFilters onFilterChange={handleAdvancedFilterChange} initialFilters={advancedFilters} />
              </DialogContent>
          </Dialog>
          <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none rtl:right-3 rtl:left-auto" />
              <Input
                  type="search"
                  placeholder={HEBREW_TEXT.general.searchEventsSimplePlaceholder}
                  className="w-full pl-10 pr-3 rtl:pr-10 rtl:pl-3 h-10"
                  value={simpleSearchQuery}
                  onChange={handleSimpleSearchChange}
                  dir="rtl"
              />
          </div>
        </div>

        <Separator className="my-8"/>

        {fetchError && !(isLoadingEvents || isLoadingApprovedCounts || isLoadingAppliedEventIds) && (
          <Alert variant="destructive" className="my-8">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="font-headline">{HEBREW_TEXT.general.error}</AlertTitle>
            <AlertDescription>{fetchError}</AlertDescription>
          </Alert>
        )}

        {(isLoadingEvents || isLoadingApprovedCounts || isLoadingAppliedEventIds) && !isRefreshingViaPull ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {renderSkeletons()}
          </div>
        ) : !fetchError && filteredAndPaginatedEvents.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndPaginatedEvents.map(event => {
                 const availableSpots = event.numberOfGuests - (approvedCountsMap.get(event.id) || 0);
                 return <EventCard key={event.id} event={event} availableSpots={availableSpots} />;
              })}
            </div>
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center items-center space-x-2 rtl:space-x-reverse">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronRight className="h-4 w-4" />
                  {HEBREW_TEXT.general.previous}
                </Button>
                <span className="text-sm text-muted-foreground">
                  עמוד {currentPage} מתוך {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  {HEBREW_TEXT.general.next}
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        ) : !fetchError && filteredAndPaginatedEvents.length === 0 && !(isLoadingEvents || isLoadingApprovedCounts || isLoadingAppliedEventIds) ? (
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
    
