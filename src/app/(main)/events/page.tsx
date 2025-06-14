
"use client";

import { useState, useEffect } from "react";
import Image from 'next/image';
import { EventCard } from "@/components/events/EventCard";
import { EventFilters, type Filters } from "@/components/events/EventFilters";
import type { Event } from "@/types";
import { HEBREW_TEXT } from "@/constants/hebrew-text";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MapPin, SearchX, Loader2, Search, Filter as FilterIcon, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
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
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";


export default function EventsPage() {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<Filters>({});
  const [simpleSearchQuery, setSimpleSearchQuery] = useState("");
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [isMapSectionOpen, setIsMapSectionOpen] = useState(false);

  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

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

  useEffect(() => {
    const fetchEventsFromFirestore = async () => {
      setIsLoadingEvents(true);
      setFetchError(null);
      try {
        const eventsCollectionRef = collection(db, "events");
        const q = query(eventsCollectionRef, orderBy("dateTime", "asc")); 
        const querySnapshot = await getDocs(q);
        const fetchedEvents = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
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
          } as Event;
        });
        setAllEvents(fetchedEvents);
      } catch (error) {
        console.error("Error fetching events from Firestore:", error);
        setFetchError(HEBREW_TEXT.general.error + " " + HEBREW_TEXT.general.tryAgainLater);
      } finally {
        setIsLoadingEvents(false);
      }
    };

    fetchEventsFromFirestore();
  }, []); 


  useEffect(() => {
    let eventsToFilter = [...allEvents];

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

  }, [allEvents, simpleSearchQuery, advancedFilters]);


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
      eventName: e.name,
      locationDisplayName: e.locationDisplayName || e.location,
      dateTime: e.dateTime,
      numberOfGuests: e.numberOfGuests,
    }));


  return (
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

      {fetchError && (
        <Alert variant="destructive" className="my-8">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="font-headline">{HEBREW_TEXT.general.error}</AlertTitle>
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      )}

      {isLoadingEvents ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {renderSkeletons()}
        </div>
      ) : !fetchError && filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEvents.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : !fetchError && filteredEvents.length === 0 ? (
        <Alert variant="default" className="mt-8">
            <SearchX className="h-5 w-5" />
          <AlertTitle className="font-headline">{HEBREW_TEXT.event.noEventsFound}</AlertTitle>
          <AlertDescription>
            {HEBREW_TEXT.general.tryAgainLater}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
