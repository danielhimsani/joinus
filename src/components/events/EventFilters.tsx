
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HEBREW_TEXT } from "@/constants/hebrew-text";
import { ListFilter, Search, Users, ShieldCheck, Heart, Trash2 } from "lucide-react"; // Added Trash2
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { he } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { DialogFooter, DialogClose } from "@/components/ui/dialog";
import type { FoodType, KashrutType, WeddingType } from "@/types";

export interface Filters {
  date?: Date;
  priceRange?: string;
  foodType?: FoodType | "any";
  kashrut?: KashrutType | "any";
  weddingType?: WeddingType | "any";
  minAvailableSpots?: number;
}

interface EventFiltersProps {
  onFilterChange: (filters: Filters) => void;
  initialFilters?: Filters;
}

const priceRanges = [
    { value: "any", label: "כל מחיר" },
    { value: "0-100", label: "₪0 - ₪100" },
    { value: "100-200", label: "₪100 - ₪200" },
    { value: "200+", label: "₪200+" },
];

const foodTypeOptions: { value: FoodType | "any"; label: string }[] = [
    { value: "any", label: "כל סוגי הכיבוד" },
    { value: "meat", label: HEBREW_TEXT.event.meat },
    { value: "dairy", label: HEBREW_TEXT.event.dairy },
    { value: "meatAndDairy", label: HEBREW_TEXT.event.meatAndDairy },
    { value: "vegetarian", label: HEBREW_TEXT.event.vegetarian },
    { value: "vegan", label: HEBREW_TEXT.event.vegan },
    { value: "kosherParve", label: HEBREW_TEXT.event.kosherParve },
];

const kashrutOptions: { value: KashrutType | "any"; label: string }[] = [
    { value: "any", label: "כל רמות הכשרות" },
    { value: "kosher", label: HEBREW_TEXT.event.kosher },
    { value: "notKosher", label: HEBREW_TEXT.event.notKosher },
];

const weddingTypeOptions: { value: WeddingType | "any"; label: string }[] = [
    { value: "any", label: "כל סוגי החתונות" },
    { value: "traditional", label: HEBREW_TEXT.event.traditional },
    { value: "civil", label: HEBREW_TEXT.event.civil },
    { value: "harediWithSeparation", label: HEBREW_TEXT.event.harediWithSeparation },
];


export function EventFilters({ onFilterChange, initialFilters = {} }: EventFiltersProps) {
  const [filters, setFilters] = useState<Filters>(() => ({
    date: initialFilters.date || undefined,
    priceRange: initialFilters.priceRange || "any",
    foodType: initialFilters.foodType || "any",
    kashrut: initialFilters.kashrut || "any",
    weddingType: initialFilters.weddingType || "any",
    minAvailableSpots: initialFilters.minAvailableSpots === undefined ? 1 : initialFilters.minAvailableSpots,
  }));

  useEffect(() => {
    setFilters(prev => ({
      date: initialFilters.date || undefined,
      priceRange: initialFilters.priceRange || "any",
      foodType: initialFilters.foodType || "any",
      kashrut: initialFilters.kashrut || "any",
      weddingType: initialFilters.weddingType || "any",
      minAvailableSpots: initialFilters.minAvailableSpots === undefined ? 1 : initialFilters.minAvailableSpots,
    }));
  }, [initialFilters]);


  const handleInputChange = (name: keyof Filters, value: string | Date | number | undefined) => {
    if (name === "minAvailableSpots" && typeof value === 'string') {
        const numValue = parseInt(value, 10);
        setFilters(prev => ({ ...prev, [name]: isNaN(numValue) || numValue < 1 ? 1 : numValue }));
    } else if (name === "minAvailableSpots" && typeof value === 'number') {
        setFilters(prev => ({ ...prev, [name]: value < 1 ? 1 : value }));
    } else if ( (name === "foodType" || name === "kashrut" || name === "weddingType") && value === "any") {
        setFilters(prev => ({ ...prev, [name]: "any" }));
    }
    else {
        setFilters(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filtersToSubmit = {
        ...filters,
        minAvailableSpots: typeof filters.minAvailableSpots === 'number' ? filters.minAvailableSpots : 1,
    };
    onFilterChange(filtersToSubmit);
  };

  const handleClearFilters = () => {
    const clearedFilters: Filters = {
        date: undefined,
        priceRange: "any",
        foodType: "any",
        kashrut: "any",
        weddingType: "any",
        minAvailableSpots: 1, 
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters); 
  }

  return (
    <form onSubmit={handleSubmit}> 
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6 items-end py-4">
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
                        dir="rtl"
                        >
                        <CalendarIcon className="ml-2 h-4 w-4" />
                        {filters.date ? format(filters.date, "PPP", { locale: he }) : <span>בחר תאריך</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" dir="rtl">
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
                <Select value={filters.priceRange || "any"} onValueChange={(value) => handleInputChange("priceRange", value === "any" ? "any" : value)}>
                    <SelectTrigger id="priceRange" className="w-full mt-1" dir="rtl">
                        <SelectValue placeholder="בחר טווח מחירים" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                        {priceRanges.map(range => (
                            <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
             <div>
                <Label htmlFor="foodType">{HEBREW_TEXT.event.foodType}</Label>
                <Select value={filters.foodType || "any"} onValueChange={(value) => handleInputChange("foodType", value === "any" ? "any" : value as FoodType)}>
                    <SelectTrigger id="foodType" className="w-full mt-1" dir="rtl">
                        <SelectValue placeholder="בחר סוג כיבוד" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                        {foodTypeOptions.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
             <div>
                <Label htmlFor="kashrut">{HEBREW_TEXT.event.kashrut}</Label>
                <Select value={filters.kashrut || "any"} onValueChange={(value) => handleInputChange("kashrut", value === "any" ? "any" : value as KashrutType)}>
                    <SelectTrigger id="kashrut" className="w-full mt-1" dir="rtl">
                        <SelectValue placeholder="בחר רמת כשרות" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                        {kashrutOptions.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="weddingType">{HEBREW_TEXT.event.weddingType}</Label>
                <Select value={filters.weddingType || "any"} onValueChange={(value) => handleInputChange("weddingType", value === "any" ? "any" : value as WeddingType)}>
                    <SelectTrigger id="weddingType" className="w-full mt-1" dir="rtl">
                        <SelectValue placeholder="בחר סוג חתונה" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                        {weddingTypeOptions.map(type => (
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
                        className="w-full pl-10 pr-3" 
                    />
                </div>
            </div>
        </div>
        <DialogFooter className="pt-6 border-t mt-2 sm:justify-between">
            <DialogClose asChild>
                 <Button type="submit" className="font-body">
                    <Search className="ml-2 h-4 w-4" />
                    {HEBREW_TEXT.event.applyFilters}
                </Button>
            </DialogClose>
            <Button type="button" variant="ghost" onClick={handleClearFilters}>
                <Trash2 className="ml-2 h-4 w-4" />
                {HEBREW_TEXT.general.clearFilters}
            </Button>
        </DialogFooter>
    </form>
  );
}
    
