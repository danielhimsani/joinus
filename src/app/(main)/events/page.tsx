
"use client";

import { useState, useEffect } from "react";
import { EventCard } from "@/components/events/EventCard";
import { EventFilters, type Filters } from "@/components/events/EventFilters";
import type { Event } from "@/types";
import { HEBREW_TEXT } from "@/constants/hebrew-text";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SearchX } from "lucide-react";

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
    ageRange: [30, 60], // Added default age range
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
    ageRange: [20, 40], // Added default age range
    foodType: "kosherParve", // Assuming vegetarian can be parve
    religionStyle: "mixed",
    imageUrl: "https://placehold.co/600x400.png?text=Event4",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default function EventsPage() {
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentFilters, setCurrentFilters] = useState<Filters>({});

  // Simulate fetching events
  useEffect(() => {
    setIsLoading(true);
    // Simulate API call with filters
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
                  return false; // Only filter fixed price for range, unless "free" is selected
              });
          }
      }
       if (currentFilters.foodType && currentFilters.foodType !== "any") {
        events = events.filter(event => event.foodType === currentFilters.foodType);
      }
      // Note: Age range filtering logic is not implemented in EventFilters yet.
      // If it were, it would need to handle the new ageRange: [min, max] format.

      setFilteredEvents(events);
      setIsLoading(false);
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

      {/* Placeholder for Map - this would be a more complex integration */}
      <div className="mb-8 p-4 bg-muted rounded-lg text-center h-64 flex items-center justify-center">
        <p className="text-muted-foreground">{HEBREW_TEXT.event.location} (מפה תופיע כאן)</p>
      </div>

      <EventFilters onFilterChange={handleFilterChange} />

      {isLoading ? (
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
            נסו לשנות את תנאי הסינון או בדקו שוב מאוחר יותר.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
