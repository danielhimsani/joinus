
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle as ShadAlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, Award, Users, UserCheck, Contact as UserPlaceholderIcon, Crown, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type EventTimeFilter = 'all' | 'past';

const MAX_LEADERBOARD_USERS = 10;

export default function HallOfFamePage() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [leaderboardAttendees, setLeaderboardAttendees] = useState<LeaderboardUser[]>([]);
  const [leaderboardHosts, setLeaderboardHosts] = useState<LeaderboardUser[]>([]);
  const [currentUserAttendeeScore, setCurrentUserAttendeeScore] = useState<LeaderboardUser | null>(null);
  const [currentUserHostScore, setCurrentUserHostScore] = useState<LeaderboardUser | null>(null);
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
      // 1. Fetch all events and approved chats
      const eventsQuery = query(collection(db, "events"));
      const chatsQuery = query(collection(db, "eventChats"), where("status", "==", "request_approved"));

      const [eventsSnapshot, chatsSnapshot] = await Promise.all([
        getDocs(eventsQuery),
        getDocs(chatsQuery),
      ]);

      const allEvents = eventsSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data(), dateTime: safeToDate(docSnap.data().dateTime) } as EventType));
      const allApprovedChats = chatsSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as EventChat));

      // Create a map of eventId to its dateTime for quick lookup
      const eventDateMap = new Map<string, Date>();
      allEvents.forEach(event => eventDateMap.set(event.id, event.dateTime));

      const now = new Date();

      // Filter chats/events based on time filter
      const relevantChats = eventTimeFilter === 'past'
        ? allApprovedChats.filter(chat => {
            const eventDate = eventDateMap.get(chat.eventId);
            return eventDate && eventDate < now;
          })
        : allApprovedChats;

      const relevantEvents = eventTimeFilter === 'past'
        ? allEvents.filter(event => event.dateTime < now)
        : allEvents;

      // 2. Calculate Top Attendees
      const attendeeCounts: Record<string, number> = {};
      relevantChats.forEach(chat => {
        attendeeCounts[chat.guestUid] = (attendeeCounts[chat.guestUid] || 0) + 1;
      });

      const sortedAttendees = Object.entries(attendeeCounts)
        .map(([userId, score]) => ({ userId, score }))
        .sort((a, b) => b.score - a.score);

      // 3. Calculate Most Guests Hosted
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

      // 4. Fetch user details for top N + current user
      const attendeeUidsToFetch = [...new Set([...sortedAttendees.slice(0, MAX_LEADERBOARD_USERS).map(u => u.userId), currentUser.uid])];
      const hostUidsToFetch = [...new Set([...sortedHosts.slice(0, MAX_LEADERBOARD_USERS).map(u => u.userId), currentUser.uid])];
      const allUidsToFetch = [...new Set([...attendeeUidsToFetch, ...hostUidsToFetch])];
      
      const userProfilesMap = new Map<string, UserProfileType>();
      if (allUidsToFetch.length > 0) {
        const MAX_IDS_PER_QUERY = 30; // Firestore 'in' query limit
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
        users: { userId: string; score: number }[],
        currentUserUid: string,
        isHostList: boolean
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
          };

          if (leaderboard.length < MAX_LEADERBOARD_USERS) {
            leaderboard.push(leaderboardItem);
            if (isCurrentUser) foundCurrentUserInTop = true;
          } else if (isCurrentUser && !foundCurrentUserInTop) {
            // Add current user if they are not in top N and we haven't added them yet
            currentUserData = leaderboardItem; // Store separately if not in top N
          }
          
          if (isCurrentUser && !currentUserData) { // If current user is in top N, capture their data
            currentUserData = leaderboardItem;
          }
        }
        
        // If current user was not in top N and not processed, and has a score
        if (!foundCurrentUserInTop && users.find(u => u.userId === currentUserUid)) {
            const currentUserEntry = users.find(u => u.userId === currentUserUid);
            if (currentUserEntry) {
                const profile = userProfilesMap.get(currentUserEntry.userId);
                const name = profile?.name || `User ${currentUserEntry.userId.substring(0, 5)}`;
                // Find rank for current user if not in top N
                let currentUserRank = users.findIndex(u => u.userId === currentUserUid) + 1;
                // Adjust rank for ties
                for(let i=0; i < currentUserRank -1; i++) {
                    if (users[i].score === currentUserEntry.score) {
                        currentUserRank = i + 1; // Assign same rank as first user with this score
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
                };
            }
        }

        // Ensure current user data is correctly set if they have a score, even if not in top
        if (!currentUserData && attendeeCounts[currentUserUid] !== undefined && !isHostList) {
             const profile = userProfilesMap.get(currentUserUid);
             currentUserData = {
                 userId: currentUserUid,
                 name: profile?.name || `User ${currentUserUid.substring(0,5)}`,
                 profileImageUrl: profile?.profileImageUrl,
                 score: attendeeCounts[currentUserUid],
                 rank: sortedAttendees.findIndex(u => u.userId === currentUserUid) +1,
                 isCurrentUser: true
             };
        }
        if (!currentUserData && hostGuestCounts[currentUserUid] !== undefined && isHostList) {
            const profile = userProfilesMap.get(currentUserUid);
             currentUserData = {
                 userId: currentUserUid,
                 name: profile?.name || `User ${currentUserUid.substring(0,5)}`,
                 profileImageUrl: profile?.profileImageUrl,
                 score: hostGuestCounts[currentUserUid],
                 rank: sortedHosts.findIndex(u => u.userId === currentUserUid) +1,
                 isCurrentUser: true
             };
        }


        return { leaderboard, currentUserScore: currentUserData };
      };

      const { leaderboard: attendees, currentUserScore: currentAttendee } = mapToLeaderboardUser(sortedAttendees, currentUser.uid, false);
      const { leaderboard: hosts, currentUserScore: currentHost } = mapToLeaderboardUser(sortedHosts, currentUser.uid, true);

      setLeaderboardAttendees(attendees);
      setCurrentUserAttendeeScore(currentAttendee);
      setLeaderboardHosts(hosts);
      setCurrentUserHostScore(currentHost);

    } catch (e) {
      console.error("Error fetching leaderboard data:", e);
      setError(HEBREW_TEXT.general.error + (e instanceof Error ? `: ${e.message}` : ''));
      toast({ title: HEBREW_TEXT.general.error, description: "Failed to load Hall of Fame data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, eventTimeFilter, toast]);

  useEffect(() => {
    fetchLeaderboardData();
  }, [fetchLeaderboardData]);

  const renderLeaderboardTable = (data: LeaderboardUser[], scoreType: 'events' | 'guests') => {
    if (data.length === 0) {
      return <p className="text-center text-muted-foreground py-4">{HEBREW_TEXT.hallOfFame.noData}</p>;
    }
    return (
      <Table dir="rtl">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px] text-center">{HEBREW_TEXT.hallOfFame.rank}</TableHead>
            <TableHead className="text-center">{HEBREW_TEXT.hallOfFame.userName}</TableHead>
            <TableHead className="text-center">{scoreType === 'events' ? HEBREW_TEXT.hallOfFame.eventsAttended : HEBREW_TEXT.hallOfFame.guestsHosted}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((user) => (
            <TableRow key={user.userId} className={cn(user.isCurrentUser && "bg-primary/10")}>
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
              <TableCell className="text-center">{user.score}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderCurrentUserScore = (userData: LeaderboardUser | null, scoreType: 'events' | 'guests', title: string) => {
    if (!userData || leaderboardAttendees.find(u => u.userId === userData.userId && scoreType === 'events') || leaderboardHosts.find(u => u.userId === userData.userId && scoreType === 'guests')) {
      // Don't render if user is in top list or no data
      return null;
    }
    return (
      <Card className="mt-4 bg-muted/50" dir="rtl">
        <CardHeader>
          <CardTitle className="text-md font-medium flex items-center justify-end">
            {title} - {HEBREW_TEXT.hallOfFame.yourScore}
            <Trophy className="mr-2 h-5 w-5 text-amber-500" />
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              <p className="font-semibold text-lg">{userData.score} <span className="text-xs text-muted-foreground">{scoreType === 'events' ? HEBREW_TEXT.hallOfFame.events : HEBREW_TEXT.hallOfFame.guests}</span></p>
              <p className="text-xs text-muted-foreground">{HEBREW_TEXT.hallOfFame.rank}: {userData.rank || HEBREW_TEXT.hallOfFame.notRanked}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading && !leaderboardAttendees.length && !leaderboardHosts.length) {
    return (
      <div className="container mx-auto px-4 py-12" dir="rtl">
        <div className="flex justify-center items-center mb-6">
          <h1 className="text-3xl font-bold font-headline">{HEBREW_TEXT.hallOfFame.title}</h1>
          <Award className="h-10 w-10 text-primary ml-3" />
        </div>
        <Skeleton className="h-10 w-48 mb-6 mx-auto" />
        <Tabs defaultValue="attendees" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="attendees"><Skeleton className="h-5 w-32" /></TabsTrigger>
            <TabsTrigger value="hosts"><Skeleton className="h-5 w-32" /></TabsTrigger>
          </TabsList>
          <TabsContent value="attendees">
            <Card>
              <CardHeader className="text-right"><CardTitle><Skeleton className="h-6 w-40" /></CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 text-center" dir="rtl">
        <Alert variant="destructive" className="max-w-lg mx-auto">
          <AlertCircle className="h-5 w-5" />
          <ShadAlertTitle>{HEBREW_TEXT.general.error}</ShadAlertTitle>
          <AlertDescription>{error}</AlertDescription>
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
        <TabsList className="grid w-full grid-cols-2 mb-6 h-12">
          <TabsTrigger value="attendees" className="text-sm sm:text-base">
            {HEBREW_TEXT.hallOfFame.topAttendees}
            <Users className="mr-2 h-5 w-5" />
          </TabsTrigger>
          <TabsTrigger value="hosts" className="text-sm sm:text-base">
            {HEBREW_TEXT.hallOfFame.mostGuestsHosted}
            <UserCheck className="mr-2 h-5 w-5" />
          </TabsTrigger>
        </TabsList>
        <TabsContent value="attendees">
          <Card>
            <CardHeader className="text-right">
              <CardTitle className="font-headline text-xl">{HEBREW_TEXT.hallOfFame.topAttendees}</CardTitle>
              <CardDescription>משתמשים שהשתתפו במספר האירועים הרב ביותר דרך האפליקציה.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-40 w-full" /> : renderLeaderboardTable(leaderboardAttendees, 'events')}
              {renderCurrentUserScore(currentUserAttendeeScore, 'events', HEBREW_TEXT.hallOfFame.topAttendees)}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="hosts">
          <Card>
            <CardHeader className="text-right">
              <CardTitle className="font-headline text-xl">{HEBREW_TEXT.hallOfFame.mostGuestsHosted}</CardTitle>
              <CardDescription>משתמשים שאירחו את מספר האורחים הרב ביותר דרך האירועים שלהם.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-40 w-full" /> : renderLeaderboardTable(leaderboardHosts, 'guests')}
              {renderCurrentUserScore(currentUserHostScore, 'guests', HEBREW_TEXT.hallOfFame.mostGuestsHosted)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
       {isLoading && (
          <div className="flex justify-center mt-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
       )}
    </div>
  );
}

