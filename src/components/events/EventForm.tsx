
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, type FieldErrors } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { CalendarIcon, Loader2, ImagePlus, Info, Edit2, PlusCircle, UserX, Users, XCircle } from "lucide-react";
import { format } from "date-fns";
import { he } from 'date-fns/locale';
import React, { useState, useEffect, useRef, useCallback } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import { collection, addDoc, serverTimestamp, Timestamp, doc, updateDoc, getDoc } from "firebase/firestore";
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
import { Card, CardContent, CardHeader, CardTitle as ShadCardTitle } from "@/components/ui/card"; // Renamed to avoid conflict
import { HEBREW_TEXT } from "@/constants/hebrew-text";
import type { PaymentOption, FoodType, ReligionStyle, Event as EventType, UserProfile } from "@/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AddOwnerModal } from "./AddOwnerModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


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
  ownerUids: z.array(z.string()).min(1, { message: "חייב להיות לפחות בעלים אחד לאירוע." }),
  numberOfGuests: z.coerce.number().min(1, { message: "מספר אורחים חייב להיות לפחות 1." }),
  paymentOption: z.enum(["fixed", "payWhatYouWant", "free"], { errorMap: () => ({ message: "יש לבחור אפשרות תשלום."}) }),
  pricePerGuest: z.coerce.number().optional(),
  location: z.string().min(3, { message: "מיקום חייב להכיל לפחות 3 תווים." }),
  locationDisplayName: z.string().optional(),
  dateTime: z.date({ required_error: "תאריך ושעה נדרשים." }),
  description: z.string().min(10, { message: "תיאור חייב להכיל לפחות 10 תווים." }),
  ageRange: z.array(z.number().min(18).max(80)).length(2, { message: "יש לבחור טווח גילאים." }).default([25, 55]),
  foodType: z.enum(["kosherMeat", "kosherDairy", "kosherParve", "notKosher"], { errorMap: () => ({ message: "יש לבחור סוג אוכל."}) }),
  religionStyle: z.enum(["secular", "traditional", "religious", "mixed"], { errorMap: () => ({ message: "יש לבחור סגנון דתי."}) }),
  imageUrl: z.string().optional(),
}).refine(data => {
    if (data.paymentOption === 'fixed') {
        return data.pricePerGuest !== undefined && data.pricePerGuest >= 0;
    }
    return true;
}, {
    message: "יש להזין מחיר לאורח (יכול להיות 0) כאשר אפשרות התשלום היא מחיר קבוע.",
    path: ["pricePerGuest"],
});

type FormSchemaType = z.infer<typeof formSchema>;


function promiseWithTimeout<T>(promise: Promise<T>, ms: number, timeoutError = new Error('Operation timed out after ' + ms + 'ms')): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(timeoutError);
    }, ms);
  });
  return Promise.race([promise, timeout]);
}

const libraries: ("places" | "marker")[] = ['places', 'marker'];

interface EventFormProps {
    initialEventData?: EventType | null;
    isEditMode?: boolean;
    pageTitle?: string;
    submitButtonText?: string;
}

