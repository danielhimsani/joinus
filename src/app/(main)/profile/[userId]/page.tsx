
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HEBREW_TEXT } from "@/constants/hebrew-text";
import type { UserProfile, Event as EventType } from "@/types";
import { CalendarDays, MapPin, ShieldCheck, User as UserIcon, AlertCircle, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle as ShadAlertTitle } from "@/components/ui/alert"; // Renamed AlertTitle
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { db, auth as firebaseAuthInstance } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { safeToDate } from '@/lib/dateUtils';
import type { User as FirebaseUser } from "firebase/auth";


export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const userId = params.userId as string;

  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [ownedEvents, setOwnedEvents] = useState<EventType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    const unsubscribe = firebaseAuthInstance.onAuthStateChanged(user => {
        setCurrentUser(user);
        if (!user) {
            router.push('/signin'); // Redirect if not authenticated
        }
    });
    return () => unsubscribe();
  }, [router]);


  const fetchProfileAndEvents = useCallback(async () => {
    if (!userId || !currentUser) { // Ensure currentUser is also available before fetching
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch user profile
      const userDocRef = doc(db, "users", userId);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        setProfileData({
          id: userDocSnap.id,
          firebaseUid: data.firebaseUid || userId,
          name: data.name || "משתמש",
          email: data.email, // Keep for internal use if needed, but don't display publicly
          profileImageUrl: data.profileImageUrl || `https://placehold.co/150x150.png?text=${(data.name || "U").charAt(0)}`,
          bio: data.bio || "",
          isVerified: data.isVerified || false,
          // Exclude phone and birthday for public view
        } as UserProfile);

        // Fetch future events owned by this user
        const eventsRef = collection(db, "events");
        // Ensure dateTime is compared with a Timestamp for Firestore query
        const nowAsTimestamp = Timestamp.now();
        const q = query(eventsRef, where("ownerUids", "array-contains", userId), where("dateTime", ">=", nowAsTimestamp));
        const querySnapshot = await getDocs(q);
        const fetchedEvents = querySnapshot.docs.map(doc => {
          const eventData = doc.data();
          return {
            id: doc.id,
            ...eventData,
            dateTime: safeToDate(eventData.dateTime),
            // Ensure other date fields are also converted if necessary
            createdAt: eventData.createdAt ? safeToDate(eventData.createdAt) : new Date(),
            updatedAt: eventData.updatedAt ? safeToDate(eventData.updatedAt) : new Date(),
          } as EventType;
        });
        setOwnedEvents(fetchedEvents);

      } else {
        setError(HEBREW_TEXT.profile.userProfile + " " + HEBREW_TEXT.general.error.toLowerCase() + ": " + HEBREW_TEXT.event.noUsersFound.toLowerCase());
        setProfileData(null);
      }
    } catch (e) {
      console.error("Error fetching profile or events:", e);
      setError(HEBREW_TEXT.general.error + ": " + (e instanceof Error ? e.message : String(e)));
      setProfileData(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId, currentUser]);

  useEffect(() => {
    if (currentUser) { // Only fetch if current user is resolved
        fetchProfileAndEvents();
    }
  }, [fetchProfileAndEvents, currentUser]);

  if (isLoading || !currentUser) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-3xl mx-auto">
          <CardHeader className="items-center text-center">
            <Skeleton className="h-32 w-32 rounded-full mb-4" />
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-5 w-64" />
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-1">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-16 w-full" />
            </div>
            <Separator />
            <Skeleton className="h-6 w-1/3 mb-2" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Alert variant="destructive" className="max-w-lg mx-auto">
          <AlertCircle className="h-5 w-5" />
          <ShadAlertTitle className="font-headline">{HEBREW_TEXT.general.error}</ShadAlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.back()} className="mt-6">
            <ChevronLeft className="ml-1 h-4 w-4"/>
            {HEBREW_TEXT.general.back}
        </Button>
      </div>
    );
  }

  if (!profileData) {
    // This case should ideally be covered by the error state if user not found
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Alert variant="default" className="max-w-lg mx-auto">
            <UserIcon className="h-5 w-5" />
            <ShadAlertTitle className="font-headline">{HEBREW_TEXT.event.noUsersFound}</ShadAlertTitle>
            <AlertDescription>המשתמש שחיפשת לא נמצא.</AlertDescription>
        </Alert>
         <Button onClick={() => router.back()} className="mt-6">
            <ChevronLeft className="ml-1 h-4 w-4"/>
            {HEBREW_TEXT.general.back}
        </Button>
      </div>
    );
  }
  
  // If current user is viewing their own public profile, give option to go to editable profile
  const isViewingOwnProfile = currentUser?.uid === userId;


  return (
    <TooltipProvider>
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-3xl mx-auto">
          <CardHeader className="items-center text-center">
          {isViewingOwnProfile && (
            <Button asChild variant="outline" size="sm" className="absolute top-4 right-4">
                <Link href="/profile">
                    <UserIcon className="ml-2 h-4 w-4" />
                    {HEBREW_TEXT.profile.editProfile}
                </Link>
            </Button>
           )}
            <div className="relative inline-block mb-4 mt-8 sm:mt-0">
              <Avatar className="h-32 w-32 border-4 border-primary shadow-md">
                <AvatarImage src={profileData.profileImageUrl} alt={profileData.name} data-ai-hint="profile picture public"/>
                <AvatarFallback className="text-4xl">{profileData.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="font-headline text-3xl">{profileData.name}</CardTitle>
            {profileData.isVerified && (
              <CardDescription className="flex items-center justify-center text-green-600">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ShieldCheck className="mr-2 h-5 w-5" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{HEBREW_TEXT.profile.verifiedBadge}</p>
                  </TooltipContent>
                </Tooltip>
                {HEBREW_TEXT.profile.verifiedBadge}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div>
              <h3 className="font-semibold text-muted-foreground">{HEBREW_TEXT.profile.bio}</h3>
              <p className="text-foreground/90 whitespace-pre-line">
                {profileData.bio || "לא סופק ביו."}
              </p>
            </div>
            
            <Separator />

            <div>
              <h3 className="font-headline text-xl font-semibold mb-3">אירועים בבעלות {profileData.name.split(' ')[0]}</h3>
              {ownedEvents.length > 0 ? (
                <div className="space-y-3">
                  {ownedEvents.map(event => (
                    <Link href={`/events/${event.id}`} key={event.id} className="block">
                      <Card className="hover:shadow-md transition-shadow p-4">
                        <CardTitle className="text-lg font-body mb-1">{event.name || HEBREW_TEXT.event.eventNameGenericPlaceholder}</CardTitle>
                        <div className="text-sm text-muted-foreground flex items-center mb-0.5">
                          <CalendarDays className="ml-1.5 h-4 w-4" /> {format(event.dateTime, 'dd/MM/yy, HH:mm', { locale: he })}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center">
                          <MapPin className="ml-1.5 h-4 w-4" /> {event.locationDisplayName || event.location}
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">ל{profileData.name.split(' ')[0]} אין אירועים עתידייים בבעלותו כרגע.</p>
              )}
            </div>
            
            {/* Placeholder for reviews if you implement them later */}
            {/* 
            <Separator />
            <div>
              <h3 className="font-headline text-xl font-semibold mb-2">{HEBREW_TEXT.profile.reviews}</h3>
              <p className="text-muted-foreground">ביקורות על {profileData.name.split(' ')[0]} יופיעו כאן.</p>
            </div>
            */}
            
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

    