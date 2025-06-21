import type { Event } from '@/types';
import type { Filters } from '@/components/events/EventFilters';
import type { FoodType, KashrutType, WeddingType } from "@/types";

export function applyEventFilters(
  events: Event[],
  filters: Filters,
  searchQuery: string,
  approvedCountsMap: Map<string, number>,
  appliedEventIds: string[],
  currentUserId: string | null
): Event[] {
    let eventsToFilter = [...events];
    const now = new Date();

    // Default filters that apply to both list and map
    // 1. Filter out past events
    eventsToFilter = eventsToFilter.filter(event => new Date(event.dateTime) >= now);

    // 2. Filter out user's own events
    if (currentUserId) {
        eventsToFilter = eventsToFilter.filter(event => !event.ownerUids.includes(currentUserId));
    }
    
    // Advanced filters from UI/query params
    // 3. Filter out events the user has already applied to (if toggled off)
    if (!filters.showAppliedEvents && appliedEventIds.length > 0) {
        eventsToFilter = eventsToFilter.filter(event => !appliedEventIds.includes(event.id));
    }
    
    // 4. Filter by minimum available spots
    if (filters.minAvailableSpots !== undefined && filters.minAvailableSpots > 0) {
        eventsToFilter = eventsToFilter.filter(event => {
            const approvedCount = approvedCountsMap.get(event.id) || 0;
            const availableSpots = event.numberOfGuests - approvedCount;
            return availableSpots >= filters.minAvailableSpots!;
        });
    } else { // Also filter out full events by default if minAvailableSpots is not set to a specific value
         eventsToFilter = eventsToFilter.filter(event => {
            const approvedCount = approvedCountsMap.get(event.id) || 0;
            const availableSpots = event.numberOfGuests - approvedCount;
            return availableSpots > 0;
        });
    }

    // 5. Filter by search query
    if (searchQuery.trim()) {
      const queryText = searchQuery.toLowerCase().trim();
      eventsToFilter = eventsToFilter.filter(event =>
          (event.name?.toLowerCase() || '').includes(queryText) ||
          (event.description?.toLowerCase() || '').includes(queryText) ||
          (event.locationDisplayName?.toLowerCase() || '').includes(queryText) ||
          (event.location?.toLowerCase() || '').includes(queryText)
      );
    }

    // 6. Filter by date
    if (filters.date) {
      const filterDateString = filters.date.toDateString();
      eventsToFilter = eventsToFilter.filter(event => {
          return new Date(event.dateTime).toDateString() === filterDateString;
      });
    }

    // 7. Filter by price range
    if (filters.priceRange && filters.priceRange !== "any") {
        if (filters.priceRange === "payWhatYouWant") {
            eventsToFilter = eventsToFilter.filter(e => e.paymentOption === "payWhatYouWant");
        } else if (filters.priceRange === "fixed_0-100") {
            eventsToFilter = eventsToFilter.filter(e => e.paymentOption === "fixed" && e.pricePerGuest != null && e.pricePerGuest >= 0 && e.pricePerGuest <= 100);
        } else if (filters.priceRange === "fixed_101-200") {
            eventsToFilter = eventsToFilter.filter(e => e.paymentOption === "fixed" && e.pricePerGuest != null && e.pricePerGuest >= 101 && e.pricePerGuest <= 200);
        } else if (filters.priceRange === "fixed_201+") {
            eventsToFilter = eventsToFilter.filter(e => e.paymentOption === "fixed" && e.pricePerGuest != null && e.pricePerGuest >= 201);
        }
    }

    // 8. Filter by food type
     if (filters.foodType && filters.foodType !== "any") {
      eventsToFilter = eventsToFilter.filter(event => event.foodType === filters.foodType);
    }

    // 9. Filter by kashrut
    if (filters.kashrut && filters.kashrut !== "any") {
      eventsToFilter = eventsToFilter.filter(event => event.kashrut === filters.kashrut);
    }

    // 10. Filter by wedding type
    if (filters.weddingType && filters.weddingType !== "any") {
      eventsToFilter = eventsToFilter.filter(event => event.weddingType === filters.weddingType);
    }
    
    return eventsToFilter;
}
