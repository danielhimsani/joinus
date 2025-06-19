
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import type { LeaderboardUser, Event as EventType, EventChat, UserProfile as UserProfileType } from '@/types';
import { db, auth as firebaseAuthInstance } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, doc, getDoc } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { safeToDate } from '@/lib/dateUtils';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription as ShadAlertDescriptionComp, AlertTitle as ShadAlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, Award, Users, UserCheck, Contact as UserPlaceholderIcon, Crown, Trophy, ThumbsUp as ThumbsUpIcon, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type EventTimeFilter = 'all' | 'past';
type LeaderboardType = 'attendees' | 'hosts' | 'liked';

const MAX_LEADERBOARD_USERS = 10;

export default function HallOfFamePage() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [leaderboardAttendees, setLeaderboardAttendees] = useState<LeaderboardUser[]>([]);
  const [leaderboardHosts, setLeaderboardHosts] = useState<LeaderboardUser[]>([]);
  const [leaderboardMostLiked, setLeaderboardMostLiked] = useState<LeaderboardUser[]>([]);
  const [currentUserAttendeeScore, setCurrentUserAttendeeScore] = useState<LeaderboardUser | null>(null);
  const [currentUserHostScore, setCurrentUserHostScore] = useState<LeaderboardUser | null>(null);
  const [currentUserMostLikedScore, setCurrentUserMostLikedScore] = useState<LeaderboardUser | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventTimeFilter, setEventTimeFilter] = useState<EventTimeFilter>('all');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuthInstance, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const fetchLeaderboardData = useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const eventsQuery = query(collection(db, "events"));
      const chatsQuery = query(collection(db, "eventChats"), where("status", "==", "request_approved"));
      // Fetch all positive ratings for the "Most Liked" leaderboard
      const ratingsQuery = query(collection(db, "userEventGuestRatings"), where("ratingType", "==", "positive"));


      const [eventsSnapshot, chatsSnapshot, ratingsSnapshot] = await Promise.all([
        getDocs(eventsQuery),
        getDocs(chatsQuery),
        getDocs(ratingsQuery),
      ]);

      const allEvents = eventsSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data(), dateTime: safeToDate(docSnap.data().dateTime) } as EventType));
      const allApprovedChats = chatsSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as EventChat));
      const allPositiveRatings = ratingsSnapshot.docs.map(docSnap => docSnap.data() as { guestUid: string, eventId: string, ratingType: 'positive' | 'negative' });
      
      const eventDateMap = new Map<string, Date>();
      allEvents.forEach(event => eventDateMap.set(event.id, event.dateTime));
      const now = new Date();

      const relevantChats = eventTimeFilter === 'past'
        ? allApprovedChats.filter(chat => {
            const eventDate = eventDateMap.get(chat.eventId);
            return eventDate && eventDate < now;
          })
        : allApprovedChats;

      const relevantEvents = eventTimeFilter === 'past'
        ? allEvents.filter(event => event.dateTime < now)
        : allEvents;

      const relevantPositiveRatings = eventTimeFilter === 'past'
        ? allPositiveRatings.filter(rating => {
            const eventDate = eventDateMap.get(rating.eventId);
            return eventDate && eventDate < now;
        })
        : allPositiveRatings;


      // Calculate Top Attendees & Last Event Attended
      const attendeeData: Record<string, { score: number; lastEventDate: Date | null }> = {};
      relevantChats.forEach(chat => {
        if (!attendeeData[chat.guestUid]) {
          attendeeData[chat.guestUid] = { score: 0, lastEventDate: null };
        }
        attendeeData[chat.guestUid].score += 1;
        const eventDate = eventDateMap.get(chat.eventId);
        if (eventDate && eventDate < now) { 
          if (!attendeeData[chat.guestUid].lastEventDate || eventDate > attendeeData[chat.guestUid].lastEventDate!) {
            attendeeData[chat.guestUid].lastEventDate = eventDate;
          }
        }
      });
      const sortedAttendees = Object.entries(attendeeData)
        .map(([userId, data]) => ({ userId, score: data.score, lastEventAttendedDate: data.lastEventDate }))
        .sort((a, b) => b.score - a.score || (b.lastEventAttendedDate?.getTime() || 0) - (a.lastEventAttendedDate?.getTime() || 0));

      // Calculate Most Guests Hosted
      const hostGuestCounts: Record<string, number> = {};
      relevantEvents.forEach(event => {
        const approvedGuestsForThisEvent = relevantChats.filter(chat => chat.eventId === event.id).length;
        event.ownerUids.forEach(ownerUid => {
          hostGuestCounts[ownerUid] = (hostGuestCounts[ownerUid] || 0) + approvedGuestsForThisEvent;
        });
      });
      const sortedHosts = Object.entries(hostGuestCounts)
        .map(([userId, score]) => ({ userId, score }))
        .sort((a, b) => b.score - a.score);

      // Calculate Most Liked Guests Data
      const likedGuestsCounts: Record<string, number> = {};
      relevantPositiveRatings.forEach(rating => {
          likedGuestsCounts[rating.guestUid] = (likedGuestsCounts[rating.guestUid] || 0) + 1;
      });

      const likedGuestsData = Object.entries(likedGuestsCounts)
        .map(([userId, score]) => {
            const attendeeEntry = sortedAttendees.find(a => a.userId === userId);
            return {
                userId,
                score, // This score is the thumbsUpCount
                lastEventAttendedDate: attendeeEntry?.lastEventAttendedDate || null,
            };
        })
        .sort((a, b) => b.score - a.score || (b.lastEventAttendedDate?.getTime() || 0) - (a.lastEventAttendedDate?.getTime() || 0));
      

      // Fetch user details
      const attendeeUidsToFetch = [...new Set([...sortedAttendees.slice(0, MAX_LEADERBOARD_USERS).map(u => u.userId), currentUser.uid])];
      const hostUidsToFetch = [...new Set([...sortedHosts.slice(0, MAX_LEADERBOARD_USERS).map(u => u.userId), currentUser.uid])];
      const likedUidsToFetch = [...new Set([...likedGuestsData.slice(0, MAX_LEADERBOARD_USERS).map(u => u.userId), currentUser.uid])];
      const allUidsToFetch = [...new Set([...attendeeUidsToFetch, ...hostUidsToFetch, ...likedUidsToFetch])];
      
      const userProfilesMap = new Map<string, UserProfileType>();
        if (allUidsToFetch.length > 0) {
            const MAX_IDS_PER_QUERY = 30; 
            for (let i = 0; i < allUidsToFetch.length; i += MAX_IDS_PER_QUERY) {
                const uidsChunk = allUidsToFetch.slice(i, i + MAX_IDS_PER_QUERY);
                if (uidsChunk.length > 0) {
                    const usersQuery = query(collection(db, "users"), where("firebaseUid", "in", uidsChunk));
                    const usersSnapshot = await getDocs(usersQuery);
                    usersSnapshot.forEach(userDoc => {
                        const userData = userDoc.data() as UserProfileType;
                        userProfilesMap.set(userData.firebaseUid, userData);
                    });
                }
            }
      }

      const mapToLeaderboardUser = (
        users: { userId: string; score: number; lastEventAttendedDate?: Date | null; },
        currentUserUid: string,
        type: LeaderboardType
      ): { leaderboard: LeaderboardUser[]; currentUserScore: LeaderboardUser | null } => {
        let rank = 1;
        const leaderboard: LeaderboardUser[] = [];
        let currentUserData: LeaderboardUser | null = null;
        let foundCurrentUserInTop = false;

        for (let i = 0; i < users.length; i++) {
          const userEntry = users[i];
          const profile = userProfilesMap.get(userEntry.userId);
          const name = profile?.name || `User ${userEntry.userId.substring(0, 5)}`;
          const isCurrentUser = userEntry.userId === currentUserUid;

          if (i > 0 && users[i].score < users[i-1].score) {
            rank = i + 1;
          }
          
          const leaderboardItem: LeaderboardUser = {
            userId: userEntry.userId,
            name: name,
            profileImageUrl: profile?.profileImageUrl,
            score: userEntry.score,
            rank: rank,
            isCurrentUser: isCurrentUser,
            lastEventAttendedDate: userEntry.lastEventAttendedDate,
            thumbsUpCount: type === 'liked' ? userEntry.score : undefined,
          };

          if (leaderboard.length < MAX_LEADERBOARD_USERS) {
            leaderboard.push(leaderboardItem);
            if (isCurrentUser) foundCurrentUserInTop = true;
          } else if (isCurrentUser && !foundCurrentUserInTop) {
            currentUserData = leaderboardItem;
          }
          
          if (isCurrentUser && !currentUserData) {
            currentUserData = leaderboardItem;
          }
        }
        
        if (!currentUserData) {
            const currentUserEntry = users.find(u => u.userId === currentUserUid);
            if (currentUserEntry) {
                const profile = userProfilesMap.get(currentUserEntry.userId);
                const name = profile?.name || `User ${currentUserEntry.userId.substring(0, 5)}`;
                let currentUserRank = users.findIndex(u => u.userId === currentUserUid) + 1;
                for(let i = 0; i < currentUserRank -1; i++) {
                    if (users[i].score === currentUserEntry.score) {
                        currentUserRank = i + 1; 
                        break;
                    }
                }
                currentUserData = {
                    userId: currentUserEntry.userId,
                    name: name,
                    profileImageUrl: profile?.profileImageUrl,
                    score: currentUserEntry.score,
                    rank: currentUserRank,
                    isCurrentUser: true,
                    lastEventAttendedDate: currentUserEntry.lastEventAttendedDate,
                    thumbsUpCount: type === 'liked' ? currentUserEntry.score : undefined,
                };
            } else if (type === 'liked') { 
                 const profile = userProfilesMap.get(currentUserUid);
                 if (profile) {
                    currentUserData = {
                        userId: currentUserUid,
                        name: profile.name || `User ${currentUserUid.substring(0,5)}`,
                        profileImageUrl: profile.profileImageUrl,
                        score: 0, 
                        rank: likedGuestsData.length + 1, 
                        isCurrentUser: true,
                        lastEventAttendedDate: sortedAttendees.find(a => a.userId === currentUserUid)?.lastEventAttendedDate || null,
                        thumbsUpCount: 0
                    };
                 }
            }
        }
        return { leaderboard, currentUserScore: currentUserData };
      };

      const { leaderboard: attendees, currentUserScore: currentAttendee } = mapToLeaderboardUser(sortedAttendees, currentUser.uid, 'attendees');
      const { leaderboard: hosts, currentUserScore: currentHost } = mapToLeaderboardUser(sortedHosts, currentUser.uid, 'hosts');
      const { leaderboard: liked, currentUserScore: currentLiked } = mapToLeaderboardUser(likedGuestsData, currentUser.uid, 'liked');

      setLeaderboardAttendees(attendees);
      setCurrentUserAttendeeScore(currentAttendee);
      setLeaderboardHosts(hosts);
      setCurrentUserHostScore(currentHost);
      setLeaderboardMostLiked(liked);
      setCurrentUserMostLikedScore(currentLiked);

    } catch (e) {
      console.error("Error fetching leaderboard data:", e);
      setError(HEBREW_TEXT.general.error + (e instanceof Error ? `: ${e.message}` : ''));
      toast({ title: HEBREW_TEXT.general.error, description: "Failed to load Hall of Fame data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, eventTimeFilter, toast]);

  useEffect(() => {
    if (currentUser) { // Only call if currentUser is set
      fetchLeaderboardData();
    } else {
      setIsLoading(false); // Explicitly set loading to false if no user
    }
  }, [currentUser, fetchLeaderboardData]); // fetchLeaderboardData dependency will re-run if eventTimeFilter changes

  const renderLeaderboardTable = (data: LeaderboardUser[], type: LeaderboardType) => {
    if (isLoading && data.length === 0) { 
        return (
            <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
        );
    }
    if (!isLoading && data.length === 0) {
      return <p className="text-center text-muted-foreground py-4">{HEBREW_TEXT.hallOfFame.noData}</p>;
    }
    return (
      <Table dir="rtl">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px] text-center">{HEBREW_TEXT.hallOfFame.rank}</TableHead>
            <TableHead className="text-center">{HEBREW_TEXT.hallOfFame.userName}</TableHead>
            {type === 'attendees' && <TableHead className="text-center">{HEBREW_TEXT.hallOfFame.eventsAttended}</TableHead>}
            {type === 'hosts' && <TableHead className="text-center">{HEBREW_TEXT.hallOfFame.guestsHosted}</TableHead>}
            {type === 'liked' && <TableHead className="text-center">{HEBREW_TEXT.hallOfFame.thumbsUp}</TableHead>}
            {(type === 'attendees' || type === 'liked') && <TableHead className="text-center">{HEBREW_TEXT.hallOfFame.lastEventAttended}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((user) => (
            <TableRow key={user.userId + type} className={cn(user.isCurrentUser && "bg-primary/10")}>
              <TableCell className="font-medium text-center">{user.rank || '-'}</TableCell>
              <TableCell>
                <Link href={`/profile/${user.userId}`} className="flex items-center gap-2 hover:underline justify-end">
                  {user.isCurrentUser && <UserCheck className="h-4 w-4 text-green-500 order-1" />}
                  <span className="order-2">{user.name}</span>
                  <Avatar className="h-8 w-8 border order-3">
                    {user.profileImageUrl ? (
                      <AvatarImage src={user.profileImageUrl} alt={user.name} data-ai-hint="leaderboard user"/>
                    ) : (
                      <AvatarFallback><UserPlaceholderIcon className="h-5 w-5" /></AvatarFallback>
                    )}
                  </Avatar>
                </Link>
              </TableCell>
              <TableCell className="text-center">
                {type === 'liked' ? user.thumbsUpCount : user.score}
              </TableCell>
              {(type === 'attendees' || type === 'liked') && (
                <TableCell className="text-center text-xs text-muted-foreground">
                  {user.lastEventAttendedDate ? format(user.lastEventAttendedDate, 'dd/MM/yy', { locale: he }) : '-'}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderCurrentUserScore = (userData: LeaderboardUser | null, type: LeaderboardType, title: string) => {
    if (!userData) return null;
    
    let isUserInTopList = false;
    if (type === 'attendees') isUserInTopList = leaderboardAttendees.some(u => u.userId === userData.userId);
    else if (type === 'hosts') isUserInTopList = leaderboardHosts.some(u => u.userId === userData.userId);
    else if (type === 'liked') isUserInTopList = leaderboardMostLiked.some(u => u.userId === userData.userId);

    if (isUserInTopList && userData.rank <= MAX_LEADERBOARD_USERS) return null; 

    return (
      <Card className="mt-4 bg-muted/50" dir="rtl">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-md font-medium flex items-center justify-end" dir="rtl">
            {title} - {HEBREW_TEXT.hallOfFame.yourScore}
            <Trophy className="mr-2 h-5 w-5 text-amber-500" />
          </CardTitle>
        </CardHeader>
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between flex-row-reverse">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 border">
                {userData.profileImageUrl ? (
                  <AvatarImage src={userData.profileImageUrl} alt={userData.name} />
                ) : (
                  <AvatarFallback><UserPlaceholderIcon className="h-5 w-5" /></AvatarFallback>
                )}
              </Avatar>
              <span>{userData.name}</span>
            </div>
            <div className="text-left">
              <p className="font-semibold text-lg">
                {type === 'liked' ? userData.thumbsUpCount : userData.score}{' '}
                <span className="text-xs text-muted-foreground">
                  {type === 'attendees' ? HEBREW_TEXT.hallOfFame.events : 
                   type === 'hosts' ? HEBREW_TEXT.hallOfFame.guests : 
                   HEBREW_TEXT.hallOfFame.thumbsUp.toLowerCase()}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">{HEBREW_TEXT.hallOfFame.rank}: {userData.rank || HEBREW_TEXT.hallOfFame.notRanked}</p>
              {(type === 'attendees' || type === 'liked') && userData.lastEventAttendedDate && (
                 <p className="text-xs text-muted-foreground">
                   {HEBREW_TEXT.hallOfFame.lastEventAttended}: {format(userData.lastEventAttendedDate, 'dd/MM/yy', { locale: he })}
                 </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading && !leaderboardAttendees.length && !leaderboardHosts.length && !leaderboardMostLiked.length) {
    return (
      <div className="container mx-auto px-4 py-12" dir="rtl">
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <h1 className="text-3xl md:text-4xl font-bold font-headline">{HEBREW_TEXT.hallOfFame.title}</h1>
            <Crown className="h-10 w-10 text-amber-500 mr-3" />
          </div>
          <Skeleton className="h-10 w-48" />
        </div>
        <Tabs defaultValue="attendees" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4 h-12">
            <TabsTrigger value="attendees"><Skeleton className="h-5 w-32" /></TabsTrigger>
            <TabsTrigger value="hosts"><Skeleton className="h-5 w-32" /></TabsTrigger>
            <TabsTrigger value="liked"><Skeleton className="h-5 w-32" /></TabsTrigger>
          </TabsList>
          <TabsContent value="attendees">
            <Card dir="rtl">
              <CardHeader dir="rtl" className="py-4 px-4"><CardDescription dir="rtl"><Skeleton className="h-6 w-full max-w-xs" /></CardDescription></CardHeader>
              <CardContent className="space-y-3 p-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  if (error && !isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center" dir="rtl">
        <Alert variant="destructive" className="max-w-lg mx-auto">
          <AlertCircle className="h-5 w-5" />
          <ShadAlertTitle>{HEBREW_TEXT.general.error}</ShadAlertTitle>
          <ShadAlertDescriptionComp>{error}</ShadAlertDescriptionComp>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12" dir="rtl">
      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center justify-center mb-4">
            <h1 className="text-3xl md:text-4xl font-bold font-headline">{HEBREW_TEXT.hallOfFame.title}</h1>
            <Crown className="h-10 w-10 text-amber-500 mr-3" />
        </div>
        <div className="w-full sm:w-auto min-w-[240px] max-w-xs">
          <Select value={eventTimeFilter} onValueChange={(value) => setEventTimeFilter(value as EventTimeFilter)} dir="rtl">
            <SelectTrigger className="w-full" aria-label="Filter event time frame">
              <SelectValue placeholder="בחר טווח זמן" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="all">{HEBREW_TEXT.hallOfFame.filterAllEvents}</SelectItem>
              <SelectItem value="past">{HEBREW_TEXT.hallOfFame.filterPastEvents}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="attendees" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 h-12">
          <TabsTrigger value="attendees" className="text-sm sm:text-base" dir="rtl">
            {HEBREW_TEXT.hallOfFame.topAttendees}
            <Users className="mr-2 h-5 w-5" />
          </TabsTrigger>
          <TabsTrigger value="hosts" className="text-sm sm:text-base" dir="rtl">
            {HEBREW_TEXT.hallOfFame.mostGuestsHosted}
            <UserCheck className="mr-2 h-5 w-5" />
          </TabsTrigger>
          <TabsTrigger value="liked" className="text-sm sm:text-base" dir="rtl">
            {HEBREW_TEXT.hallOfFame.mostLikedGuests}
            <ThumbsUpIcon className="mr-2 h-5 w-5" />
          </TabsTrigger>
        </TabsList>
        <TabsContent value="attendees">
          <Card dir="rtl">
            <CardHeader dir="rtl" className="py-4 px-4">
              <CardDescription dir="rtl">משתמשים שהשתתפו במספר האירועים הרב ביותר!</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {renderLeaderboardTable(leaderboardAttendees, 'attendees')}
              {renderCurrentUserScore(currentUserAttendeeScore, 'attendees', HEBREW_TEXT.hallOfFame.topAttendees)}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="hosts">
          <Card dir="rtl">
            <CardHeader dir="rtl" className="py-4 px-4">
              <CardDescription dir="rtl">משתמשים שאירחו את מספר האורחים הרב ביותר!</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {renderLeaderboardTable(leaderboardHosts, 'hosts')}
              {renderCurrentUserScore(currentUserHostScore, 'hosts', HEBREW_TEXT.hallOfFame.mostGuestsHosted)}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="liked">
          <Card dir="rtl">
            <CardHeader dir="rtl" className="py-4 px-4">
              <CardDescription dir="rtl">האורחים שקיבלו הכי הרבה דירוגים חיוביים!</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {renderLeaderboardTable(leaderboardMostLiked, 'liked')}
              {renderCurrentUserScore(currentUserMostLikedScore, 'liked', HEBREW_TEXT.hallOfFame.mostLikedGuests)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
       {isLoading && (leaderboardAttendees.length > 0 || leaderboardHosts.length > 0 || leaderboardMostLiked.length > 0) && (
          <div className="flex justify-center mt-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
       )}
    </div>
  );
}

