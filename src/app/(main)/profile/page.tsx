
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { HEBREW_TEXT } from "@/constants/hebrew-text";
import type { UserProfile, Event as EventType, EventChat } from "@/types";
import { Camera, Edit3, ShieldCheck, UploadCloud, Loader2, LogOut, Moon, Sun, CalendarDays, MapPin, Cake, Users, FileText, Gavel, Contact as UserPlaceholderIcon, BellRing, Activity, ThumbsUp, ThumbsDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { onAuthStateChanged, type User as FirebaseUser, updateProfile } from "firebase/auth";
import { auth as firebaseAuthInstance, db, storage } from "@/lib/firebase";
import { collection, query, where, getDocs, Timestamp, doc, getDoc, setDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import imageCompression from 'browser-image-compression';
import { format as formatDateFns } from 'date-fns';
import { he } from 'date-fns/locale';
import { safeToDate, calculateAge } from '@/lib/dateUtils';
import { getDisplayInitial } from '@/lib/textUtils';
import { requestNotificationPermissionAndSaveToken, type NotificationSetupResult } from '@/lib/firebase-messaging';

const profileFormSchema = z.object({
  name: z.string().min(2, { message: HEBREW_TEXT.profile.nameMinLengthError }),
  email: z.string().email({ message: HEBREW_TEXT.auth.emailInvalid }).optional().or(z.literal("")),
  birthday: z.string().optional(),
  bio: z.string().max(300, { message: "ביו יכול להכיל עד 300 תווים."}).optional(),
  phone: z.string().refine(val => val === '' || !val || /^0\d([\d]{0,1})([-]{0,1})\d{7}$/.test(val), {
    message: "מספר טלפון לא תקין. אם הוזן, חייב להיות בפורמט ישראלי תקין."
  }).optional(),
});


export default function ProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authProviderId, setAuthProviderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [ownedEvents, setOwnedEvents] = useState<EventType[]>([]);
  const [isLoadingOwnedEvents, setIsLoadingOwnedEvents] = useState(false);
  const [calculatedAgeState, setCalculatedAgeState] = useState<number | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const [eventsAttendedCount, setEventsAttendedCount] = useState<number | null>(null);
  const [lastEventAttendedDate, setLastEventAttendedDate] = useState<Date | null>(null);
  const [guestsHostedCount, setGuestsHostedCount] = useState<number | null>(null);
  const [positiveRatingsCount, setPositiveRatingsCount] = useState<number | null>(null);
  const [negativeRatingsCount, setNegativeRatingsCount] = useState<number | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);


  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
        name: "",
        email: "",
        birthday: "",
        bio: "",
        phone: "",
    },
  });

  const fetchUserStats = useCallback(async (currentFbUser: FirebaseUser) => {
    if (!currentFbUser) return;
    setIsLoadingStats(true);
    const now = new Date();
    const eventDateMap = new Map<string, Date>();

    try {
        // Step 1: Gather all potentially relevant event IDs
        const allEventIds = new Set<string>();

        const attendedChatsQuery = query(
            collection(db, "eventChats"),
            where("guestUid", "==", currentFbUser.uid),
            where("status", "==", "request_approved")
        );
        const attendedChatsSnapshot = await getDocs(attendedChatsQuery);
        attendedChatsSnapshot.forEach(chatDoc => allEventIds.add((chatDoc.data() as EventChat).eventId));

        const eventsRef = collection(db, "events");
        const hostedEventsQuery = query(eventsRef, where("ownerUids", "array-contains", currentFbUser.uid));
        const hostedEventsSnapshot = await getDocs(hostedEventsQuery);
        hostedEventsSnapshot.forEach(eventDoc => allEventIds.add(eventDoc.id));

        const ratingsQuery = query(collection(db, "userEventGuestRatings"), where("guestUid", "==", currentFbUser.uid));
        const ratingsSnapshot = await getDocs(ratingsQuery);
        ratingsSnapshot.forEach(ratingDoc => allEventIds.add(ratingDoc.data().eventId as string));

        // Step 2: Fetch event details (dateTime) for these IDs
        if (allEventIds.size > 0) {
            const MAX_IDS_PER_QUERY = 30;
            const eventIdArray = Array.from(allEventIds);
            for (let i = 0; i < eventIdArray.length; i += MAX_IDS_PER_QUERY) {
                const chunkEventIds = eventIdArray.slice(i, i + MAX_IDS_PER_QUERY);
                if (chunkEventIds.length > 0) {
                    const eventsDetailsQuery = query(collection(db, "events"), where("__name__", "in", chunkEventIds));
                    const eventsDetailsSnapshot = await getDocs(eventsDetailsQuery);
                    eventsDetailsSnapshot.forEach(eventDoc => {
                        eventDateMap.set(eventDoc.id, safeToDate(eventDoc.data()?.dateTime));
                    });
                }
            }
        }
        
        // Step 3: Calculate stats based on past events

        // Events Attended Count & Last Event Attended Date
        let attendedCount = 0;
        let latestAttendedDate: Date | null = null;
        attendedChatsSnapshot.forEach(chatDoc => {
            const eventId = (chatDoc.data() as EventChat).eventId;
            const eventDate = eventDateMap.get(eventId);
            if (eventDate && eventDate < now) {
                attendedCount++;
                if (!latestAttendedDate || eventDate > latestAttendedDate) {
                    latestAttendedDate = eventDate;
                }
            }
        });
        setEventsAttendedCount(attendedCount);
        setLastEventAttendedDate(latestAttendedDate);

        // Guests Hosted Count
        let totalHosted = 0;
        const hostedPastEventIds: string[] = [];
        hostedEventsSnapshot.forEach(eventDoc => {
            const eventDate = eventDateMap.get(eventDoc.id);
            if (eventDate && eventDate < now) {
                hostedPastEventIds.push(eventDoc.id);
            }
        });
        if (hostedPastEventIds.length > 0) {
            const guestCountPromises = hostedPastEventIds.map(async (eventId) => {
                const approvedGuestsQuery = query(
                    collection(db, "eventChats"),
                    where("eventId", "==", eventId),
                    where("status", "==", "request_approved")
                );
                const approvedGuestsSnapshot = await getDocs(approvedGuestsQuery);
                return approvedGuestsSnapshot.size;
            });
            const guestCounts = await Promise.all(guestCountPromises);
            totalHosted = guestCounts.reduce((sum, count) => sum + count, 0);
        }
        setGuestsHostedCount(totalHosted);

        // Positive/Negative Ratings Count
        let positive = 0;
        let negative = 0;
        ratingsSnapshot.forEach(ratingDoc => {
            const eventId = ratingDoc.data().eventId as string;
            const eventDate = eventDateMap.get(eventId);
            if (eventDate && eventDate < now) {
                if (ratingDoc.data().ratingType === 'positive') positive++;
                if (ratingDoc.data().ratingType === 'negative') negative++;
            }
        });
        setPositiveRatingsCount(positive);
        setNegativeRatingsCount(negative);

    } catch (error) {
        console.error("Error fetching user stats:", error);
        toast({ title: HEBREW_TEXT.general.error, description: "שגיאה בטעינת סטטיסטיקות משתמש.", variant: "destructive" });
    } finally {
        setIsLoadingStats(false);
    }
  }, [toast]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuthInstance, async (fbUser) => {
      setIsLoading(true);
      if (fbUser) {
        setFirebaseUser(fbUser);
        setAuthProviderId(fbUser.providerData[0]?.providerId || null);

        let firestoreProfileData = { bio: "", phone: "", birthday: "", name: fbUser.displayName || "משתמש", email: fbUser.email || "" };
        try {
            const userDocRef = doc(db, "users", fbUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const data = userDocSnap.data();
                let localPhoneNumber = data.phone || "";
                if (localPhoneNumber && typeof localPhoneNumber === 'string' && localPhoneNumber.startsWith("+972")) {
                    localPhoneNumber = "0" + localPhoneNumber.substring(4);
                }
                firestoreProfileData = {
                    name: data.name || fbUser.displayName || "משתמש",
                    email: data.email || fbUser.email || "",
                    bio: data.bio || "",
                    phone: localPhoneNumber,
                    birthday: data.birthday || "",
                };
            } else {
                firestoreProfileData.email = fbUser.email || "";
            }
        } catch (error) {
            console.error("Error fetching user data from Firestore:", error);
            toast({ title: HEBREW_TEXT.general.error, description: "שגיאה בטעינת פרטי פרופיל מורחבים.", variant: "destructive" });
        }

        const profileData: UserProfile = {
          id: fbUser.uid,
          firebaseUid: fbUser.uid,
          name: firestoreProfileData.name,
          email: firestoreProfileData.email,
          profileImageUrl: fbUser.photoURL,
          bio: firestoreProfileData.bio,
          phone: firestoreProfileData.phone,
          birthday: firestoreProfileData.birthday,
          isVerified: fbUser.emailVerified || !!fbUser.phoneNumber,
        };
        setUser(profileData);
        setCalculatedAgeState(calculateAge(profileData.birthday));
        form.reset({
          name: profileData.name,
          email: profileData.email,
          birthday: profileData.birthday || "",
          bio: profileData.bio || "",
          phone: profileData.phone || "",
        });

        setIsLoadingOwnedEvents(true);
        try {
          const eventsRef = collection(db, "events");
          const q = query(eventsRef, where("ownerUids", "array-contains", fbUser.uid), orderBy("dateTime", "asc"));
          const querySnapshot = await getDocs(q);
          const fetchedEvents = querySnapshot.docs.map(eventDoc => {
            const data = eventDoc.data();
            return {
                id: eventDoc.id,
                ...data,
                dateTime: safeToDate(data.dateTime),
                createdAt: safeToDate(data.createdAt),
                updatedAt: safeToDate(data.updatedAt),
                imageUrl: data.imageUrl || undefined,
            } as EventType;
          });
          setOwnedEvents(fetchedEvents);
        } catch (error) {
            console.error("Error fetching owned events:", error);
            toast({ title: HEBREW_TEXT.general.error, description: "שגיאה בטעינת האירועים שבבעלותך.", variant: "destructive" });
        } finally {
            setIsLoadingOwnedEvents(false);
        }
        fetchUserStats(fbUser);

      } else {
        setUser(null);
        setFirebaseUser(null);
        setAuthProviderId(null);
        setOwnedEvents([]);
        setIsLoadingStats(false);
        router.push('/signin');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [form, router, toast, fetchUserStats]);


  useEffect(() => {
    if (user?.birthday) {
      setCalculatedAgeState(calculateAge(user.birthday));
    } else {
      setCalculatedAgeState(null);
    }
  }, [user?.birthday]);


  useEffect(() => {
    const currentTheme = localStorage.getItem("theme");
    if (currentTheme === "dark") {
      setIsDarkMode(true);
    } else {
      setIsDarkMode(false);
    }
  }, []);

  const handleThemeToggle = (checked: boolean) => {
    setIsDarkMode(checked);
    if (checked) {
      localStorage.setItem("theme", "dark");
      document.documentElement.classList.add("dark");
    } else {
      localStorage.setItem("theme", "light");
      document.documentElement.classList.remove("dark");
    }
  };
  
  const handleImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      toast({ title: "דוחס תמונה...", description: "אנא המתן." });
      try {
        const options = {
          maxSizeMB: 0.5, // Profile pics can be smaller
          maxWidthOrHeight: 800,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);
        toast({ title: "הדחיסה הושלמה", description: "התמונה מוכנה לעדכון." });

        setImageFile(compressedFile);
        const previewUrl = URL.createObjectURL(compressedFile);
        setImagePreviewUrl(previewUrl);
      } catch (error) {
        console.error("Error compressing image:", error);
        toast({ title: "שגיאה בדחיסת תמונה", description: (error instanceof Error) ? error.message : String(error), variant: "destructive" });
        setImageFile(null);
        setImagePreviewUrl(user?.profileImageUrl || null);
      }
    }
  };

  const onSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    setIsSubmitting(true);
    setIsUploadingImage(false);
    setImageUploadProgress(null);

    if (!firebaseUser) {
      toast({ title: HEBREW_TEXT.general.error, description: "משתמש לא מאומת.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    let finalImageUrl: string | undefined = user?.profileImageUrl;

    if (imageFile) {
        setIsUploadingImage(true);
        const filePath = `profile_images/${firebaseUser.uid}/${Date.now()}-${imageFile.name}`;
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
                    console.error("Profile image upload error:", error);
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

    const originalEmail = user?.email;
    const isEmailManagedExternally = authProviderId === 'google.com' || authProviderId === 'apple.com';

    try {
      await updateProfile(firebaseUser, { 
          displayName: values.name,
          photoURL: finalImageUrl,
      });
    
      const firestoreUpdateData: Partial<UserProfile> & { updatedAt: any, profileImageUrl?: string | null } = {
          name: values.name,
          bio: values.bio || "",
          phone: values.phone || "",
          birthday: values.birthday || "",
          profileImageUrl: finalImageUrl,
          updatedAt: serverTimestamp(),
      };

      if (!isEmailManagedExternally) {
          firestoreUpdateData.email = values.email || null;
      }

      const userDocRef = doc(db, "users", firebaseUser.uid);
      await setDoc(userDocRef, firestoreUpdateData, { merge: true });

      setUser(prevUser => {
        if (!prevUser) return null;
        const updatedUser = {
          ...prevUser,
          name: values.name,
          email: isEmailManagedExternally ? prevUser.email : (values.email || ""),
          birthday: values.birthday || undefined,
          bio: values.bio || undefined,
          phone: values.phone || undefined,
          profileImageUrl: finalImageUrl,
        };
        setCalculatedAgeState(calculateAge(updatedUser.birthday));
        return updatedUser;
      });
      
      form.reset({
        name: values.name,
        email: isEmailManagedExternally ? (user?.email || "") : (values.email || ""),
        birthday: values.birthday || "",
        bio: values.bio || "",
        phone: values.phone || "",
      });
      
      setImageFile(null);
      setImagePreviewUrl(null); 

      toast({
        title: HEBREW_TEXT.general.success,
        description: "הפרופיל עודכן בהצלחה!",
      });

      if (!isEmailManagedExternally && values.email && values.email !== originalEmail) {
          toast({
            title: "כתובת אימייל עודכנה בפרופיל",
            description: "שים לב: עדכון זה משפיע על פרטי הפרופיל שלך באפליקציה. אם האימייל משמש להתחברות, ייתכן ויידרשו צעדים נוספים לאימותו המלא בחשבון Firebase.",
            duration: 7000,
          });
      }

      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ title: HEBREW_TEXT.general.error, description: "שגיאה בעדכון הפרופיל.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setIsUploadingImage(false);
    }
  };

  const handleIdUpload = () => {
    toast({ title: "העלאת תעודת זהות", description: "פונקציונליות העלאת תעודה תמומש כאן." });
  };

  const handleSignOut = async () => {
    try {
      await firebaseAuthInstance.signOut();
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userName');
      toast({
        title: HEBREW_TEXT.auth.signOut,
        description: "התנתקת בהצלחה. הנך מועבר לדף הבית.",
      });
      router.push('/');
    } catch (error) {
      console.error("Error signing out: ", error);
      toast({
        title: HEBREW_TEXT.general.error,
        description: "שגיאה בהתנתקות.",
        variant: "destructive",
      });
    }
  };

  const handleEnableNotifications = async () => {
    if (!firebaseUser) {
      toast({ title: HEBREW_TEXT.general.error, description: "עליך להיות מחובר כדי לאפשר התראות.", variant: "destructive" });
      return;
    }

    const initialToast = toast({
      title: "מאפשר התראות...",
      description: "אנא אשר את בקשת ההרשאה מהדפדפן.",
      duration: 10000
    });

    const result: NotificationSetupResult = await requestNotificationPermissionAndSaveToken(firebaseUser.uid);

    initialToast.dismiss();

    switch (result.status) {
      case 'granted':
        if (result.token) {
          toast({ title: "התראות הופעלו!", description: "תקבל עדכונים חשובים כאן ובהתראות דחיפה.", variant: "default", duration: 5000 });
        } else {
          toast({ title: "שגיאה בהפעלת התראות", description: "הרשאה ניתנה אך לא הונפק טוקן ייחודי. נסה שוב או בדוק הגדרות דפדפן.", variant: "destructive", duration: 7000 });
        }
        break;
      case 'denied':
        toast({ title: "התראות נדחו", description: "לא אישרת קבלת התראות. ניתן לשנות זאת בהגדרות הדפדפן.", variant: "default", duration: 7000 });
        break;
      case 'default':
        toast({ title: "התראות לא הופעלו", description: "לא בוצעה פעולה לגבי התראות, או שהבקשה נדחתה בעבר.", variant: "default", duration: 7000 });
        break;
      case 'not-supported':
        toast({ title: "התראות לא נתמכות", description: "הדפדפן שלך או המכשיר אינם תומכים באופן מלא בהתראות דחיפה.", variant: "default", duration: 7000 });
        break;
      case 'sw-inactive':
        toast({ title: "שגיאת שירות התראות", description: "בעיה טכנית מונעת הפעלת התראות (SW). נסה לרענן את הדף.", variant: "destructive", duration: 7000 });
        break;
      case 'vapid-key-missing':
        toast({ title: "שגיאת תצורת התראות", description: "התראות אינן מוגדרות כראוי בצד השרת (VAPID).", variant: "destructive", duration: 7000 });
        break;
      case 'error':
        console.error("Notification setup error from profile page:", result.error);
        toast({ title: "שגיאה כללית בהתראות", description: "אירעה שגיאה לא צפויה בהפעלת ההתראות. נסה שוב מאוחר יותר.", variant: "destructive", duration: 7000 });
        break;
      default:
        toast({ title: "סטטוס לא ידוע", description: "התקבלה תגובה לא צפויה לגבי הגדרת התראות.", variant: "destructive", duration: 7000 });
    }
  };

  const getManagedByProviderText = () => {
    if (authProviderId === 'google.com') return "מנוהל באמצעות Google";
    if (authProviderId === 'apple.com') return "מנוהל באמצעות Apple";
    return "";
  }

  if (isLoading || !user) {
    return (
      <div className="container mx-auto px-4 py-12">
         <Card className="max-w-3xl mx-auto">
            <CardHeader className="items-center text-center">
                <Skeleton className="h-32 w-32 rounded-full mb-4" />
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-5 w-64" />
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-1">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-6 w-3/4" />
                    </div>
                ))}
                <Skeleton className="h-10 w-full mt-6" />
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-3xl mx-auto">
          <CardHeader className="items-center text-center">
            <div className="flex justify-between items-start w-full">
              <div className="flex-grow text-center">
                <div className="relative inline-block mb-4">
                  <Avatar className="h-32 w-32 border-4 border-primary shadow-md">
                    {imagePreviewUrl ? (
                      <AvatarImage src={imagePreviewUrl} alt={user.name} data-ai-hint="profile picture"/>
                    ) : user.profileImageUrl ? (
                      <AvatarImage src={user.profileImageUrl} alt={user.name} data-ai-hint="profile picture"/>
                    ) : (
                       <AvatarFallback className="text-4xl bg-muted">
                         <UserPlaceholderIcon className="h-16 w-16 text-muted-foreground" />
                       </AvatarFallback>
                    )}
                  </Avatar>
                  {isEditing && (
                    <>
                      <label
                        htmlFor="profile-image-upload"
                        className="absolute bottom-0 left-0 flex h-10 w-10 items-center justify-center rounded-full border bg-background shadow-md cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        <Camera className="h-5 w-5" />
                        <span className="sr-only">{HEBREW_TEXT.profile.uploadProfileImage}</span>
                      </label>
                      <input
                        id="profile-image-upload"
                        type="file"
                        ref={imageInputRef}
                        onChange={handleImageFileChange}
                        className="hidden"
                        accept="image/png, image/jpeg, image/webp"
                      />
                    </>
                  )}
                </div>
                 {isUploadingImage && imageUploadProgress !== null && (
                    <div className="w-full max-w-xs mx-auto mt-2">
                        <Progress value={imageUploadProgress} className="w-full h-2" />
                        <p className="text-sm text-muted-foreground text-center mt-1">
                            {imageUploadProgress < 100 ? `מעלה תמונה... ${Math.round(imageUploadProgress)}%` : "התמונה הועלתה!"}
                        </p>
                    </div>
                )}
                <CardTitle className="font-headline text-3xl">{user.name}</CardTitle>
                <CardDescription className="flex items-center justify-center">
                  {user.email}
                  {user.isVerified && (
                     <Tooltip>
                        <TooltipTrigger asChild>
                           <ShieldCheck className="mr-2 h-5 w-5 text-green-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{HEBREW_TEXT.profile.verifiedBadge}</p>
                        </TooltipContent>
                      </Tooltip>
                  )}
                </CardDescription>
              </div>
              {!isEditing && (
                <Button onClick={() => setIsEditing(true)} variant="ghost" size="icon">
                    <Edit3 className="h-5 w-5" />
                    <span className="sr-only">{HEBREW_TEXT.profile.editProfile}</span>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{HEBREW_TEXT.profile.name}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{HEBREW_TEXT.profile.email}</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="your@email.com"
                            {...field}
                            disabled={isSubmitting || authProviderId === 'google.com' || authProviderId === 'apple.com'}
                          />
                        </FormControl>
                        {(authProviderId === 'google.com' || authProviderId === 'apple.com') && (
                            <FormDescription>{getManagedByProviderText()}</FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{HEBREW_TEXT.profile.phone} ({HEBREW_TEXT.general.optional})</FormLabel>
                        <FormControl>
                          <Input type="tel" {...field} placeholder="05X-XXXXXXX"/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="birthday"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{HEBREW_TEXT.profile.birthday} ({HEBREW_TEXT.general.optional})</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value || ""} max={new Date().toISOString().split("T")[0]} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{HEBREW_TEXT.profile.bio} ({HEBREW_TEXT.general.optional})</FormLabel>
                        <FormControl>
                          <Textarea rows={4} className="resize-none" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-4">
                      <Button type="submit" className="flex-1 font-body" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {HEBREW_TEXT.profile.saveChanges}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="flex-1 font-body" disabled={isSubmitting}>
                          {HEBREW_TEXT.general.cancel}
                      </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-muted-foreground">{HEBREW_TEXT.profile.bio}</h3>
                  <p className="text-foreground/90 whitespace-pre-line">{user.bio || HEBREW_TEXT.profile.bioNotProvided}</p>
                </div>
                <Separator/>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-muted-foreground">{HEBREW_TEXT.profile.phone}</h3>
                    <p className="text-foreground/90">{user.phone || HEBREW_TEXT.profile.infoNotProvided}</p>
                  </div>
                  <div>
                     <h3 className="font-semibold text-muted-foreground flex items-center">
                        <Cake className="ml-2 h-4 w-4 text-primary/80" />
                        {HEBREW_TEXT.profile.birthday}
                    </h3>
                    <p className="text-foreground/90">
                        {user.birthday ? formatDateFns(new Date(user.birthday + "T00:00:00"), 'dd/MM/yyyy', { locale: he }) : HEBREW_TEXT.profile.infoNotProvided}
                        {calculatedAgeState !== null && ` (גיל ${calculatedAgeState})`}
                    </p>
                  </div>
                </div>

                {!user.isVerified && (
                  <Card className="bg-accent/50 p-4">
                      <CardTitle className="text-lg mb-2 flex items-center">
                          <ShieldCheck className="ml-2 h-5 w-5 text-primary"/>
                          אימות פרופיל
                      </CardTitle>
                      <CardDescription className="mb-3">
                          העלאת תעודת זהות תעזור לאמת את הפרופיל שלך ותגביר את האמון בקהילה.
                      </CardDescription>
                      <Button onClick={handleIdUpload} variant="default">
                          <UploadCloud className="ml-2 h-4 w-4"/>
                          {HEBREW_TEXT.profile.uploadIdForVerification}
                      </Button>
                  </Card>
                )}

                <Separator />

                <div>
                  <h3 className="font-headline text-xl font-semibold mb-3 flex items-center">
                    <Activity className="ml-2 h-5 w-5 text-primary" />
                    {HEBREW_TEXT.profile.statsSectionTitle}
                  </h3>
                  {isLoadingStats ? (
                    <div className="flex justify-center items-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="mr-2 text-muted-foreground">{HEBREW_TEXT.profile.loadingStats}</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      <div className="flex items-center text-foreground/90">
                        <Users className="ml-2 h-4 w-4 text-primary/80" />
                        <span>{HEBREW_TEXT.profile.eventsAttended} {eventsAttendedCount ?? 0}</span>
                      </div>
                      <div className="flex items-center text-foreground/90">
                        <CalendarDays className="ml-2 h-4 w-4 text-primary/80" />
                        <span>
                          {HEBREW_TEXT.profile.lastEventAttendedDate} {lastEventAttendedDate ? formatDateFns(lastEventAttendedDate, 'dd/MM/yyyy', { locale: he }) : HEBREW_TEXT.profile.dataNotAvailable}
                        </span>
                      </div>
                       <div className="flex items-center text-foreground/90">
                        <ThumbsUp className="ml-2 h-4 w-4 text-green-500" />
                        <span>{HEBREW_TEXT.profile.positiveRatings} {positiveRatingsCount ?? 0}</span>
                      </div>
                      <div className="flex items-center text-foreground/90">
                        <ThumbsDown className="ml-2 h-4 w-4 text-red-500" />
                        <span>{HEBREW_TEXT.profile.negativeRatings} {negativeRatingsCount ?? 0}</span>
                      </div>
                      <div className="flex items-center text-foreground/90">
                        <UserPlaceholderIcon className="ml-2 h-4 w-4 text-primary/80" />
                        <span>{HEBREW_TEXT.profile.guestsHosted} {guestsHostedCount ?? 0}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                    <h3 className="font-headline text-xl font-semibold mb-2">{HEBREW_TEXT.event.myEvents}</h3>
                    {isLoadingOwnedEvents ? (
                        <div className="space-y-3">
                            {[...Array(2)].map((_, i) => (
                                <Card key={i} className="p-3 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                                        <Skeleton className="h-16 w-20 rounded-md" />
                                        <div className="flex-1 space-y-1.5">
                                            <Skeleton className="h-5 w-3/4" />
                                            <Skeleton className="h-4 w-1/2" />
                                        </div>
                                        <Skeleton className="h-8 w-8 rounded-md" />
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : ownedEvents.length > 0 ? (
                        <div className="space-y-3">
                        {ownedEvents.map(event => (
                            <Card key={event.id} className="hover:shadow-md transition-shadow p-3">
                                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                                    <Link href={`/events/${event.id}`} className="shrink-0">
                                        <div className="relative w-20 h-16 rounded-md overflow-hidden">
                                            <Image
                                                src={event.imageUrl || `https://placehold.co/100x75.png${event.name ? `?text=${encodeURIComponent(event.name)}` : ''}`}
                                                alt={event.name || HEBREW_TEXT.event.eventNameGenericPlaceholder}
                                                layout="fill"
                                                objectFit="cover"
                                                data-ai-hint="event mini image"
                                            />
                                        </div>
                                    </Link>
                                    <div className="flex-1 min-w-0">
                                        <Link href={`/events/${event.id}`}>
                                            <CardTitle className="text-md font-body mb-1 truncate hover:underline">{event.name || HEBREW_TEXT.event.eventNameGenericPlaceholder}</CardTitle>
                                        </Link>
                                        <div className="text-xs text-muted-foreground flex items-center mb-0.5">
                                            <CalendarDays className="ml-1.5 h-3 w-3" /> {formatDateFns(event.dateTime, 'dd/MM/yy', { locale: he })}
                                        </div>
                                    </div>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                                                <Link href={`/events/manage/${event.id}`}>
                                                    <Users className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{HEBREW_TEXT.event.manageGuestsTitle}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            </Card>
                        ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground">{HEBREW_TEXT.profile.noFutureEventsOwnedSelf}</p>
                    )}
                </div>
                
                <Separator className="my-8" />

                <div>
                  <h3 className="font-headline text-xl font-semibold mb-4">{HEBREW_TEXT.profile.settings}</h3>
                  <div className="flex items-center justify-between p-4 border rounded-lg mb-4">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                       {isDarkMode ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
                       <Label htmlFor="dark-mode-switch" className="text-base">
                         {isDarkMode ? HEBREW_TEXT.profile.darkMode : HEBREW_TEXT.profile.lightMode}
                       </Label>
                    </div>
                    <Switch
                      id="dark-mode-switch"
                      checked={isDarkMode}
                      onCheckedChange={handleThemeToggle}
                      aria-label={isDarkMode ? `העבר ל${HEBREW_TEXT.profile.lightMode}` : `העבר ל${HEBREW_TEXT.profile.darkMode}`}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleEnableNotifications}
                    className="w-full justify-start p-3 text-base mb-4"
                  >
                    <BellRing className="ml-3 h-5 w-5 text-muted-foreground" />
                    אפשר התראות דחיפה
                  </Button>
                </div>

                <Separator className="my-8" />

                <div>
                  <h3 className="font-headline text-xl font-semibold mb-4">{HEBREW_TEXT.profile.legalInformationSectionTitle}</h3>
                  <div className="space-y-3">
                    <Button variant="outline" asChild className="w-full justify-start p-3 text-base">
                        <Link href="/legal/terms-of-use" className="flex items-center">
                            <Gavel className="ml-3 h-5 w-5 text-muted-foreground" />
                            {HEBREW_TEXT.profile.termsOfUseLink}
                        </Link>
                    </Button>
                    <Button variant="outline" asChild className="w-full justify-start p-3 text-base">
                        <Link href="/legal/privacy-policy" className="flex items-center">
                            <FileText className="ml-3 h-5 w-5 text-muted-foreground" />
                            {HEBREW_TEXT.profile.privacyPolicyLink}
                        </Link>
                    </Button>
                  </div>
                </div>

                <Separator className="my-8" />

                <Button
                  variant="ghost"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 font-body text-base py-3"
                  onClick={handleSignOut}
                >
                  <LogOut className="ml-2 h-5 w-5" />
                  {HEBREW_TEXT.auth.signOut}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-12 text-center">
          <div className="inline-block mb-2">
            <Image src="/app_logo.png" alt={HEBREW_TEXT.appName} width={80} height={24} className="h-auto" data-ai-hint="app logo small"/>
          </div>
          <p className="text-xs text-muted-foreground">
            נבנה באהבה ע״י דניאל הימסני וסטיבן דנישבסקי. כל הזכויות שמורות © {new Date().getFullYear()}
          </p>
        </div>

      </div>
    </TooltipProvider>
  );
}
