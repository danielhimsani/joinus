
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Event } from "@/types";
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { CalendarDays, MapPin, Users, Tag, Utensils, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

interface EventCardProps {
  event: Event;
  availableSpots: number;
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

export function EventCard({ event, availableSpots }: EventCardProps) {
  const placeholderImageSrc = `https://placehold.co/600x400.png${event.name ? `?text=${encodeURIComponent(event.name)}` : ''}`;
  
  return (
    <Card className="flex flex-col overflow-hidden transition-all hover:shadow-lg h-full">
      <div className="relative w-full h-48">
        <Image
          src={event.imageUrl || placeholderImageSrc}
          alt={event.name || HEBREW_TEXT.event.eventNameGenericPlaceholder}
          layout="fill"
          objectFit="cover"
          data-ai-hint="wedding event"
        />
      </div>
      <CardHeader className="flex-grow">
        <CardTitle className="font-headline text-xl mb-1">{event.name}</CardTitle>
        <CardDescription className="flex items-center text-sm text-muted-foreground mb-1">
          <CalendarDays className="ml-1.5 h-4 w-4" />
          {format(new Date(event.dateTime), 'eeee, d MMMM yyyy', { locale: he })}
        </CardDescription>
        <CardDescription className="flex items-center text-sm text-muted-foreground">
          <MapPin className="ml-1.5 h-4 w-4" />
          {event.locationDisplayName || event.location}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm space-y-2 flex-grow">
         <div className="flex items-center text-muted-foreground">
            <Users className="ml-1.5 h-4 w-4 text-primary" />
            <span>{HEBREW_TEXT.event.availableSpots}: {availableSpots > 0 ? availableSpots : HEBREW_TEXT.event.noSpotsAvailableShort}</span>
        </div>
        <div className="flex items-center text-muted-foreground">
            <Tag className="ml-1.5 h-4 w-4 text-primary" />
            <span>{getPriceDisplay(event)}</span>
        </div>
        <div className="flex items-center text-muted-foreground">
            <Utensils className="ml-1.5 h-4 w-4 text-primary" />
            <span>{HEBREW_TEXT.event.foodType}: {getFoodTypeLabel(event.foodType)}</span>
        </div>

        {event.owners && event.owners.length > 0 && (
          <>
            <Separator className="my-3" />
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-1.5">{HEBREW_TEXT.event.owners}:</h4>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                {event.owners.slice(0, 3).map(owner => (
                  <TooltipProvider key={owner.uid}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href={`/profile/${owner.uid}`} passHref>
                          <Avatar className="h-7 w-7 border cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                            <AvatarImage src={owner.profileImageUrl} alt={owner.name} data-ai-hint="organizer avatar" />
                            <AvatarFallback className="text-xs">{owner.name?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                          </Avatar>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{owner.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
                {event.owners.length > 3 && (
                  <div className="flex items-center justify-center h-7 w-7 rounded-full bg-muted text-xs text-muted-foreground border">
                    +{event.owners.length - 3}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter>
        {availableSpots > 0 ? (
            <Button asChild className="w-full font-body">
              <Link href={`/events/${event.id}`}>{HEBREW_TEXT.general.details}</Link>
            </Button>
        ) : (
            <Button className="w-full font-body" disabled>
                <XCircle className="ml-2 h-4 w-4" />
                {HEBREW_TEXT.event.noSpotsAvailableTitle}
            </Button>
        )}
      </CardFooter>
    </Card>
  );
}

