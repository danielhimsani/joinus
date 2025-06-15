
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import type { UserProfile, Event as EventType } from "@/types"; 
import { Camera, Edit3, ShieldCheck, UploadCloud, Loader2, LogOut, Moon, Sun, CalendarDays, MapPin, Cake } from "lucide-react"; 
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { onAuthStateChanged, type User as FirebaseUser, updateProfile } from "firebase/auth";
import { auth as firebaseAuthInstance, db } from "@/lib/firebase"; 
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore"; 
import { format as formatDate } from 'date-fns';
import { he } from 'date-fns/locale';
import { safeToDate } from '@/lib/dateUtils';

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "שם חייב להכיל לפחות 2 תווים." }),
  email: z.string().email({ message: "אימייל לא תקין." }).optional(),
  birthday: z.string().optional(),
  bio: z.string().max(300, { message: "ביו יכול להכיל עד 300 תווים."}).optional(),
  phone: z.string().refine(val => val === '' || /^0\d([\d]{0,1})([-]{0,1})\d{7}$/.test(val), { 
    message: "מספר טלפון לא תקין. אם הוזן, חייב להיות בפורמט ישראלי תקין."
  }).optional(),
});


const calculateAge = (birthDateString?: string): number | null => {
  if (!birthDateString) return null;
  const birthDate = new Date(birthDateString);
  if (isNaN(birthDate.getTime())) return null; 
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age < 0 ? null : age;
};


