import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Event } from "@/types";
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { CalendarDays, MapPin, Users, Tag, Utensils } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface EventCardProps {
  event: Event;
}

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

export function EventCard({ event }: EventCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden transition-all hover:shadow-lg h-full">
      <div className="relative w-full h-48">
        <Image
          src={event.imageUrl || "https://placehold.co/600x400.png"}
          alt={event.name}
          layout="fill"
          objectFit="cover"
          data-ai-hint="wedding event"
        />
      </div>
      <CardHeader className="flex-grow">
        <CardTitle className="font-headline text-xl mb-1">{event.name}</CardTitle>
        <CardDescription className="flex items-center text-sm text-muted-foreground mb-1">
          <CalendarDays className="ml-1.5 h-4 w-4" />
          {format(new Date(event.dateTime), 'eeee, d MMMM yyyy, HH:mm', { locale: he })}
        </CardDescription>
        <CardDescription className="flex items-center text-sm text-muted-foreground">
          <MapPin className="ml-1.5 h-4 w-4" />
          {event.location}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm space-y-2 flex-grow">
         <div className="flex items-center text-muted-foreground">
            <Users className="ml-1.5 h-4 w-4 text-primary" />
            <span>{HEBREW_TEXT.event.numberOfGuests}: {event.numberOfGuests}</span>
        </div>
        <div className="flex items-center text-muted-foreground">
            <Tag className="ml-1.5 h-4 w-4 text-primary" />
            <span>{getPriceDisplay(event)}</span>
        </div>
        <div className="flex items-center text-muted-foreground">
            <Utensils className="ml-1.5 h-4 w-4 text-primary" />
            <span>{HEBREW_TEXT.event.foodType}: {getFoodTypeLabel(event.foodType)}</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full font-body">
          <Link href={`/events/${event.id}`}>{HEBREW_TEXT.general.details}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
