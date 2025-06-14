
"use client";

import type React from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { MapPin } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export interface MapLocation {
  id: string;
  lat: number;
  lng: number;
  name?: string;
  dateTime: Date;
  numberOfGuests: number;
}

interface GoogleMapComponentProps {
  center: {
    lat: number;
    lng: number;
  };
  zoom?: number;
  mapContainerStyle?: React.CSSProperties;
  eventLocations?: MapLocation[];
}

const defaultMapContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '400px',
  borderRadius: '0.5rem',
};

const libraries: ("places" | "marker")[] = ['places', 'marker'];

export function GoogleMapComponent({ 
  center, 
  zoom = 12,
  mapContainerStyle = defaultMapContainerStyle,
  eventLocations = []
}: GoogleMapComponentProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  const [selectedEvents, setSelectedEvents] = useState<MapLocation[] | null>(null);
  const [infoWindowPosition, setInfoWindowPosition] = useState<{lat: number; lng: number} | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script', 
    googleMapsApiKey: apiKey || "",
    libraries,
    language: 'iw', 
    region: 'IL', 
  });

  const handleMarkerClick = (clickedLocation: MapLocation) => {
    const eventsAtSameSpot = eventLocations.filter(
      loc => loc.lat === clickedLocation.lat && loc.lng === clickedLocation.lng
    );
    setSelectedEvents(eventsAtSameSpot.length > 0 ? eventsAtSameSpot : null);
    setInfoWindowPosition(eventsAtSameSpot.length > 0 ? { lat: clickedLocation.lat, lng: clickedLocation.lng } : null);
  };

  const handleMapClick = () => {
    setSelectedEvents(null);
    setInfoWindowPosition(null);
  };
  
  if (loadError) {
    console.error("Google Maps API load error:", loadError);
    return (
        <Alert variant="destructive">
            <MapPin className="h-5 w-5" />
            <AlertTitle>{HEBREW_TEXT.map.errorTitle}</AlertTitle>
            <AlertDescription>{HEBREW_TEXT.map.loadError}</AlertDescription>
        </Alert>
    );
  }

  if (!apiKey) {
    return (
        <Alert variant="destructive">
            <MapPin className="h-5 w-5" />
            <AlertTitle>{HEBREW_TEXT.map.errorTitle}</AlertTitle>
            <AlertDescription>{HEBREW_TEXT.map.apiKeyMissing}</AlertDescription>
        </Alert>
    );
  }

  if (!isLoaded) {
    return <Skeleton className="h-[400px] w-full rounded-lg" />;
  }

  const ringSvgString = `<svg width="40" height="40" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="18" fill="#9370DB" stroke="#6A5ACD" stroke-width="1"/><path d="M24 30c-5.52 0-10-4.48-10-10s4.48-10 10-10 10 4.48 10 10-4.48 10-10 10zm0-16c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z" fill="#ffffff"/><polygon points="24,8 20,14 28,14" fill="#B0E0E6"/><polygon points="20,14 24,20 28,14" fill="#B0E0E6"/><polygon points="24,8 22,14 24,20 26,14" fill="#87CEEB" opacity="0.6"/></svg>`;

  const eventMarkerIcon = {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(ringSvgString),
    scaledSize: new window.google.maps.Size(36, 36), 
    anchor: new window.google.maps.Point(18, 36),    
  };


  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={zoom}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      }}
      onClick={handleMapClick}
    >
      {eventLocations.map((loc) => (
        <MarkerF
          key={loc.id + '-' + loc.lat + '-' + loc.lng} 
          position={{ lat: loc.lat, lng: loc.lng }}
          onClick={() => handleMarkerClick(loc)}
          icon={eventMarkerIcon}
        />
      ))}

      {selectedEvents && infoWindowPosition && (
        <InfoWindowF
          position={infoWindowPosition}
          onCloseClick={handleMapClick} 
          options={{ 
            pixelOffset: new window.google.maps.Size(0, -40), // Adjusted for new icon size
            disableAutoPan: true 
          }} 
        >
          <div className="p-1 space-y-2 max-w-[280px] bg-background rounded-md shadow-lg">
            {selectedEvents.map(event => (
              <div key={event.id} className="border-b border-border last:border-b-0 pb-1.5 mb-1.5 last:pb-0 last:mb-0">
                <Link href={`/events/${event.id}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline text-sm block break-words">
                  {event.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(event.dateTime), 'EEEE, d MMMM HH:mm', { locale: he })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {HEBREW_TEXT.event.numberOfGuests}: {event.numberOfGuests}
                </p>
              </div>
            ))}
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>
  );
}

