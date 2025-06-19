
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
import type { UserProfile, Event as EventType, EventChat } from "@/types"; // Added EventChat
import { CalendarDays, MapPin, ShieldCheck, User as UserIconLucide, AlertCircle, ChevronRight, Cake, Contact as UserPlaceholderIcon, Users, ThumbsUp, ThumbsDown, Loader2, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle as ShadAlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { db, auth as firebaseAuthInstance } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, Timestamp, orderBy } from "firebase/firestore";
import { format as formatDateFns } from 'date-fns';
import { he } from 'date-fns/locale';
import { safeToDate } from '@/lib/dateUtils';
import type { User as FirebaseUser } from "firebase/auth";

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
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);

  // New state for statistics
  const [eventsAttendedCount, setEventsAttendedCount] = useState<number | null>(null);
  const [lastEventAttendedDate, setLastEventAttendedDate] = useState<Date | null>(null);
  const [guestsHostedCount, setGuestsHostedCount] = useState<number | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);


  useEffect(() => {
    const unsubscribe = firebaseAuthInstance.onAuthStateChanged(user => {
        setCurrentUser(user);
        if (!user) {
            router.push('/signin');
        }
    });
    return () => unsubscribe();
  }, [router]);


  const fetchProfileAndEvents = useCallback(async () => {
    if (!userId || !currentUser) {
      setIsLoading(false);
      setIsLoadingStats(false);
      return;
    }

    setIsLoading(true);
    setIsLoadingStats(true);
    setError(null);

    try {
      // Fetch User Profile
      const userDocRef = doc(db, "users", userId);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        const userProfile: UserProfile = {
          id: userDocSnap.id,
          firebaseUid: data.firebaseUid || userId,
          name: data.name || "משתמש",
          email: data.email,
          profileImageUrl: data.profileImageUrl,
          bio: data.bio || "",
          birthday: data.birthday,
          isVerified: data.isVerified || false,
        };
        setProfileData(userProfile);
        setCalculatedAge(calculateAge(userProfile.birthday));

        // Fetch Owned Future Events
        const eventsRef = collection(db, "events");
        const nowAsTimestamp = Timestamp.now();
        const ownedEventsQuery = query(eventsRef, where("ownerUids", "array-contains", userId), where("dateTime", ">=", nowAsTimestamp), orderBy("dateTime", "asc"));
        const ownedEventsSnapshot = await getDocs(ownedEventsQuery);
        const fetchedOwnedEvents = ownedEventsSnapshot.docs.map(eventDoc => {
          const eventData = eventDoc.data();
          return {
            id: eventDoc.id,
            ...eventData,
            dateTime: safeToDate(eventData.dateTime),
            createdAt: eventData.createdAt ? safeToDate(eventData.createdAt) : new Date(),
            updatedAt: eventData.updatedAt ? safeToDate(eventData.updatedAt) : new Date(),
          } as EventType;
        });
        setOwnedEvents(fetchedOwnedEvents);

        // Fetch Events Attended Statistics
        const attendedChatsQuery = query(
          collection(db, "eventChats"),
          where("guestUid", "==", userId),
          where("status", "==", "request_approved")
        );
        const attendedChatsSnapshot = await getDocs(attendedChatsQuery);
        setEventsAttendedCount(attendedChatsSnapshot.size);

        let latestAttendedDate: Date | null = null;
        if (attendedChatsSnapshot.size > 0) {
          const eventPromises = attendedChatsSnapshot.docs.map(chatDoc => {
            const eventId = (chatDoc.data() as EventChat).eventId;
            return getDoc(doc(db, "events", eventId));
          });
          const eventDocs = await Promise.all(eventPromises);
          eventDocs.forEach(eventDoc => {
            if (eventDoc.exists()) {
              const eventDate = safeToDate(eventDoc.data()?.dateTime);
              if (eventDate < new Date() && (!latestAttendedDate || eventDate > latestAttendedDate)) {
                latestAttendedDate = eventDate;
              }
            }
          });
        }
        setLastEventAttendedDate(latestAttendedDate);

        // Fetch Guests Hosted Statistics
        const hostedEventsQuery = query(eventsRef, where("ownerUids", "array-contains", userId));
        const hostedEventsSnapshot = await getDocs(hostedEventsQuery);
        let totalHosted = 0;
        if (!hostedEventsSnapshot.empty) {
          const guestCountPromises = hostedEventsSnapshot.docs.map(async (eventDoc) => {
            const approvedGuestsQuery = query(
              collection(db, "eventChats"),
              where("eventId", "==", eventDoc.id),
              where("status", "==", "request_approved")
            );
            const approvedGuestsSnapshot = await getDocs(approvedGuestsQuery);
            return approvedGuestsSnapshot.size;
          });
          const guestCounts = await Promise.all(guestCountPromises);
          totalHosted = guestCounts.reduce((sum, count) => sum + count, 0);
        }
        setGuestsHostedCount(totalHosted);

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
      setIsLoadingStats(false);
    }
  }, [userId, currentUser]);

  useEffect(() => {
    if (currentUser) {
        fetchProfileAndEvents();
    }
  }, [fetchProfileAndEvents, currentUser]);


  if (isLoading || !currentUser) { // Keep loading if isLoading is true OR currentUser is not yet set
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
            <ChevronRight className="ml-1 h-4 w-4"/>
            {HEBREW_TEXT.general.back}
        </Button>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Alert variant="default" className="max-w-lg mx-auto">
            <UserIconLucide className="h-5 w-5" />
            <ShadAlertTitle className="font-headline">{HEBREW_TEXT.event.noUsersFound}</ShadAlertTitle>
            <AlertDescription>המשתמש שחיפשת לא נמצא.</AlertDescription>
        </Alert>
         <Button onClick={() => router.back()} className="mt-6">
            <ChevronRight className="ml-1 h-4 w-4"/>
            {HEBREW_TEXT.general.back}
        </Button>
      </div>
    );
  }

  const isViewingOwnProfile = currentUser?.uid === userId;

  return (
    <TooltipProvider>
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-3xl mx-auto">
          <CardHeader className="items-center text-center">
          {isViewingOwnProfile && (
            <Button asChild variant="outline" size="sm" className="absolute top-4 right-4">
                <Link href="/profile">
                    <UserIconLucide className="ml-2 h-4 w-4" />
                    {HEBREW_TEXT.profile.editProfile}
                </Link>
            </Button>
           )}
            <div className="relative inline-block mb-4 mt-8 sm:mt-0">
              <Avatar className="h-32 w-32 border-4 border-primary shadow-md">
                {profileData.profileImageUrl ? (
                  <AvatarImage src={profileData.profileImageUrl} alt={profileData.name} data-ai-hint="profile picture public"/>
                ) : (
                  <AvatarFallback className="text-4xl bg-muted">
                    <UserPlaceholderIcon className="h-16 w-16 text-muted-foreground" />
                  </AvatarFallback>
                )}
              </Avatar>
            </div>
            <CardTitle className="font-headline text-3xl">{profileData.name}</CardTitle>
            <div className="flex items-center justify-center space-x-3 rtl:space-x-reverse mt-1">
                {profileData.isVerified && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <CardDescription className="flex items-center text-green-600 cursor-default">
                            <ShieldCheck className="mr-2 h-5 w-5" />
                            {HEBREW_TEXT.profile.verifiedBadge}
                        </CardDescription>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{HEBREW_TEXT.profile.verifiedBadge}</p>
                    </TooltipContent>
                </Tooltip>
                )}
                 {calculatedAge !== null && (
                    <>
                    {profileData.isVerified && <Separator orientation="vertical" className="h-5 mx-1" />}
                    <CardDescription className="flex items-center text-muted-foreground">
                        <Cake className="mr-2 h-5 w-5 text-primary/80" />
                        {HEBREW_TEXT.profile.age}: {calculatedAge} {HEBREW_TEXT.profile.yearsOldSuffix}
                    </CardDescription>
                    </>
                )}
                {calculatedAge === null && !profileData.isVerified && (
                     <CardDescription className="text-muted-foreground italic">
                        {HEBREW_TEXT.profile.ageNotProvided}
                    </CardDescription>
                )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div>
              <h3 className="font-semibold text-muted-foreground">{HEBREW_TEXT.profile.bio}</h3>
              <p className="text-foreground/90 whitespace-pre-line">
                {profileData.bio || HEBREW_TEXT.profile.bioNotProvided}
              </p>
            </div>

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
                    <span>{HEBREW_TEXT.profile.eventsAttended} {eventsAttendedCount ?? HEBREW_TEXT.profile.dataNotAvailable}</span>
                  </div>
                  <div className="flex items-center text-foreground/90">
                    <CalendarDays className="ml-2 h-4 w-4 text-primary/80" />
                    <span>
                      {HEBREW_TEXT.profile.lastEventAttendedDate} {lastEventAttendedDate ? formatDateFns(lastEventAttendedDate, 'dd/MM/yyyy', { locale: he }) : HEBREW_TEXT.profile.dataNotAvailable}
                    </span>
                  </div>
                  <div className="flex items-center text-foreground/90">
                    <UserIconLucide className="ml-2 h-4 w-4 text-primary/80" /> {/* Placeholder icon */}
                    <span>{HEBREW_TEXT.profile.guestsHosted} {guestsHostedCount ?? HEBREW_TEXT.profile.dataNotAvailable}</span>
                  </div>
                  <div className="flex items-center text-foreground/90">
                    <ThumbsUp className="ml-2 h-4 w-4 text-green-500" />
                    <span>{HEBREW_TEXT.profile.positiveRatings} {HEBREW_TEXT.profile.dataSoon}</span>
                  </div>
                  <div className="flex items-center text-foreground/90">
                    <ThumbsDown className="ml-2 h-4 w-4 text-red-500" />
                    <span>{HEBREW_TEXT.profile.negativeRatings} {HEBREW_TEXT.profile.dataSoon}</span>
                  </div>
                </div>
              )}
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
                          <CalendarDays className="ml-1.5 h-4 w-4" /> {formatDateFns(event.dateTime, 'dd/MM/yy, HH:mm', { locale: he })}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center">
                          <MapPin className="ml-1.5 h-4 w-4" /> {event.locationDisplayName || event.location}
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">{HEBREW_TEXT.profile.noFutureEventsOwned.replace('{name}', profileData.name.split(' ')[0])}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
