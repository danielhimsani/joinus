
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { CalendarIcon, Loader2, ImagePlus, Info } from "lucide-react";
import { format } from "date-fns";
import { he } from 'date-fns/locale';
import React, { useState, useEffect, useRef } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import { collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, auth as firebaseAuthInstance, storage } from "@/lib/firebase";
import { Autocomplete, useJsApiLoader } from "@react-google-maps/api";
import Image from "next/image";
import imageCompression from 'browser-image-compression';

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
import { Card, CardContent } from "@/components/ui/card"; // CardHeader, CardTitle removed for new design
import { HEBREW_TEXT } from "@/constants/hebrew-text";
import type { PaymentOption, FoodType, ReligionStyle } from "@/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";

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
  location: z.string().min(3, { message: "מיקום חייב להכיל לפחות 3 תווים." }), // Will store formatted_address
  locationDisplayName: z.string().optional(), // Will store place.name
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

function promiseWithTimeout<T>(promise: Promise<T>, ms: number, timeoutError = new Error('Operation timed out after ' + ms + 'ms')): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(timeoutError);
    }, ms);
  });
  return Promise.race([promise, timeout]);
}

const libraries: ("places" | "marker")[] = ['places', 'marker'];

export function EventForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setCurrentUser] = useState<FirebaseUser | null>(null); 
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false); 
  const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const locationInputRef = useRef<HTMLInputElement | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script', // Consistent ID
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries, // Consistent libraries
    language: 'iw',
    region: 'IL',
  });

  useEffect(() => {
    const unsubscribe = firebaseAuthInstance.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "שם האירוע שלכם",
      numberOfGuests: 10,
      paymentOption: "fixed",
      pricePerGuest: 100,
      location: "",
      locationDisplayName: "",
      description: "",
      ageRange: [25, 55], 
      foodType: "kosherParve",
      religionStyle: "mixed",
      imageUrl: "", 
    },
  });

  const paymentOptionValue = form.watch("paymentOption");
  const eventNameValue = form.watch("name");
  const eventDateTimeValue = form.watch("dateTime");

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      toast({ title: "דוחס תמונה...", description: "אנא המתן." });
      try {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);
        toast({ title: "הדחיסה הושלמה", description: "התמונה מוכנה להעלאה." });
        
        setImageFile(compressedFile);
        const previewUrl = URL.createObjectURL(compressedFile);
        setImagePreviewUrl(previewUrl);
      } catch (error) {
        console.error("Error compressing image:", error);
        toast({ title: "שגיאה בדחיסת תמונה", description: (error instanceof Error) ? error.message : String(error), variant: "destructive" });
        setImageFile(null); 
        setImagePreviewUrl(null);
      }
    }
  };

  const handlePlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place) {
        if (place.formatted_address) {
          form.setValue("location", place.formatted_address, { shouldValidate: true });
        }
        if (place.name) {
          form.setValue("locationDisplayName", place.name, { shouldValidate: false });
        } else if (place.formatted_address) {
          // Fallback for display name if place.name is not available
          form.setValue("locationDisplayName", place.formatted_address.split(',')[0], { shouldValidate: false });
        }

        if (place.geometry?.location) {
          setLatitude(place.geometry.location.lat());
          setLongitude(place.geometry.location.lng());
        } else {
          setLatitude(null);
          setLongitude(null);
        }
      } else {
        // Clear coordinates if no place is properly selected or if Autocomplete returns no place
        setLatitude(null);
        setLongitude(null);
        form.setValue("locationDisplayName", "", { shouldValidate: false }); // Also clear display name
      }
    }
  };
  
  const onAutocompleteLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocompleteInstance;
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    setIsUploadingImage(false); 
    setImageUploadProgress(null);

    const firebaseUser = firebaseAuthInstance.currentUser;
    if (!firebaseUser?.uid) {
      toast({ title: HEBREW_TEXT.general.error, description: "עליך להיות מחובר. מועבר לדף ההתחברות...", variant: "destructive" });
      setIsSubmitting(false);
      router.push('/signin');
      return;
    }

    let finalImageUrl = `https://placehold.co/800x400.png?text=${encodeURIComponent(values.name)}`; 

    if (imageFile) {
      setIsUploadingImage(true);
      const filePath = `event_images/${firebaseUser.uid}/${Date.now()}-${imageFile.name}`;
      const imageStorageRef = storageRef(storage, filePath);
      const uploadTask = uploadBytesResumable(imageStorageRef, imageFile);

      try {
        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setImageUploadProgress(progress);
            },
            (error) => {
              console.error("Image upload error:", error);
              toast({ title: "שגיאת העלאת תמונה", description: error.message, variant: "destructive" });
              reject(error);
            },
            async () => {
              finalImageUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      } catch (error) {
        setIsUploadingImage(false);
        setIsSubmitting(false);
        setImageUploadProgress(null);
        return; 
      }
      setIsUploadingImage(false);
      setImageUploadProgress(100); 
    }
    
    try {
      await firebaseUser.getIdToken(true); 
      const eventData = {
        ...values, 
        coupleId: firebaseUser.uid,
        pricePerGuest: values.paymentOption === 'fixed' ? values.pricePerGuest : null,
        location: values.location,
        locationDisplayName: values.locationDisplayName || values.location.split(',')[0] || "מיקום לא ידוע", // Ensure fallback
        latitude: latitude,
        longitude: longitude,
        dateTime: Timestamp.fromDate(values.dateTime),
        imageUrl: finalImageUrl, 
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const addOperation = addDoc(collection(db, "events"), eventData);
      await promiseWithTimeout(addOperation, 15000); 
      
      toast({ title: HEBREW_TEXT.general.success, description: `אירוע "${values.name}" נוצר בהצלחה!` });
      router.push("/events");

    } catch (error) {
      console.error("Error creating event:", error);
      let errorMessage = "שגיאה ביצירת האירוע.";
       if (error instanceof Error && error.message.includes('Operation timed out')) {
           errorMessage = "יצירת האירוע ארכה זמן רב מדי. אנא בדוק אם האירוע נוצר או נסה שוב.";
       } else if (error instanceof Error) {
           errorMessage = `${errorMessage} ${error.message}`;
       }
      toast({ title: HEBREW_TEXT.general.error, description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setIsUploadingImage(false); 
    }
  };
  
  if (loadError) return <Card className="w-full max-w-3xl mx-auto p-6"><p className="text-destructive text-center">{HEBREW_TEXT.map.loadError}</p></Card>;
  if (!isLoaded && !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <Card className="w-full max-w-3xl mx-auto p-6 text-center">
          <Info className="mx-auto h-8 w-8 text-destructive mb-2" />
          <p className="font-semibold text-destructive">{HEBREW_TEXT.map.apiKeyMissing}</p>
          <p className="text-muted-foreground text-sm">לא ניתן לטעון את רכיב המיקום ללא מפתח API של Google Maps.</p>
      </Card>
    );
  }
  if (!isLoaded) return <Card className="w-full max-w-3xl mx-auto p-6 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-2" /><p>{HEBREW_TEXT.general.loading} רכיב המיקום...</p></Card>;

  const displayImageUrl = imagePreviewUrl || "https://placehold.co/800x400.png?text=Event+Cover";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card className="w-full max-w-3xl mx-auto overflow-hidden">
          <div className="relative w-full h-64 md:h-80 bg-muted group">
            <Image
              src={displayImageUrl}
              alt={eventNameValue || "Event cover image"}
              layout="fill"
              objectFit="cover"
              className="transition-opacity duration-300 ease-in-out"
              data-ai-hint="event cover"
              key={displayImageUrl} 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
            
            <Button 
                type="button" 
                variant="outline" 
                size="icon" 
                className="absolute top-4 right-4 z-10 bg-background/80 hover:bg-background text-foreground"
                onClick={() => imageInputRef.current?.click()}
                title="העלה תמונת נושא"
            >
                <ImagePlus className="h-5 w-5" />
            </Button>
            <input
                type="file"
                accept="image/*"
                ref={imageInputRef}
                onChange={handleImageFileChange}
                className="hidden"
            />

            <div className="absolute bottom-4 left-4 right-4 z-10 p-4 text-white">
              {isEditingName ? (
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <Input
                      ref={(e) => {
                        field.ref(e);
                        nameInputRef.current = e;
                      }}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={(e) => {
                        field.onBlur();
                        setIsEditingName(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault(); 
                          setIsEditingName(false);
                        } else if (e.key === 'Escape') {
                           setIsEditingName(false);
                        }
                      }}
                      className="text-3xl md:text-4xl font-bold bg-transparent border-0 border-b-2 border-white/50 focus:border-white focus:ring-0 p-0 h-auto text-white placeholder-white/70"
                    />
                  )}
                />
              ) : (
                <h1 
                    className="text-3xl md:text-4xl font-bold cursor-pointer hover:opacity-80 transition-opacity" 
                    onClick={() => setIsEditingName(true)}
                    title="לחץ לעריכת שם האירוע"
                >
                  {eventNameValue || "שם האירוע שלכם"}
                </h1>
              )}
              <Popover>
                <PopoverTrigger asChild>
                    <p 
                        className="mt-2 text-sm md:text-base opacity-90 cursor-pointer hover:opacity-100 transition-opacity flex items-center"
                        title="לחץ לעריכת תאריך ושעה"
                    >
                        <CalendarIcon className="ml-1.5 h-4 w-4" /> 
                        {eventDateTimeValue ? format(eventDateTimeValue, "EEEE, d MMMM yyyy, HH:mm", { locale: he }) : "בחר תאריך ושעה"}
                    </p>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Controller
                        control={form.control}
                        name="dateTime"
                        render={({ field }) => (
                            <>
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                                    initialFocus
                                    locale={he}
                                />
                                <div className="p-2 border-t">
                                <Input 
                                    type="time" 
                                    defaultValue={field.value ? format(field.value, 'HH:mm') : "19:00"} 
                                    onChange={(e) => {
                                        const [hours, minutes] = e.target.value.split(':').map(Number);
                                        const newDate = field.value ? new Date(field.value) : new Date();
                                        newDate.setHours(hours);
                                        newDate.setMinutes(minutes);
                                        newDate.setSeconds(0);
                                        newDate.setMilliseconds(0);
                                        field.onChange(newDate);
                                    }} 
                                    className="w-full"
                                />
                                </div>
                                {form.formState.errors.dateTime && <FormMessage className="p-2 text-sm">{form.formState.errors.dateTime.message}</FormMessage>}
                            </>
                        )}
                    />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {isUploadingImage && imageUploadProgress !== null && (
            <div className="p-4">
              <Progress value={imageUploadProgress} className="w-full h-2" />
              <p className="text-sm text-muted-foreground text-center mt-1">
                {imageUploadProgress < 100 ? `מעלה תמונה... ${imageUploadProgress.toFixed(0)}%` : "התמונה הועלתה!"}
              </p>
            </div>
          )}

          <CardContent className="pt-6 space-y-8">
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
                name="paymentOption"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                    <FormLabel className="text-right">{HEBREW_TEXT.event.paymentOptions}</FormLabel>
                    <FormControl>
                        <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4 rtl:md:space-x-reverse pt-2"
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
            </div>

            {paymentOptionValue === 'fixed' && (
                 <FormField
                    control={form.control}
                    name="pricePerGuest"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>{HEBREW_TEXT.event.pricePerGuest} (בש"ח)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="150"
                            value={field.value === undefined || field.value === null || isNaN(field.value as number) ? '' : String(field.value)}
                            onChange={e => {
                              const rawValue = e.target.value;
                              if (rawValue === '') {
                                field.onChange(undefined); 
                              } else {
                                const num = parseFloat(rawValue);
                                field.onChange(isNaN(num) ? undefined : num); 
                              }
                            }}
                            onBlur={field.onBlur}
                            ref={field.ref}
                            name={field.name}
                          />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            )}
            
            {isLoaded && (
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{HEBREW_TEXT.event.location}</FormLabel>
                    <FormControl>
                      <Autocomplete
                        onLoad={onAutocompleteLoad}
                        onPlaceChanged={handlePlaceChanged}
                        options={{ componentRestrictions: { country: "il" }, fields: ["name", "formatted_address", "geometry.location"] }}
                      >
                        <Input placeholder="התחל להקליד כתובת או שם מקום..." {...field} ref={locationInputRef} />
                      </Autocomplete>
                    </FormControl>
                    {latitude && longitude && <FormDescription>קואורדינטות: {latitude.toFixed(6)}, {longitude.toFixed(6)}</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{HEBREW_TEXT.event.description}</FormLabel>
                  <FormControl>
                    <Textarea placeholder="ספרו על האירוע, האווירה, מה מיוחד בו..." className="resize-none" rows={4} {...field} />
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
                         <Slider value={field.value || [18, 80]} onValueChange={field.onChange} min={18} max={80} step={1} className={cn("py-3")} />
                      </FormControl>
                      <FormDescription className="text-center pt-1">טווח גילאים נבחר: {field.value && field.value.length === 2 ? `${field.value[0]} - ${field.value[1]}` : '18 - 80'}</FormDescription>
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
                        <FormControl><SelectTrigger><SelectValue placeholder="בחר סוג אוכל" /></SelectTrigger></FormControl>
                        <SelectContent>
                        {foodTypes.map(type => (<SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )} />
                <FormField
                control={form.control}
                name="religionStyle"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>{HEBREW_TEXT.event.religionStyle}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="בחר סגנון" /></SelectTrigger></FormControl>
                        <SelectContent>
                        {religionStyles.map(style => (<SelectItem key={style.value} value={style.value}>{style.label}</SelectItem>))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )} />
            </div>
            <Button type="submit" className="w-full font-body text-lg py-6" disabled={isSubmitting || isUploadingImage || (!isLoaded && !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) }>
              {(isSubmitting || isUploadingImage) ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              {(!isLoaded && !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && !isSubmitting && !isUploadingImage) ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              {HEBREW_TEXT.event.createEventButton}
            </Button>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
