
"use client";

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { Event, UserProfile as GuestProfile } from '@/types'; // Assuming UserProfile can be used for guests
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, MapPin, Users, Tag, Utensils, MessageSquare, Edit3, ThumbsUp, ThumbsDown, CheckCircle, XCircle, Clock, Info } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';


// Mock data - reuse from events page for consistency
const mockEvents: Event[] = [
  {
    id: "1",
    coupleId: "couple1", // Assume current user is 'user1' for testing owner view
    name: "החתונה של רותם ואוריה",
    numberOfGuests: 20,
    paymentOption: "fixed",
    pricePerGuest: 180,
    location: "אולמי 'קסם', ירושלים",
    dateTime: new Date(new Date().setDate(new Date().getDate() + 7)),
    description: "הצטרפו אלינו לחגיגה של אהבה באווירה קסומה ומרגשת. מוזיקה טובה, אוכל משובח והמון שמחה! האירוע יכלול הופעה חיה של אמן אורח, בר קוקטיילים עשיר ופינות ישיבה מפנקות. מצפים לראותכם!",
    ageRange: [25, 55],
    foodType: "kosherMeat",
    religionStyle: "traditional",
    imageUrl: "https://placehold.co/800x400.png?text=Event1+Large",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
   {
    id: "2",
    coupleId: "user1",
    name: "מסיבת האירוסין של נועה ואיתי",
    numberOfGuests: 15,
    paymentOption: "payWhatYouWant",
    location: "לופט 'אורבן', תל אביב",
    dateTime: new Date(new Date().setDate(new Date().getDate() + 14)), // In two weeks
    description: "מסיבת אירוסין צעירה ותוססת עם DJ, קוקטיילים ואווירה מחשמלת. בואו לחגוג איתנו!",
    ageRange: [20, 35],
    foodType: "kosherParve",
    religionStyle: "secular",
    imageUrl: "https://placehold.co/800x400.png?text=Event2+Large",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockGuests: GuestProfile[] = [
    { id: "guest1", firebaseUid: "guest1", name: "ישראל ישראלי", email: "israel@example.com", profileImageUrl: "https://placehold.co/100x100.png?text=II", isVerified: true },
    { id: "guest2", firebaseUid: "guest2", name: "שרה שרוני", email: "sarah@example.com", profileImageUrl: "https://placehold.co/100x100.png?text=SS", bio: "אוהבת לרקוד!" },
];

// Mock current user
const currentUserId = "user1"; // Change to 'couple1' to test owner view for event 1

const getFoodTypeLabel = (foodType: Event['foodType']) => {
    switch (foodType) {
        case 'kosherMeat': return HEBREW_TEXT.event.kosherMeat;
        case 'kosherDairy': return HEBREW_TEXT.event.kosherDairy;
        case 'kosherParve': return HEBREW_TEXT.event.kosherParve;
        case 'notKosher': return HEBREW_TEXT.event.notKosher;
        default: return '';
    }
}

const getPriceDisplay = (event: Event) => {
    switch (event.paymentOption) {
        case 'free': return HEBREW_TEXT.event.free;
        case 'payWhatYouWant': return HEBREW_TEXT.event.payWhatYouWant;
        case 'fixed': return `₪${event.pricePerGuest || 0} ${HEBREW_TEXT.event.pricePerGuest}`;
        default: return '';
    }
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [joinRequests, setJoinRequests] = useState<GuestProfile[]>([]); // Simplified: stores profiles of requesters
  const [approvedGuests, setApprovedGuests] = useState<GuestProfile[]>([]);

  const isOwner = event?.coupleId === currentUserId;

  useEffect(() => {
    setIsLoading(true);
    // Simulate fetching event data
    setTimeout(() => {
      const foundEvent = mockEvents.find(e => e.id === eventId);
      setEvent(foundEvent || null);
      if (foundEvent && foundEvent.coupleId === currentUserId) { // If owner, populate some mock requests
          setJoinRequests(mockGuests.slice(0,1)); // One pending
          setApprovedGuests(mockGuests.slice(1,2)); // One approved
      }
      setIsLoading(false);
    }, 1000);
  }, [eventId]);

  const handleRequestToJoin = () => {
    toast({ title: HEBREW_TEXT.general.success, description: "בקשתך להצטרף נשלחה!" });
    // Mock: Add current user to requests or update status
  };

  const handleApproveRequest = (guestId: string) => {
    toast({ title: HEBREW_TEXT.general.success, description: `בקשת האורח אושרה.` });
    setApprovedGuests(prev => [...prev, joinRequests.find(g => g.id === guestId)!]);
    setJoinRequests(prev => prev.filter(g => g.id !== guestId));
  };

  const handleRejectRequest = (guestId: string) => {
    toast({ title: HEBREW_TEXT.general.success, description: `בקשת האורח נדחתה.` });
    setJoinRequests(prev => prev.filter(g => g.id !== guestId));
  };

  const handleRateGuest = (guestId: string, rating: 'positive' | 'negative') => {
    toast({
      title: HEBREW_TEXT.general.success,
      description: `האורח דורג ${rating === 'positive' ? HEBREW_TEXT.emojis.thumbsUp : HEBREW_TEXT.emojis.thumbsDown}`,
    });
  };


  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Skeleton className="h-96 w-full rounded-lg mb-8" />
        <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-20 w-full" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold">{HEBREW_TEXT.event.noEventsFound}</h1>
        <Button onClick={() => router.push('/events')} className="mt-4">{HEBREW_TEXT.general.back} {HEBREW_TEXT.navigation.events}</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <Card>
        <div className="relative w-full h-64 md:h-96 rounded-t-lg overflow-hidden">
          <Image
            src={event.imageUrl || "https://placehold.co/800x400.png"}
            alt={event.name}
            layout="fill"
            objectFit="cover"
            data-ai-hint="wedding detail"
          />
        </div>
        <CardHeader>
          <CardTitle className="font-headline text-3xl md:text-4xl">{event.name}</CardTitle>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-muted-foreground mt-2">
            <span className="flex items-center"><CalendarDays className="ml-1.5 h-5 w-5 text-primary" /> {format(new Date(event.dateTime), 'PPPPp', { locale: he })}</span>
            <span className="flex items-center"><MapPin className="ml-1.5 h-5 w-5 text-primary" /> {event.location}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <h3 className="font-headline text-xl font-semibold mb-3">{HEBREW_TEXT.event.description}</h3>
              <p className="text-foreground/80 leading-relaxed whitespace-pre-line">{event.description}</p>

              <Separator className="my-6" />

              <h3 className="font-headline text-xl font-semibold mb-4">פרטים נוספים</h3>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start"><Users className="ml-2 h-5 w-5 text-primary flex-shrink-0 mt-0.5" /> <span><strong>{HEBREW_TEXT.event.numberOfGuests}:</strong> {event.numberOfGuests}</span></div>
                <div className="flex items-start"><Tag className="ml-2 h-5 w-5 text-primary flex-shrink-0 mt-0.5" /> <span><strong>{HEBREW_TEXT.event.paymentOptions}:</strong> {getPriceDisplay(event)}</span></div>
                <div className="flex items-start"><Utensils className="ml-2 h-5 w-5 text-primary flex-shrink-0 mt-0.5" /> <span><strong>{HEBREW_TEXT.event.foodType}:</strong> {getFoodTypeLabel(event.foodType)}</span></div>
                <div className="flex items-start"><Info className="ml-2 h-5 w-5 text-primary flex-shrink-0 mt-0.5" /> <span><strong>{HEBREW_TEXT.event.religionStyle}:</strong> {event.religionStyle}</span></div>
                <div className="flex items-start"><Clock className="ml-2 h-5 w-5 text-primary flex-shrink-0 mt-0.5" /> <span><strong>{HEBREW_TEXT.event.ageRange}:</strong> {event.ageRange[0]} - {event.ageRange[1]}</span></div>
              </div>
            </div>

            <div className="md:col-span-1 space-y-4">
              {isOwner ? (
                <Button className="w-full font-body" variant="outline" onClick={() => router.push(`/events/edit/${event.id}`)}>
                  <Edit3 className="ml-2 h-4 w-4" />
                  {HEBREW_TEXT.event.editEvent}
                </Button>
              ) : (
                <Button className="w-full font-body text-lg py-3" onClick={handleRequestToJoin}>
                  {HEBREW_TEXT.event.requestToJoin}
                </Button>
              )}
              <Button variant="outline" className="w-full font-body">
                <MessageSquare className="ml-2 h-4 w-4" />
                {HEBREW_TEXT.general.actions} נוספות (שתף, הוסף ליומן וכו')
              </Button>
            </div>
          </div>

          {isOwner && (
            <>
              <Separator className="my-8" />
              <section>
                <h3 className="font-headline text-2xl font-semibold mb-4">{HEBREW_TEXT.event.guestRequests}</h3>
                {joinRequests.length > 0 ? (
                  <div className="space-y-4">
                    {joinRequests.map(guest => (
                      <Card key={guest.id} className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center">
                          <Avatar className="ml-3 h-10 w-10">
                            <AvatarImage src={guest.profileImageUrl} alt={guest.name} data-ai-hint="guest avatar" />
                            <AvatarFallback>{guest.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{guest.name} {guest.isVerified && <Badge variant="default" className="mr-1 bg-green-500 hover:bg-green-600">מאומת</Badge>}</p>
                            <p className="text-xs text-muted-foreground">{guest.bio || "אין ביו זמין"}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2 rtl:space-x-reverse self-end sm:self-center">
                          <Button size="sm" variant="default" onClick={() => handleApproveRequest(guest.id)}><CheckCircle className="ml-1 h-4 w-4"/> {HEBREW_TEXT.event.approve}</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleRejectRequest(guest.id)}><XCircle className="ml-1 h-4 w-4"/> {HEBREW_TEXT.event.reject}</Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">{HEBREW_TEXT.event.noPendingRequests}</p>
                )}
              </section>

              <Separator className="my-8" />
              <section>
                <h3 className="font-headline text-2xl font-semibold mb-4">{HEBREW_TEXT.event.approvedGuests}</h3>
                 {approvedGuests.length > 0 ? (
                  <div className="space-y-4">
                    {approvedGuests.map(guest => (
                      <Card key={guest.id} className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center">
                          <Avatar className="ml-3 h-10 w-10">
                            <AvatarImage src={guest.profileImageUrl} alt={guest.name} data-ai-hint="guest avatar"/>
                            <AvatarFallback>{guest.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                             <p className="font-medium">{guest.name} {guest.isVerified && <Badge variant="default" className="mr-1 bg-green-500 hover:bg-green-600">מאומת</Badge>}</p>
                            <p className="text-xs text-muted-foreground">{guest.bio || "אין ביו זמין"}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2 rtl:space-x-reverse self-end sm:self-center">
                          <Button size="icon" variant="ghost" onClick={() => handleRateGuest(guest.id, 'positive')} title="דרג חיובי">
                            <ThumbsUp className="h-5 w-5 text-green-500"/>
                          </Button>
                           <Button size="icon" variant="ghost" onClick={() => handleRateGuest(guest.id, 'negative')} title="דרג שלילי">
                            <ThumbsDown className="h-5 w-5 text-red-500"/>
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">{HEBREW_TEXT.event.noApprovedGuests}</p>
                )}
                 <Button variant="outline" className="mt-4 w-full md:w-auto">
                    <MessageSquare className="ml-2 h-4 w-4" />
                    {HEBREW_TEXT.event.broadcastMessage}
                 </Button>
              </section>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
