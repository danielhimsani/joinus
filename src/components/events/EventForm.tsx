
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { CalendarIcon, Upload, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { he } from 'date-fns/locale';
import React, { useState, useEffect, useCallback } from "react";


import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card"; // CardHeader removed
import { HEBREW_TEXT } from "@/constants/hebrew-text";
import type { PaymentOption, FoodType, ReligionStyle } from "@/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";

const foodTypes: { value: FoodType; label: string }[] = [
  { value: "kosherMeat", label: HEBREW_TEXT.event.kosherMeat },
  { value: "kosherDairy", label: HEBREW_TEXT.event.kosherDairy },
  { value: "kosherParve", label: HEBREW_TEXT.event.kosherParve },
  { value: "notKosher", label: HEBREW_TEXT.event.notKosher },
];

const religionStyles: { value: ReligionStyle; label: string }[] = [
  { value: "secular", label: "חילוני" },
  { value: "traditional", label: "מסורתי" },
  { value: "religious", label: "דתי" },
  { value: "mixed", label: "מעורב" },
];

const paymentOptions: { value: PaymentOption; label: string }[] = [
    { value: "fixed", label: HEBREW_TEXT.event.pricePerGuest },
    { value: "payWhatYouWant", label: HEBREW_TEXT.event.payWhatYouWant },
    { value: "free", label: HEBREW_TEXT.event.free },
];


const formSchema = z.object({
  name: z.string().min(3, { message: "שם אירוע חייב להכיל לפחות 3 תווים." }),
  numberOfGuests: z.coerce.number().min(1, { message: "מספר אורחים חייב להיות לפחות 1." }),
  paymentOption: z.enum(["fixed", "payWhatYouWant", "free"]),
  pricePerGuest: z.coerce.number().optional(),
  location: z.string().min(3, { message: "מיקום חייב להכיל לפחות 3 תווים." }),
  dateTime: z.date({ required_error: "תאריך ושעה נדרשים." }),
  description: z.string().min(10, { message: "תיאור חייב להכיל לפחות 10 תווים." }),
  ageRange: z.array(z.number().min(18).max(80)).length(2, { message: "יש לבחור טווח גילאים." }).default([25, 55]),
  foodType: z.enum(["kosherMeat", "kosherDairy", "kosherParve", "notKosher"]),
  religionStyle: z.enum(["secular", "traditional", "religious", "mixed"]),
  imageUrl: z.string().optional(),
}).refine(data => {
    if (data.paymentOption === 'fixed') {
        return data.pricePerGuest !== undefined && data.pricePerGuest > 0;
    }
    return true;
}, {
    message: "יש להזין מחיר לאורח כאשר אפשרות התשלום היא מחיר קבוע.",
    path: ["pricePerGuest"],
});


// Mock suggestions - replace with actual API call
const mockLocationSuggestions = [
    "אולמי 'הדקל', תל אביב",
    "אולמי 'הפאר', ירושלים",
    "גן אירועים 'החורשה', חיפה",
    "לופט 'אורבן', תל אביב",
    "חוף 'ניצנים', אשקלון"
];

export function EventForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [locationInput, setLocationInput] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      numberOfGuests: 10,
      paymentOption: "fixed",
      pricePerGuest: 100,
      location: "",
      description: "",
      ageRange: [25, 55], 
      foodType: "kosherParve",
      religionStyle: "mixed",
      imageUrl: "",
    },
  });

  const paymentOptionValue = form.watch("paymentOption");

  const fetchSuggestions = useCallback((query: string) => {
    if (!query.trim()) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setIsSuggestionsLoading(true);
    console.log("Simulating API call for:", query);
    setTimeout(() => {
      const filteredSuggestions = mockLocationSuggestions.filter(s =>
        s.toLowerCase().includes(query.toLowerCase())
      );
      setLocationSuggestions(filteredSuggestions);
      setIsSuggestionsLoading(false);
      setShowSuggestions(true);
    }, 500);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (locationInput && locationInput !== form.getValues("location")) {
        fetchSuggestions(locationInput);
      } else if (!locationInput) {
        setLocationSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [locationInput, fetchSuggestions, form]);

  const handleSuggestionClick = (suggestion: string) => {
    form.setValue("location", suggestion);
    setLocationInput(suggestion);
    setLocationSuggestions([]);
    setShowSuggestions(false);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log("Event creation data:", values);
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast({
      title: HEBREW_TEXT.general.success,
      description: `אירוע "${values.name}" נוצר בהצלחה!`,
    });
    router.push("/events");
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      {/* CardHeader removed as it was empty */}
      <CardContent className="pt-6"> {/* Added pt-6 to CardContent to maintain similar spacing as before when CardHeader was present */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{HEBREW_TEXT.event.eventName}</FormLabel>
                  <FormControl>
                    <Input placeholder="לדוגמה: החתונה של דנה ויוסי" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="numberOfGuests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{HEBREW_TEXT.event.numberOfGuests}</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateTime"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{HEBREW_TEXT.event.dateTime}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-right font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPPP, HH:mm", { locale: he })
                            ) : (
                              <span>{HEBREW_TEXT.event.selectDate}</span>
                            )}
                            <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                          initialFocus
                          locale={he}
                        />
                        <div className="p-2 border-t">
                           <Input type="time" defaultValue={field.value ? format(field.value, 'HH:mm') : "19:00"} onChange={(e) => {
                               const [hours, minutes] = e.target.value.split(':').map(Number);
                               const newDate = new Date(field.value || new Date());
                               newDate.setHours(hours);
                               newDate.setMinutes(minutes);
                               field.onChange(newDate);
                           }} />
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
                control={form.control}
                name="paymentOption"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                    <FormLabel className="text-right">{HEBREW_TEXT.event.paymentOptions}</FormLabel>
                    <FormControl>
                        <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1 md:flex-row md:space-y-0 md:space-x-4 rtl:md:space-x-reverse"
                        >
                        {paymentOptions.map(option => (
                            <FormItem key={option.value} className="flex items-center space-x-3 space-y-0 rtl:space-x-reverse">
                                <FormControl>
                                    <RadioGroupItem value={option.value} />
                                </FormControl>
                                <FormLabel className="font-normal">
                                    {option.label}
                                </FormLabel>
                            </FormItem>
                        ))}
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />

            {paymentOptionValue === 'fixed' && (
                 <FormField
                    control={form.control}
                    name="pricePerGuest"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>{HEBREW_TEXT.event.pricePerGuest} (בש"ח)</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="150" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            )}

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{HEBREW_TEXT.event.location}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="התחל להקליד כתובת או שם מקום..."
                        value={locationInput}
                        onChange={(e) => {
                            setLocationInput(e.target.value);
                        }}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        onFocus={() => {
                            if (locationInput && locationSuggestions.length > 0) {
                                setShowSuggestions(true);
                            } else if (locationInput) {
                                fetchSuggestions(locationInput); 
                            }
                        }}
                        autoComplete="off"
                      />
                      {isSuggestionsLoading && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {showSuggestions && locationSuggestions.length > 0 && (
                        <ul className="absolute z-10 w-full bg-background border border-input rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                          {locationSuggestions.map((suggestion, index) => (
                            <li
                              key={index}
                              className="px-3 py-2 text-sm hover:bg-accent cursor-pointer"
                              onMouseDown={() => handleSuggestionClick(suggestion)}
                            >
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    עם שירות מיקום אמיתי, תוכלו לחפש כתובות מדויקות.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{HEBREW_TEXT.event.description}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="ספרו על האירוע, האווירה, מה מיוחד בו..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid md:grid-cols-3 gap-8 items-start">
                <FormField
                  control={form.control}
                  name="ageRange"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{HEBREW_TEXT.event.ageRange}</FormLabel>
                      <FormControl>
                         <Slider
                            value={field.value || [18, 80]} // Fallback if field.value is not a proper array
                            onValueChange={field.onChange}
                            min={18}
                            max={80}
                            step={1}
                            className={cn("py-3")}
                        />
                      </FormControl>
                      <FormDescription className="text-center pt-1">
                         טווח גילאים נבחר: {field.value && field.value.length === 2 ? `${field.value[0]} - ${field.value[1]}` : '18 - 80'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                control={form.control}
                name="foodType"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>{HEBREW_TEXT.event.foodType}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="בחר סוג אוכל" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {foodTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="religionStyle"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>{HEBREW_TEXT.event.religionStyle}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="בחר סגנון" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {religionStyles.map(style => (
                            <SelectItem key={style.value} value={style.value}>{style.label}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{HEBREW_TEXT.event.uploadImage} ({HEBREW_TEXT.general.optional})</FormLabel>
                        <FormControl>
                            <Button type="button" variant="outline" className="w-full" onClick={() => alert("File upload functionality to be implemented.")}>
                                <Upload className="ml-2 h-4 w-4" />
                                בחר קובץ
                            </Button>
                        </FormControl>
                        {field.value && <FormDescription>תמונה נבחרה: {field.value.split('/').pop()}</FormDescription>}
                        <FormMessage />
                    </FormItem>
                )} />


            <Button type="submit" className="w-full font-body text-lg py-6">
              {HEBREW_TEXT.event.createEventButton}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

    