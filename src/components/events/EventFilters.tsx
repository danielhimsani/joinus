"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HEBREW_TEXT } from "@/constants/hebrew-text";
import { ListFilter, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { he } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export interface Filters {
  location?: string;
  date?: Date;
  priceRange?: string; // e.g., "0-100", "100-200", "free"
  foodType?: string;
  searchTerm?: string;
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
  const [filters, setFilters] = useState<Filters>(initialFilters);

  const handleInputChange = (name: keyof Filters, value: string | Date | undefined) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange(filters);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 mb-8 bg-card border rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
                <Label htmlFor="searchTerm">{HEBREW_TEXT.general.search}</Label>
                <Input 
                    id="searchTerm"
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
            <div className="lg:col-span-3 flex justify-end items-end pt-4">
                 <Button type="submit" className="w-full md:w-auto font-body">
                    <Search className="ml-2 h-4 w-4" />
                    {HEBREW_TEXT.general.search}
                </Button>
            </div>
        </div>
    </form>
  );
}