export function EventForm({
    initialEventData = null,
    isEditMode = false,
    pageTitle: propPageTitle,
    submitButtonText: propSubmitButtonText
}: EventFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "שם האירוע שלכם",
      ownerUids: [], 
      numberOfGuests: 10,
      paymentOption: "fixed" as PaymentOption,
      pricePerGuest: 100,
      location: "",
      locationDisplayName: "",
      description: "",
      ageRange: [25, 55],
      foodType: "kosherParve" as FoodType,
      religionStyle: "mixed" as ReligionStyle,
      imageUrl: "",
      dateTime: undefined,
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [trueFormattedAddress, setTrueFormattedAddress] = useState<string | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null);
  const [isEditingName, setIsEditingName] = useState(!isEditMode);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const [ownerProfileDetails, setOwnerProfileDetails] = useState<UserProfile[]>([]);
  const [isLoadingOwnerDetails, setIsLoadingOwnerDetails] = useState(false);
  const [showAddOwnerModal, setShowAddOwnerModal] = useState(false);
  const [ownerToRemove, setOwnerToRemove] = useState<UserProfile | null>(null);

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const locationInputRef = useRef<HTMLInputElement | null>(null);


  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script', // Standardized ID
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
    language: 'iw',
    region: 'IL',
  });

  useEffect(() => {
    const unsubscribe = firebaseAuthInstance.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user && !isEditMode && form.getValues("ownerUids").length === 0) {
        form.setValue("ownerUids", [user.uid]);
      }
    });
    return () => unsubscribe();
  }, [isEditMode, form]); // form is now initialized before this useEffect

  useEffect(() => {
    if (isEditMode && initialEventData) {
      form.reset({
        name: initialEventData.name,
        ownerUids: initialEventData.ownerUids || (currentUser ? [currentUser.uid] : []),
        numberOfGuests: initialEventData.numberOfGuests,
        paymentOption: initialEventData.paymentOption,
        pricePerGuest: initialEventData.pricePerGuest,
        location: initialEventData.locationDisplayName || initialEventData.location,
        locationDisplayName: initialEventData.locationDisplayName,
        dateTime: new Date(initialEventData.dateTime),
        description: initialEventData.description,
        ageRange: initialEventData.ageRange,
        foodType: initialEventData.foodType,
        religionStyle: initialEventData.religionStyle,
        imageUrl: initialEventData.imageUrl,
      });
      if (initialEventData.imageUrl && initialEventData.imageUrl !== "https://placehold.co/800x400.png?text=Event+Cover") {
        setImagePreviewUrl(initialEventData.imageUrl);
      }
      setLatitude(initialEventData.latitude || null);
      setLongitude(initialEventData.longitude || null);
      setTrueFormattedAddress(initialEventData.location || null);
      setIsEditingName(false);
    } else if (!isEditMode && currentUser) {
        if (form.getValues("ownerUids").length === 0) {
            form.setValue("ownerUids", [currentUser.uid]);
        }
    }
  }, [isEditMode, initialEventData, form, currentUser]);

  const watchedOwnerUids = form.watch("ownerUids");

  const fetchOwnerProfiles = useCallback(async (uids: string[]) => {
    if (uids.length === 0) {
      setOwnerProfileDetails([]);
      return;
    }
    setIsLoadingOwnerDetails(true);
    try {
      const fetchedProfiles: UserProfile[] = [];
      for (const uid of uids) {
        if (currentUser && currentUser.uid === uid) {
            fetchedProfiles.push({
                id: uid, firebaseUid: uid, name: currentUser.displayName || "משתמש נוכחי",
                email: currentUser.email || "", profileImageUrl: currentUser.photoURL || ""
            });
            continue;
        }

        const userDocRef = doc(db, "users", uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          fetchedProfiles.push({ id: userDocSnap.id, ...userDocSnap.data() } as UserProfile);
        } else {
          fetchedProfiles.push({ id: uid, firebaseUid: uid, name: `בעלים (UID: ${uid.substring(0,5)}...)`, email: "", profileImageUrl: "" });
        }
      }
      setOwnerProfileDetails(fetchedProfiles);
    } catch (error) {
      console.error("Error fetching owner profiles:", error);
      toast({ title: HEBREW_TEXT.general.error, description: "שגיאה בטעינת פרטי בעלי האירוע.", variant: "destructive" });
    } finally {
      setIsLoadingOwnerDetails(false);
    }
  }, [currentUser, toast]); // Removed ownerProfileDetails from dependencies

  useEffect(() => {
    if (watchedOwnerUids && watchedOwnerUids.length > 0) {
      fetchOwnerProfiles(watchedOwnerUids);
    } else if (currentUser && !isEditMode && (!watchedOwnerUids || watchedOwnerUids.length === 0)) {
        form.setValue("ownerUids", [currentUser.uid]);
    } else {
        setOwnerProfileDetails([]);
    }
  }, [watchedOwnerUids, fetchOwnerProfiles, currentUser, isEditMode, form]);

  const handleAddOwnerToForm = (newOwner: UserProfile) => {
    const currentUids = form.getValues("ownerUids") || [];
    if (!currentUids.includes(newOwner.firebaseUid)) {
      form.setValue("ownerUids", [...currentUids, newOwner.firebaseUid], { shouldValidate: true, shouldDirty: true });
    }
    setShowAddOwnerModal(false);
  };

  const handleConfirmRemoveOwner = (uidToRemove: string) => {
    const currentUids = form.getValues("ownerUids") || [];
    if (currentUids.length <= 1) {
        toast({ title: HEBREW_TEXT.general.error, description: HEBREW_TEXT.event.cannotRemoveLastOwner, variant: "destructive" });
        setOwnerToRemove(null);
        return;
    }
    form.setValue("ownerUids", currentUids.filter(uid => uid !== uidToRemove), { shouldValidate: true, shouldDirty: true });
    setOwnerToRemove(null);
  };


  const paymentOptionValue = form.watch("paymentOption");
  const eventNameValue = form.watch("name");
  const eventDateTimeValue = form.watch("dateTime");
  const pageTitle = propPageTitle || (isEditMode ? HEBREW_TEXT.event.editEvent : HEBREW_TEXT.event.createEventTitle);
  const submitButtonText = propSubmitButtonText || (isEditMode ? HEBREW_TEXT.profile.saveChanges : HEBREW_TEXT.event.createEventButton);

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
        form.setValue("imageUrl", "file-selected-for-upload", { shouldValidate: true });
      } catch (error) {
        console.error("Error compressing image:", error);
        toast({ title: "שגיאה בדחיסת תמונה", description: (error instanceof Error) ? error.message : String(error), variant: "destructive" });
        setImageFile(null);
        setImagePreviewUrl(isEditMode && initialEventData?.imageUrl ? initialEventData.imageUrl : null);
        form.setValue("imageUrl", isEditMode && initialEventData?.imageUrl ? initialEventData.imageUrl : undefined, { shouldValidate: true });
      }
    }
  };

 const handlePlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place && place.geometry && (place.name || place.formatted_address)) {
        const displayName = place.name || place.formatted_address?.split(',')[0] || "מיקום לא ידוע";
        const formattedAddress = place.formatted_address || displayName;

        form.setValue("location", displayName, { shouldValidate: true });
        form.setValue("locationDisplayName", displayName, { shouldValidate: false }); 
        setTrueFormattedAddress(formattedAddress);

        setLatitude(place.geometry.location.lat());
        setLongitude(place.geometry.location.lng());
      } else {
        setTrueFormattedAddress(null); 
        const currentLocationValue = form.getValues("location"); 
        form.setValue("locationDisplayName", currentLocationValue, { shouldValidate: false });
        setLatitude(null);
        setLongitude(null);
      }
    }
  };

  const onAutocompleteLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocompleteInstance;
  };

  const onSubmit = async (values: FormSchemaType) => {
    setIsSubmitting(true);
    setIsUploadingImage(false);
    setImageUploadProgress(null);

    if (!currentUser?.uid) {
      toast({ title: HEBREW_TEXT.general.error, description: "עליך להיות מחובר. מועבר לדף ההתחברות...", variant: "destructive" });
      setIsSubmitting(false);
      router.push('/signin');
      return;
    }
    
    if (!values.ownerUids || values.ownerUids.length === 0) {
        toast({ title: HEBREW_TEXT.general.error, description: "חייב להיות לפחות בעלים אחד לאירוע.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }


    let finalImageUrl = isEditMode && initialEventData?.imageUrl ? initialEventData.imageUrl : `https://placehold.co/800x400.png?text=${encodeURIComponent(values.name)}`;

    if (imageFile) {
      setIsUploadingImage(true);
      const filePath = `event_images/${currentUser.uid}/${Date.now()}-${imageFile.name}`;
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

    const eventDataPayload = {
        ...values,
        ownerUids: values.ownerUids, 
        pricePerGuest: values.paymentOption === 'fixed' ? (values.pricePerGuest ?? 0) : null,
        location: trueFormattedAddress || values.location, 
        locationDisplayName: values.locationDisplayName || values.location.split(',')[0] || "מיקום לא ידוע",
        latitude: latitude,
        longitude: longitude,
        dateTime: Timestamp.fromDate(values.dateTime),
        imageUrl: finalImageUrl,
        updatedAt: serverTimestamp(),
    };

    try {
      await currentUser.getIdToken(true);

      if (isEditMode && initialEventData?.id) {
        const eventDocRef = doc(db, "events", initialEventData.id);
        const { createdAt, ...updatePayload } = eventDataPayload; 
        await promiseWithTimeout(updateDoc(eventDocRef, updatePayload), 15000);
        toast({ title: HEBREW_TEXT.general.success, description: `אירוע "${values.name}" עודכן בהצלחה!` });
        router.push(`/events/${initialEventData.id}`);
      } else {
        const payloadWithCreate = {...eventDataPayload, createdAt: serverTimestamp()};
        const newEventDoc = await promiseWithTimeout(addDoc(collection(db, "events"), payloadWithCreate), 15000);
        toast({ title: HEBREW_TEXT.general.success, description: `אירוע "${values.name}" נוצר בהצלחה!` });
        router.push(`/events/${newEventDoc.id}`);
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} event:`, error);
      let errorMessage = `שגיאה ב${isEditMode ? 'עדכון' : 'יצירת'} האירוע.`;
       if (error instanceof Error && error.message.includes('Operation timed out')) {
           errorMessage = `${isEditMode ? 'עדכון' : 'יצירת'} האירוע ארכה זמן רב מדי. אנא בדוק אם האירוע ${isEditMode ? 'עודכן' : 'נוצר'} או נסה שוב.`;
       } else if (error instanceof Error) {
           errorMessage = `${errorMessage} ${error.message}`;
       }
      toast({ title: HEBREW_TEXT.general.error, description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setIsUploadingImage(false);
    }
  };

  const onInvalidSubmit = (errors: FieldErrors<FormSchemaType>) => {
    console.error("Form validation errors:", errors);
    toast({
      title: HEBREW_TEXT.general.error,
      description: HEBREW_TEXT.general.formValidationFailed,
      variant: "destructive",
    });

    const firstErrorField = Object.keys(errors)[0] as keyof FormSchemaType | undefined;
    if (firstErrorField) {
        const fieldElement = document.querySelector(`[name="${firstErrorField}"], [id^="${firstErrorField}-"], [data-fieldname="${firstErrorField}"]`) as HTMLElement;
        
        if (fieldElement) {
            fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            try {
                if (typeof fieldElement.focus === 'function') {
                    fieldElement.focus({ preventScroll: true });
                }
            } catch (e) {
                console.warn("Could not focus on invalid element:", fieldElement, e);
            }
        }
    }
  };

  const handleCancelEdit = () => {
    if (isEditMode && initialEventData?.id) {
        router.push(`/events/${initialEventData.id}`);
    } else {
        router.back(); // Fallback for other cases, though primarily for edit mode
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
  if (!isLoaded && !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) return <Card className="w-full max-w-3xl mx-auto p-6 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-2" /><p>{HEBREW_TEXT.general.loading} רכיב המיקום...</p></Card>;

  const currentImageToDisplay = imagePreviewUrl || (isEditMode && initialEventData?.imageUrl) || "https://placehold.co/800x400.png?text=Event+Cover";
  const headerTitle = eventNameValue || (isEditMode && initialEventData?.name) || "שם האירוע שלכם";


  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onInvalidSubmit)} className="space-y-8">
        <Card className="w-full max-w-3xl mx-auto overflow-hidden">
          <div className="relative w-full h-64 md:h-80 bg-muted group">
            <Image
              src={currentImageToDisplay}
              alt={headerTitle}
              layout="fill"
              objectFit="cover"
              className="transition-opacity duration-300 ease-in-out"
              data-ai-hint="event cover wedding"
              key={currentImageToDisplay} 
              priority={!isEditMode} 
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
                      <div className="flex items-center">
                        <Input
                          ref={(e) => { field.ref(e); nameInputRef.current = e; }}
                          {...field}
                          onBlur={(e) => { field.onBlur(); setIsEditingName(false); }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); setIsEditingName(false); }
                            else if (e.key === 'Escape') { setIsEditingName(false); }
                          }}
                          className="text-3xl md:text-4xl font-bold bg-transparent border-0 border-b-2 border-white/50 focus:border-white focus:ring-0 p-0 h-auto text-white placeholder-white/70 flex-grow"
                        />
                      </div>
                    )}
                  />
              ) : (
                <div className="flex items-center group/titleedit">
                    <h1
                        className="text-3xl md:text-4xl font-bold cursor-pointer hover:opacity-80 transition-opacity flex-grow"
                        onClick={() => setIsEditingName(true)}
                        title="לחץ לעריכת שם האירוע"
                    >
                    {headerTitle}
                    </h1>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="ml-2 text-white opacity-0 group-hover/titleedit:opacity-100 focus:opacity-100 transition-opacity"
                        onClick={() => setIsEditingName(true)}
                    >
                        <Edit2 className="h-5 w-5"/>
                    </Button>
                </div>
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
            <FormField
                control={form.control}
                name="ownerUids"
                render={() => ( 
                    <FormItem>
                        <div className="flex justify-between items-center mb-2">
                            <FormLabel className="text-lg font-semibold flex items-center">
                                <Users className="ml-2 h-5 w-5 text-primary" />
                                {HEBREW_TEXT.event.owners}
                            </FormLabel>
                            <Button type="button" variant="outline" size="icon" onClick={() => setShowAddOwnerModal(true)} title={HEBREW_TEXT.event.addOwner}>
                                <PlusCircle className="h-5 w-5" />
                            </Button>
                        </div>
                        {isLoadingOwnerDetails && ownerProfileDetails.length === 0 ? (
                            <div className="space-y-2">
                                <div className="flex items-center space-x-3 rtl:space-x-reverse p-2 border rounded-md">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <span className="text-muted-foreground">{HEBREW_TEXT.general.loading}...</span>
                                </div>
                            </div>
                        ) : ownerProfileDetails.length > 0 ? (
                            <div className="space-y-2">
                            {ownerProfileDetails.map((owner) => (
                                <div key={owner.firebaseUid} className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/30">
                                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                                    <Avatar className="h-10 w-10">
                                    <AvatarImage src={owner.profileImageUrl} alt={owner.name} data-ai-hint="owner avatar" />
                                    <AvatarFallback>{owner.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{owner.name}</p>
                                        {owner.email && <p className="text-xs text-muted-foreground">{owner.email}</p>}
                                    </div>
                                </div>
                                {currentUser?.uid !== owner.firebaseUid && (form.getValues("ownerUids") || []).length > 1 && ( 
                                     <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => setOwnerToRemove(owner)}
                                        title={`${HEBREW_TEXT.event.removeOwner} ${owner.name}`}
                                    >
                                        <UserX className="h-4 w-4" />
                                    </Button>
                                )}
                                </div>
                            ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm">
                                {isEditMode ? "לא נמצאו בעלי אירוע. (יש להוסיף לפחות אחד)" : "אתה תהיה הבעלים הראשון של האירוע."}
                            </p>
                        )}
                        <FormMessage />
                    </FormItem>
                )}
            />


            {isEditMode && initialEventData?.imageUrl && !imageFile && (
                <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => <input type="hidden" {...field} value={initialEventData.imageUrl} />}
                />
            )}
            <div className="grid md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="numberOfGuests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{HEBREW_TEXT.event.numberOfGuests}</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="50" {...field} data-fieldname="numberOfGuests" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="paymentOption"
                render={({ field }) => (
                    <FormItem className="space-y-3" data-fieldname="paymentOption">
                    <FormLabel className="text-right">{HEBREW_TEXT.event.paymentOptions}</FormLabel>
                    <FormControl>
                        <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value} 
                        className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4 rtl:md:space-x-reverse pt-2"
                        >
                        {paymentOptions.map(option => (
                            <div key={option.value} className="flex items-center space-x-2 rtl:space-x-reverse">
                                <RadioGroupItem value={option.value} id={`paymentOption-${option.value}`} />
                                <label htmlFor={`paymentOption-${option.value}`} className="font-normal cursor-pointer">
                                    {option.label}
                                </label>
                            </div>
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
                            data-fieldname="pricePerGuest"
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
                        <Input
                            placeholder="התחל להקליד כתובת או שם מקום..."
                            {...field}
                            ref={(e) => {
                                field.ref(e);
                                locationInputRef.current = e;
                            }}
                            onChange={(e) => {
                                field.onChange(e);
                                if (trueFormattedAddress || latitude || longitude) { 
                                    setTrueFormattedAddress(null);
                                    setLatitude(null);
                                    setLongitude(null);
                                }
                                form.setValue("locationDisplayName", e.target.value, { shouldValidate: false });
                            }}
                            data-fieldname="location"
                        />
                      </Autocomplete>
                    </FormControl>
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
                    <Textarea placeholder="ספרו על האירוע, האווירה, מה מיוחד בו..." className="resize-none" rows={4} {...field} data-fieldname="description"/>
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
                    <FormItem data-fieldname="ageRange">
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
                    <FormItem data-fieldname="foodType">
                    <FormLabel>{HEBREW_TEXT.event.foodType}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
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
                    <FormItem data-fieldname="religionStyle">
                    <FormLabel>{HEBREW_TEXT.event.religionStyle}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="בחר סגנון" /></SelectTrigger></FormControl>
                        <SelectContent>
                        {religionStyles.map(style => (<SelectItem key={style.value} value={style.value}>{style.label}</SelectItem>))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )} />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                    type="submit" 
                    className="w-full sm:flex-1 font-body text-lg py-6" 
                    disabled={isSubmitting || isUploadingImage || (!isLoaded && !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) }
                >
                    {(isSubmitting || isUploadingImage) ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                    {(!isLoaded && !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && !isSubmitting && !isUploadingImage) ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                    {submitButtonText}
                </Button>
                {isEditMode && (
                    <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleCancelEdit} 
                        className="w-full sm:flex-1 font-body text-lg py-6"
                        disabled={isSubmitting || isUploadingImage}
                    >
                        <XCircle className="ml-2 h-5 w-5" />
                        {HEBREW_TEXT.general.cancel}
                    </Button>
                )}
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
    {showAddOwnerModal && currentUser && (
        <AddOwnerModal
            isOpen={showAddOwnerModal}
            onOpenChange={setShowAddOwnerModal}
            onOwnerAdded={handleAddOwnerToForm}
            currentOwnerUids={currentUser ? [...(form.getValues("ownerUids") || []), currentUser.uid] : (form.getValues("ownerUids") || [])} 
        />
    )}
    {ownerToRemove && (
        <AlertDialog open={!!ownerToRemove} onOpenChange={() => setOwnerToRemove(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{HEBREW_TEXT.event.confirmRemoveOwnerTitle}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {HEBREW_TEXT.event.confirmRemoveOwnerMessage.replace('{userName}', ownerToRemove.name)}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-row-reverse sm:flex-row-reverse">
                     <AlertDialogCancel onClick={() => setOwnerToRemove(null)}>{HEBREW_TEXT.general.cancel}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => handleConfirmRemoveOwner(ownerToRemove.firebaseUid)}
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                        {HEBREW_TEXT.event.removeOwner}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )}
    </>
  );
}