export default function ProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [ownedEvents, setOwnedEvents] = useState<EventType[]>([]);
  const [isLoadingOwnedEvents, setIsLoadingOwnedEvents] = useState(false);
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);


  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {},
  });
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuthInstance, async (fbUser) => {
      setIsLoading(true); 
      if (fbUser) {
        setFirebaseUser(fbUser);
        // Placeholder for fetching extended profile data (bio, phone, birthday)
        // In a real app, you'd fetch this from Firestore using fbUser.uid
        const extendedProfileData = { bio: "", phone: "", birthday: "" }; // Simulate fetching
        // Example: const userDoc = await getDoc(doc(db, "users", fbUser.uid));
        // if (userDoc.exists()) { extendedProfileData = userDoc.data() as any; }


        const profileData: UserProfile = {
          id: fbUser.uid, 
          firebaseUid: fbUser.uid,
          name: fbUser.displayName || "משתמש",
          email: fbUser.email || "לא סופק אימייל",
          profileImageUrl: fbUser.photoURL || "https://placehold.co/150x150.png",
          bio: extendedProfileData.bio, 
          phone: extendedProfileData.phone, 
          birthday: extendedProfileData.birthday, 
          isVerified: fbUser.emailVerified,
        };
        setUser(profileData);
        setCalculatedAge(calculateAge(profileData.birthday));
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
          const q = query(eventsRef, where("ownerUids", "array-contains", fbUser.uid), where("dateTime", ">=", Timestamp.now()));
          const querySnapshot = await getDocs(q);
          const fetchedEvents = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                dateTime: safeToDate(data.dateTime),
                createdAt: safeToDate(data.createdAt),
                updatedAt: safeToDate(data.updatedAt),
            } as EventType;
          });
          setOwnedEvents(fetchedEvents);
        } catch (error) {
            console.error("Error fetching owned events:", error);
            toast({ title: HEBREW_TEXT.general.error, description: "שגיאה בטעינת האירועים שבבעלותך.", variant: "destructive" });
        } finally {
            setIsLoadingOwnedEvents(false);
        }

      } else {
        setUser(null);
        setFirebaseUser(null);
        setOwnedEvents([]);
        router.push('/signin'); 
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [form, router, toast]); // Removed user?.bio etc. as it might cause re-fetches. Fetch once.

  useEffect(() => {
    if (user?.birthday) {
      setCalculatedAge(calculateAge(user.birthday));
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

  const onSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    setIsSubmitting(true);
    if (!firebaseUser) {
      toast({ title: HEBREW_TEXT.general.error, description: "משתמש לא מאומת.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    try {
      if (values.name !== firebaseUser.displayName) {
        await updateProfile(firebaseUser, { displayName: values.name });
      }
      
      // Here you would typically update the user document in Firestore
      // For example: await setDoc(doc(db, "users", firebaseUser.uid), { bio: values.bio, phone: values.phone, birthday: values.birthday }, { merge: true });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate Firestore update
      
      setUser(prevUser => prevUser ? { 
          ...prevUser, 
          name: values.name,
          birthday: values.birthday,
          bio: values.bio,
          phone: values.phone,
      } : null);
      form.reset(values); 

      toast({
        title: HEBREW_TEXT.general.success,
        description: "הפרופיל עודכן בהצלחה!",
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ title: HEBREW_TEXT.general.error, description: "שגיאה בעדכון הפרופיל.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
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
                    <AvatarImage src={user.profileImageUrl} alt={user.name} data-ai-hint="profile picture"/>
                    <AvatarFallback className="text-4xl">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {isEditing && (
                      <Button variant="outline" size="icon" className="absolute bottom-0 left-0 bg-background rounded-full">
                          <Camera className="h-5 w-5"/>
                          <span className="sr-only">{HEBREW_TEXT.profile.uploadProfileImage}</span>
                      </Button>
                  )}
                </div>
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
                          <Input disabled {...field} />
                        </FormControl>
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
                          <Input type="date" {...field} />
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
                        {user.birthday ? formatDate(new Date(user.birthday), 'dd/MM/yyyy', { locale: he }) : HEBREW_TEXT.profile.infoNotProvided}
                    </p>
                  </div>
                </div>
                
                <Separator/>
                
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

                <div className="mt-6">
                    <h3 className="font-headline text-xl font-semibold mb-2">{HEBREW_TEXT.event.myEvents}</h3>
                    {isLoadingOwnedEvents ? (
                        <div className="space-y-3">
                            <Skeleton className="h-20 w-full rounded-lg" />
                            <Skeleton className="h-20 w-full rounded-lg" />
                        </div>
                    ) : ownedEvents.length > 0 ? (
                        <div className="space-y-3">
                        {ownedEvents.map(event => (
                            <Link href={`/events/${event.id}`} key={event.id} className="block">
                                <Card className="hover:shadow-md transition-shadow p-4">
                                    <CardTitle className="text-lg font-body mb-1">{event.name}</CardTitle>
                                    <div className="text-sm text-muted-foreground flex items-center mb-0.5">
                                        <CalendarDays className="ml-1.5 h-4 w-4" /> {formatDate(event.dateTime, 'dd/MM/yy, HH:mm', { locale: he })}
                                    </div>
                                    <div className="text-sm text-muted-foreground flex items-center">
                                        <MapPin className="ml-1.5 h-4 w-4" /> {event.locationDisplayName || event.location}
                                    </div>
                                </Card>
                            </Link>
                        ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground">{HEBREW_TEXT.profile.noFutureEventsOwned.replace('{name}', 'לך')}</p>
                    )}
                </div>


                <div className="mt-6">
                  <h3 className="font-headline text-xl font-semibold mb-2">{HEBREW_TEXT.profile.pastEventsAttended}</h3>
                  <p className="text-muted-foreground">רשימת אירועים תופיע כאן.</p>
                </div>
                <div className="mt-6">
                  <h3 className="font-headline text-xl font-semibold mb-2">{HEBREW_TEXT.profile.reviews}</h3>
                  <p className="text-muted-foreground">ביקורות ממשתמשים אחרים יופיעו כאן.</p>
                </div>

                <Separator className="my-8" />

                <div>
                  <h3 className="font-headline text-xl font-semibold mb-4">{HEBREW_TEXT.profile.settings}</h3>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
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
      </div>
    </TooltipProvider>
  );
}

