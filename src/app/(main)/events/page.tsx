
"use client";

import { useState, useEffect } from "react";
import { EventCard } from "@/components/events/EventCard";
import { EventFilters, type Filters } from "@/components/events/EventFilters";
import type { Event } from "@/types";
import { HEBREW_TEXT } from "@/constants/hebrew-text";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MapPin, SearchX, Loader2 } from "lucide-react";
import { GoogleMapComponent } from "@/components/maps/GoogleMapComponent";

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
  const [currentFilters, setCurrentFilters] = useState<Filters>({});

  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(true);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    setIsLoadingEvents(true);
    setTimeout(() => {
      let events = mockEvents;
      if (currentFilters.searchTerm) {
        events = events.filter(event =>
            event.name.toLowerCase().includes(currentFilters.searchTerm!.toLowerCase()) ||
            event.description.toLowerCase().includes(currentFilters.searchTerm!.toLowerCase())
        );
      }
      if (currentFilters.location) {
        events = events.filter(event => event.location.toLowerCase().includes(currentFilters.location!.toLowerCase()));
      }
      if (currentFilters.date) {
        events = events.filter(event => new Date(event.dateTime).toDateString() === currentFilters.date!.toDateString());
      }
      if (currentFilters.priceRange) {
          if (currentFilters.priceRange === "free") {
              events = events.filter(e => e.paymentOption === "free");
          } else if (currentFilters.priceRange !== "any") {
              const [min, max] = currentFilters.priceRange.split('-').map(p => p === 'any' || p.includes('+') ? p : Number(p));
              events = events.filter(e => {
                  if (e.paymentOption === "fixed" && e.pricePerGuest) {
                      if (typeof max === 'string' && max.includes('+')) return e.pricePerGuest >= (min as number);
                      return e.pricePerGuest >= (min as number) && e.pricePerGuest <= (max as number);
                  }
                  return false; 
              });
          }
      }
       if (currentFilters.foodType && currentFilters.foodType !== "any") {
        events = events.filter(event => event.foodType === currentFilters.foodType);
      }
      setFilteredEvents(events);
      setIsLoadingEvents(false);
    }, 1000);
  }, [currentFilters]);

  const handleFilterChange = (filters: Filters) => {
    setCurrentFilters(filters);
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
      <h1 className="font-headline text-4xl font-bold mb-8 text-center">{HEBREW_TEXT.event.discoverEvents}</h1>

      <div className="mb-8 p-4 bg-muted rounded-lg">
        <h2 className="font-headline text-xl font-semibold mb-3 flex items-center">
            <MapPin className="ml-2 h-5 w-5 text-primary" />
            {HEBREW_TEXT.map.title}
        </h2>
        {isFetchingLocation && (
            <div className="flex items-center text-muted-foreground">
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
            <GoogleMapComponent center={currentLocation} />
        )}
         {!isFetchingLocation && !currentLocation && !locationError && (
             <p className="text-muted-foreground">{HEBREW_TEXT.map.locationUnavailable}</p>
         )}
      </div>

      <EventFilters onFilterChange={handleFilterChange} />

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
