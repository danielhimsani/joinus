
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HEBREW_TEXT } from "@/constants/hebrew-text";
import { ListFilter, Search, Users } from "lucide-react"; // Added Users icon
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { he } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { DialogFooter, DialogClose } from "@/components/ui/dialog";

export interface Filters {
  location?: string;
  date?: Date;
  priceRange?: string;
  foodType?: string;
  searchTerm?: string;
  minAvailableSpots?: number; // New filter
}

interface EventFiltersProps {
  onFilterChange: (filters: Filters) => void;
  initialFilters?: Filters;
}

const priceRanges = [
    { value: "any", label: "כל מחיר" },
    { value: "free", label: HEBREW_TEXT.event.free },
    { value: "0-100", label: "₪0 - ₪100" },
    { value: "100-200", label: "₪100 - ₪200" },
    { value: "200+", label: "₪200+" },
];

const foodTypes = [
    { value: "any", label: "כל סוגי האוכל" },
    { value: "kosherMeat", label: HEBREW_TEXT.event.kosherMeat },
    { value: "kosherDairy", label: HEBREW_TEXT.event.kosherDairy },
    { value: "kosherParve", label: HEBREW_TEXT.event.kosherParve },
    { value: "notKosher", label: HEBREW_TEXT.event.notKosher },
];


export function EventFilters({ onFilterChange, initialFilters = {} }: EventFiltersProps) {
  const [filters, setFilters] = useState<Filters>(() => ({
    searchTerm: initialFilters.searchTerm || undefined,
    location: initialFilters.location || undefined,
    date: initialFilters.date || undefined,
    priceRange: initialFilters.priceRange || "any",
    foodType: initialFilters.foodType || "any",
    minAvailableSpots: initialFilters.minAvailableSpots === undefined ? 1 : initialFilters.minAvailableSpots,
  }));

  useEffect(() => {
    // Sync with initialFilters if they change, e.g. when filters are cleared from parent
    setFilters(prev => ({
      searchTerm: initialFilters.searchTerm || undefined,
      location: initialFilters.location || undefined,
      date: initialFilters.date || undefined,
      priceRange: initialFilters.priceRange || "any",
      foodType: initialFilters.foodType || "any",
      minAvailableSpots: initialFilters.minAvailableSpots === undefined ? 1 : initialFilters.minAvailableSpots,
    }));
  }, [initialFilters]);


  const handleInputChange = (name: keyof Filters, value: string | Date | number | undefined) => {
    if (name === "minAvailableSpots" && typeof value === 'string') {
        const numValue = parseInt(value, 10);
        setFilters(prev => ({ ...prev, [name]: isNaN(numValue) || numValue < 1 ? 1 : numValue }));
    } else if (name === "minAvailableSpots" && typeof value === 'number') {
        setFilters(prev => ({ ...prev, [name]: value < 1 ? 1 : value }));
    }
    else {
        setFilters(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure minAvailableSpots is a number or undefined
    const filtersToSubmit = {
        ...filters,
        minAvailableSpots: typeof filters.minAvailableSpots === 'number' ? filters.minAvailableSpots : 1,
    };
    onFilterChange(filtersToSubmit);
  };

  const handleClearFilters = () => {
    const clearedFilters: Filters = {
        searchTerm: undefined,
        location: undefined,
        date: undefined,
        priceRange: "any",
        foodType: "any",
        minAvailableSpots: 1, // Reset to default
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters); 
  }

  return (
    <form onSubmit={handleSubmit}> 
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6 items-end py-4">
            <div>
                <Label htmlFor="advancedSearchTerm">{HEBREW_TEXT.general.search}</Label>
                <Input 
                    id="advancedSearchTerm"
                    placeholder="שם אירוע, מארגן..."
                    value={filters.searchTerm || ""}
                    onChange={(e) => handleInputChange("searchTerm", e.target.value)}
                    className="mt-1"
                />
            </div>
            <div>
                <Label htmlFor="location">{HEBREW_TEXT.event.location}</Label>
                <Input 
                    id="location"
                    placeholder="לדוגמה: תל אביב, צפון..."
                    value={filters.location || ""}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                    className="mt-1"
                />
            </div>
            <div>
                <Label htmlFor="date">{HEBREW_TEXT.event.dateTime}</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-full justify-start text-right font-normal mt-1",
                            !filters.date && "text-muted-foreground"
                        )}
                        >
                        <CalendarIcon className="ml-2 h-4 w-4" />
                        {filters.date ? format(filters.date, "PPP", { locale: he }) : <span>בחר תאריך</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                        mode="single"
                        selected={filters.date}
                        onSelect={(date) => handleInputChange("date", date)}
                        initialFocus
                        locale={he}
                        />
                    </PopoverContent>
                </Popover>
            </div>
             <div>
                <Label htmlFor="priceRange">{HEBREW_TEXT.event.filterByPrice}</Label>
                <Select value={filters.priceRange || "any"} onValueChange={(value) => handleInputChange("priceRange", value === "any" ? undefined : value)}>
                    <SelectTrigger id="priceRange" className="w-full mt-1">
                        <SelectValue placeholder="בחר טווח מחירים" />
                    </SelectTrigger>
                    <SelectContent>
                        {priceRanges.map(range => (
                            <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
             <div>
                <Label htmlFor="foodType">{HEBREW_TEXT.event.foodType}</Label>
                <Select value={filters.foodType || "any"} onValueChange={(value) => handleInputChange("foodType", value === "any" ? undefined : value)}>
                    <SelectTrigger id="foodType" className="w-full mt-1">
                        <SelectValue placeholder="בחר סוג אוכל" />
                    </SelectTrigger>
                    <SelectContent>
                        {foodTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="minAvailableSpots">
                   {HEBREW_TEXT.event.minAvailableSpotsFilterLabel}
                </Label>
                <div className="relative mt-1">
                     <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input 
                        id="minAvailableSpots"
                        type="number"
                        min="1"
                        placeholder="1"
                        value={filters.minAvailableSpots === undefined ? '' : filters.minAvailableSpots}
                        onChange={(e) => handleInputChange("minAvailableSpots", e.target.value)}
                        className="w-full pl-10 pr-3" // Added padding for icon
                    />
                </div>
            </div>
        </div>
        <DialogFooter className="pt-6 border-t mt-2">
            <Button type="button" variant="ghost" onClick={handleClearFilters}>
                {HEBREW_TEXT.general.clearFilters}
            </Button>
            <DialogClose asChild>
                 <Button type="submit" className="font-body">
                    <Search className="ml-2 h-4 w-4" />
                    {HEBREW_TEXT.event.applyFilters}
                </Button>
            </DialogClose>
        </DialogFooter>
    </form>
  );
}

    