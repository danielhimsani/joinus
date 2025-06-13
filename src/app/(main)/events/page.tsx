
"use client";

import { useState, useEffect } from "react";
import { EventCard } from "@/components/events/EventCard";
import { EventFilters, type Filters } from "@/components/events/EventFilters";
import type { Event } from "@/types";
import { HEBREW_TEXT } from "@/constants/hebrew-text";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MapPin, SearchX, Loader2, Search, Filter as FilterIcon } from "lucide-react";
import { GoogleMapComponent } from "@/components/maps/GoogleMapComponent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

// Mock data
const mockEvents: Event[] = [
  {
    id: "1",
    coupleId: "couple1",
    name: "החתונה של רותם ואוריה",
    numberOfGuests: 20,
    paymentOption: "fixed",
    pricePerGuest: 180,
    location: "אולמי 'קסם', ירושלים",
    dateTime: new Date(new Date().setDate(new Date().getDate() + 7)), // Next week
    description: "הצטרפו אלינו לחגיגה של אהבה באווירה קסומה ומרגשת. מוזיקה טובה, אוכל משובח והמון שמחה!",
    ageRange: [25, 55],
    foodType: "kosherMeat",
    religionStyle: "traditional",
    imageUrl: "https://placehold.co/600x400.png?text=Event1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    coupleId: "couple2",
    name: "מסיבת האירוסין של נועה ואיתי",
    numberOfGuests: 15,
    paymentOption: "payWhatYouWant",
    location: "לופט 'אורבן', תל אביב",
    dateTime: new Date(new Date().setDate(new Date().getDate() + 14)), // In two weeks
    description: "מסיבת אירוסין צעירה ותוססת עם DJ, קוקטיילים ואווירה מחשמלת. בואו לחגוג איתנו!",
    ageRange: [20, 35],
    foodType: "kosherParve",
    religionStyle: "secular",
    imageUrl: "https://placehold.co/600x400.png?text=Event2",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "3",
    coupleId: "couple3",
    name: "חידוש נדרים: משפחת לוי",
    numberOfGuests: 30,
    paymentOption: "free",
    location: "בית כנסת 'אוהל מועד', חיפה",
    dateTime: new Date(new Date().setDate(new Date().getDate() + 30)), // In a month
    description: "אירוע מרגש לחידוש נדרים לאחר 20 שנות נישואין. כיבוד קל ואווירה משפחתית.",
    ageRange: [30, 60],
    foodType: "kosherDairy",
    religionStyle: "religious",
    imageUrl: "https://placehold.co/600x400.png?text=Event3",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
   {
    id: "4",
    coupleId: "couple4",
    name: "חתונה בטבע: יעל ורון",
    numberOfGuests: 10,
    paymentOption: "fixed",
    pricePerGuest: 250,
    location: "יער בן שמן",
    dateTime: new Date(new Date().setDate(new Date().getDate() + 21)),
    description: "חתונה אינטימית ורומנטית בלב הטבע. אווירה פסטורלית ואוכל גורמה צמחוני.",
    ageRange: [20, 40],
    foodType: "kosherParve", 
    religionStyle: "mixed",
    imageUrl: "https://placehold.co/600x400.png?text=Event4",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default function EventsPage() {
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [advancedFilters, setAdvancedFilters] = useState<Filters>({});
  const [simpleSearchQuery, setSimpleSearchQuery] = useState("");
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false); // Set to false initially
  const [showMap, setShowMap] = useState(false);


  useEffect(() => {
    if (showMap && !currentLocation && !locationError) { // Fetch location only if map is shown and not already fetched/errored
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
  }, [showMap, currentLocation, locationError]); // Re-run if showMap changes

  useEffect(() => {
    setIsLoadingEvents(true);
    // Simulate API fetch
    setTimeout(() => {
      let eventsToFilter = mockEvents;

      // 1. Apply simple search query
      if (simpleSearchQuery.trim()) {
        const query = simpleSearchQuery.toLowerCase().trim();
        eventsToFilter = eventsToFilter.filter(event =>
            event.name.toLowerCase().includes(query) ||
            event.description.toLowerCase().includes(query) ||
            event.location.toLowerCase().includes(query) 
        );
      }

      // 2. Apply advanced filters from modal
      if (advancedFilters.searchTerm && advancedFilters.searchTerm.trim()) { // searchTerm from advanced filters
        const advancedQuery = advancedFilters.searchTerm.toLowerCase().trim();
         eventsToFilter = eventsToFilter.filter(event =>
            event.name.toLowerCase().includes(advancedQuery) ||
            event.description.toLowerCase().includes(advancedQuery)
        );
      }
      if (advancedFilters.location && advancedFilters.location.trim()) {
        eventsToFilter = eventsToFilter.filter(event => event.location.toLowerCase().includes(advancedFilters.location!.toLowerCase().trim()));
      }
      if (advancedFilters.date) {
        eventsToFilter = eventsToFilter.filter(event => new Date(event.dateTime).toDateString() === advancedFilters.date!.toDateString());
      }
      if (advancedFilters.priceRange) {
          if (advancedFilters.priceRange === "free") {
              eventsToFilter = eventsToFilter.filter(e => e.paymentOption === "free");
          } else if (advancedFilters.priceRange !== "any") {
              const [min, max] = advancedFilters.priceRange.split('-').map(p => p === 'any' || p.includes('+') ? p : Number(p));
              eventsToFilter = eventsToFilter.filter(e => {
                  if (e.paymentOption === "fixed" && e.pricePerGuest) {
                      if (typeof max === 'string' && max.includes('+')) return e.pricePerGuest >= (min as number);
                      return e.pricePerGuest >= (min as number) && e.pricePerGuest <= (max as number);
                  }
                  return false; 
              });
          }
      }
       if (advancedFilters.foodType && advancedFilters.foodType !== "any") {
        eventsToFilter = eventsToFilter.filter(event => event.foodType === advancedFilters.foodType);
      }
      setFilteredEvents(eventsToFilter);
      setIsLoadingEvents(false);
    }, 700);
  }, [simpleSearchQuery, advancedFilters]);

  const handleAdvancedFilterChange = (newFilters: Filters) => {
    setAdvancedFilters(newFilters);
    setShowFiltersModal(false); // Close modal on apply
  };

  const handleSimpleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSimpleSearchQuery(event.target.value);
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

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="font-headline text-4xl font-bold mb-4 text-center">{HEBREW_TEXT.event.discoverEvents}</h1>
      
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <div className="relative flex-grow">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
                type="search"
                placeholder={HEBREW_TEXT.general.searchEventsSimplePlaceholder}
                className="w-full pr-10" 
                value={simpleSearchQuery}
                onChange={handleSimpleSearchChange}
            />
        </div>
        <Dialog open={showFiltersModal} onOpenChange={setShowFiltersModal}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
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
      </div>

      <div className="mb-8 p-4 bg-muted rounded-lg">
        <div className="flex justify-between items-center mb-3">
            <h2 className="font-headline text-xl font-semibold flex items-center">
                <MapPin className="ml-2 h-5 w-5 text-primary" />
                {HEBREW_TEXT.map.title}
            </h2>
            <Button variant="outline" size="sm" onClick={() => setShowMap(!showMap)}>
                <MapPin className="ml-1.5 h-4 w-4" />
                {HEBREW_TEXT.map.eventsOnMap}
            </Button>
        </div>
        {showMap && (
            <>
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
                  <div className="mt-2">
                    <GoogleMapComponent center={currentLocation} />
                  </div>
                )}
                {!isFetchingLocation && !currentLocation && !locationError && (
                    <p className="text-muted-foreground pt-2">{HEBREW_TEXT.map.locationUnavailable}</p>
                )}
            </>
        )}
      </div>

      <Separator className="my-8"/>


      {isLoadingEvents ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {renderSkeletons()}
        </div>
      ) : filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEvents.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <Alert variant="default" className="mt-8">
            <SearchX className="h-5 w-5" />
          <AlertTitle className="font-headline">{HEBREW_TEXT.event.noEventsFound}</AlertTitle>
          <AlertDescription>
            {HEBREW_TEXT.general.tryAgainLater}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
