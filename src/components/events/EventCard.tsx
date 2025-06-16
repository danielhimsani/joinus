
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Event, FoodType, KashrutType } from "@/types";
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { CalendarDays, MapPin, Users, Tag, Utensils, XCircle, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

interface EventCardProps {
  event: Event;
  availableSpots: number;
}

const getFoodTypeLabel = (foodType: FoodType | undefined) => {
    if (!foodType) return '';
    switch (foodType) {
        case 'meat': return HEBREW_TEXT.event.meat;
        case 'dairy': return HEBREW_TEXT.event.dairy;
        case 'meatAndDairy': return HEBREW_TEXT.event.meatAndDairy;
        case 'vegetarian': return HEBREW_TEXT.event.vegetarian;
        case 'vegan': return HEBREW_TEXT.event.vegan;
        case 'kosherParve': return HEBREW_TEXT.event.kosherParve;
        default: return foodType;
    }
}

const getKashrutLabel = (kashrut: KashrutType | undefined) => {
    if (!kashrut) return '';
    switch (kashrut) {
        case 'kosher': return HEBREW_TEXT.event.kosher;
        case 'notKosher': return HEBREW_TEXT.event.notKosher;
        default: return kashrut;
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
  const imageToDisplay = event.imageUrl || "/onboarding/slide-2.png";
  
  return (
    <Card className="flex flex-col overflow-hidden transition-all hover:shadow-lg h-full">
      <Link href={`/events/${event.id}`} passHref>
        <div className="relative w-full h-48 cursor-pointer">
          <Image
            src={imageToDisplay}
            alt={event.name || HEBREW_TEXT.event.eventNameGenericPlaceholder}
            layout="fill"
            objectFit="cover"
            data-ai-hint="wedding event"
            key={imageToDisplay} // Add key to re-render if image src changes
          />
        </div>
      </Link>
      <CardHeader className="flex-grow">
        <Link href={`/events/${event.id}`} passHref>
          <CardTitle className="font-headline text-xl mb-1 cursor-pointer hover:underline">{event.name}</CardTitle>
        </Link>
        <CardDescription className="flex items-center text-sm text-muted-foreground mb-1">
          <CalendarDays className="ml-1.5 h-4 w-4 text-primary" />
          {format(new Date(event.dateTime), 'eeee, d MMMM yyyy', { locale: he })}
        </CardDescription>
        <CardDescription className="flex items-center text-sm text-muted-foreground">
          <MapPin className="ml-1.5 h-4 w-4 text-primary" />
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
        <div className="flex items-center text-muted-foreground">
            <ShieldCheck className="ml-1.5 h-4 w-4 text-primary" />
            <span>{HEBREW_TEXT.event.kashrut}: {getKashrutLabel(event.kashrut)}</span>
        </div>
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

